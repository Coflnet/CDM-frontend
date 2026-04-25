<script setup lang="ts">
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import { invoiceApi } from '../../api'
import type { Invoice } from '../../api'
import { useBodyLock } from '../../composables/useBodyLock'
useBodyLock()

const props = defineProps<{ invoices: Invoice[] }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'applied'): void }>()

interface ParsedRow {
  invoiceId: string | null
  bookingId: string | null
  weightKg: number
  pricePerKg: number
  resolvedInvoiceId: string | null
  error: string | null
}

const dragging = ref(false)
const fileName = ref('')
const rows = ref<ParsedRow[]>([])
const parseError = ref('')
const applying = ref(false)
const applied = ref(false)

function resolveInvoiceId(row: { invoiceId?: string; bookingId?: string }): string | null {
  if (row.invoiceId) {
    const match = props.invoices.find(i => i.invoiceId === row.invoiceId)
    return match?.invoiceId ?? null
  }
  if (row.bookingId) {
    const match = props.invoices.find(i => i.bookingId === row.bookingId)
    return match?.invoiceId ?? null
  }
  return null
}

function parseSheet(workbook: XLSX.WorkBook) {
  parseError.value = ''
  rows.value = []

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  if (raw.length === 0) {
    parseError.value = 'Die Datei enthält keine Daten.'
    return
  }

  const parsed: ParsedRow[] = []
  for (const r of raw) {
    // Normalize keys to lowercase, trim whitespace
    const norm: Record<string, string> = {}
    for (const [k, v] of Object.entries(r)) {
      norm[k.toLowerCase().trim().replace(/\s+/g, '_')] = String(v).trim()
    }

    const invoiceId = norm['invoiceid'] || norm['invoice_id'] || norm['rechnung_id'] || null
    const bookingId = norm['bookingid'] || norm['booking_id'] || norm['buchung_id'] || null
    const weightRaw = norm['weightkg'] || norm['weight_kg'] || norm['gewicht_kg'] || norm['gewicht'] || ''
    const priceRaw = norm['priceperkg'] || norm['price_per_kg'] || norm['preis_pro_kg'] || norm['preis_kg'] || ''

    const weightKg = parseFloat(weightRaw.replace(',', '.'))
    const pricePerKg = parseFloat(priceRaw.replace(',', '.'))

    let rowError: string | null = null
    if (!invoiceId && !bookingId) rowError = 'Keine invoiceId oder bookingId'
    else if (isNaN(weightKg) || weightKg <= 0) rowError = 'Ungültiges Gewicht'
    else if (isNaN(pricePerKg) || pricePerKg <= 0) rowError = 'Ungültiger Preis/kg'

    const resolvedInvoiceId = rowError ? null : resolveInvoiceId({ invoiceId: invoiceId ?? undefined, bookingId: bookingId ?? undefined })
    if (!rowError && !resolvedInvoiceId) rowError = 'Rechnung nicht gefunden'

    parsed.push({ invoiceId, bookingId, weightKg, pricePerKg, resolvedInvoiceId, error: rowError })
  }

  rows.value = parsed
}

function handleFile(file: File) {
  if (!file) return
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      parseSheet(wb)
    } catch {
      parseError.value = 'Datei konnte nicht gelesen werden.'
    }
  }
  reader.readAsArrayBuffer(file)
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

const validRows = () => rows.value.filter(r => !r.error)

async function applyAll() {
  applying.value = true
  try {
    await Promise.all(
      validRows().map(r =>
        invoiceApi.applyTransportWeight(r.resolvedInvoiceId!, r.weightKg, r.pricePerKg)
      )
    )
    applied.value = true
    setTimeout(() => emit('applied'), 800)
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Transportgewichte hochladen</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <p class="text-sm text-muted mb-3">
        Lade eine Excel- oder CSV-Datei mit den Spalten
        <code>invoiceId</code> (oder <code>bookingId</code>),
        <code>weightKg</code> und <code>pricePerKg</code> hoch.
        Der Rechnungsbetrag wird automatisch neu berechnet.
      </p>

      <!-- Drop zone -->
      <div
        v-if="!rows.length && !parseError"
        class="drop-zone"
        :class="{ dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="32" height="32" class="drop-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
        <p class="drop-label">Datei hier ablegen</p>
        <p class="text-sm text-muted">oder</p>
        <label class="btn-primary btn-sm file-label">
          Datei auswählen
          <input type="file" accept=".xlsx,.xls,.csv" class="file-input" @change="onFileInput" />
        </label>
        <p class="text-sm text-muted mt-1">Unterstützt: .xlsx, .xls, .csv</p>
      </div>

      <!-- Parse error -->
      <div v-if="parseError" class="alert alert-error mb-2">{{ parseError }}</div>

      <!-- Preview table -->
      <div v-if="rows.length" class="preview-wrap">
        <div class="preview-header row-between mb-2">
          <p class="section-title" style="margin:0">
            {{ fileName }} — {{ validRows().length }}/{{ rows.length }} gültige Zeilen
          </p>
          <label class="btn-ghost btn-sm file-label">
            Andere Datei
            <input type="file" accept=".xlsx,.xls,.csv" class="file-input" @change="onFileInput" />
          </label>
        </div>

        <div class="table-scroll">
          <table class="weight-table">
            <thead>
              <tr>
                <th>Rechnung / Buchung</th>
                <th>Gewicht (kg)</th>
                <th>Preis/kg (€)</th>
                <th>Betrag (€)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in rows" :key="i" :class="{ 'row-error': row.error }">
                <td class="id-cell">{{ row.invoiceId ?? row.bookingId ?? '—' }}</td>
                <td>{{ row.error ? '—' : row.weightKg.toLocaleString('de-DE') }}</td>
                <td>{{ row.error ? '—' : row.pricePerKg.toFixed(4) }}</td>
                <td>{{ row.error ? '—' : (row.weightKg * row.pricePerKg).toFixed(2) }}</td>
                <td>
                  <span v-if="row.error" class="badge badge-red">{{ row.error }}</span>
                  <span v-else class="badge badge-green">OK</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="applied" class="alert alert-success mt-2">
          Gewichte erfolgreich übernommen.
        </div>

        <div v-if="!applied" class="row mt-3" style="gap:0.75rem">
          <button class="btn-ghost btn-block" @click="emit('close')">Abbrechen</button>
          <button
            class="btn-primary btn-block"
            :disabled="applying || validRows().length === 0"
            @click="applyAll"
          >
            {{ applying ? 'Wird angewendet...' : `${validRows().length} Einträge übernehmen` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mb-2 { margin-bottom: 0.75rem; }
.mb-3 { margin-bottom: 1.25rem; }
.mt-1 { margin-top: 0.4rem; }
.mt-2 { margin-top: 0.75rem; }
.mt-3 { margin-top: 1.25rem; }
code {
  background: rgba(255,255,255,0.08);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-size: 0.82em;
  font-family: monospace;
}
.drop-zone {
  border: 2px dashed var(--border-card);
  border-radius: var(--radius-sm);
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  cursor: default;
}
.drop-zone.dragging {
  border-color: var(--accent-blue);
  background: rgba(58,143,212,0.06);
}
.drop-icon { color: var(--text-muted); margin-bottom: 0.25rem; }
.drop-label { font-weight: 600; color: var(--text-primary); }
.file-label {
  position: relative;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
}
.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
}
.weight-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  min-width: 420px;
}
.weight-table th {
  background: #181818;
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
  padding: 0.5rem 0.6rem;
  white-space: nowrap;
  border-bottom: 1px solid var(--border-card);
}
.weight-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: var(--text-primary);
}
.weight-table tr:last-child td { border-bottom: none; }
.row-error td { color: var(--text-muted); }
.id-cell { font-family: monospace; font-size: 0.78rem; }
.preview-header { align-items: center; }
.alert-success {
  background: rgba(39,174,96,0.12);
  border: 1px solid rgba(39,174,96,0.3);
  color: #2ecc71;
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.75rem;
  font-size: 0.88rem;
}
</style>
