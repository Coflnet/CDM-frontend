<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi, invoiceApi, markContainerRetrieved } from '../../api'
import type { Order, Invoice, ErrorLog, Driver, Site, CustomerContainerView, DriverReport, ContainerCompany } from '../../api'
import { WASTE_TYPE_LABEL, BOOKING_STATUS_LABEL, BOOKING_STATUS_BADGE, formatDate, formatDateTime } from '../../utils'
import WeightUploadModal from './WeightUploadModal.vue'
import TripReportCard from '../shared/TripReportCard.vue'

const activeTab = ref<'orders' | 'containers' | 'invoices' | 'logs' | 'companies'>('orders')

const orders = ref<Order[]>([])
const allContainers = ref<CustomerContainerView[]>([])
const allSites = ref<Site[]>([])
const allInvoices = ref<Invoice[]>([])
const errorLogs = ref<ErrorLog[]>([])
const drivers = ref<Driver[]>([])
const companies = ref<ContainerCompany[]>([])
const loading = ref(true)
const error = ref('')

const assigningOrderId = ref<string | null>(null)
const assignDriverId = ref('')
const showWeightUpload = ref(false)
const newCompanyName = ref('')
const newCompanyZip = ref('')
const assignCompanyId = ref('')
const assignEmail = ref('')
const assignRole = ref<'admin' | 'driver'>('driver')
const companyMessage = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [o, c, s, inv, logs, d, companyRows] = await Promise.all([
      adminApi.listOrders(),
      adminApi.listContainers(),
      adminApi.listSites(),
      invoiceApi.listAll(),
      adminApi.listErrorLogs(),
      adminApi.listDrivers(),
      adminApi.listCompanies(),
    ])
    orders.value = o
    allContainers.value = c
    allSites.value = s
    allInvoices.value = inv
    errorLogs.value = logs
    drivers.value = d
    companies.value = companyRows
    if (!assignCompanyId.value && companyRows[0]) assignCompanyId.value = companyRows[0].companyId
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Ladefehler'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function siteName(siteId: string): string {
  return allSites.value.find(s => s.siteId === siteId)?.name ?? siteId
}

function driverName(driverId: string | null): string {
  if (!driverId) return '—'
  return drivers.value.find(d => d.driverId === driverId)?.name ?? driverId
}

function containerForBooking(bookingId: string): CustomerContainerView | undefined {
  return allContainers.value.find(container => container.bookingId === bookingId)
}

function sortedReports(order: Order): DriverReport[] {
  return [...order.reports].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

function openAssign(orderId: string, current: string | null) {
  assigningOrderId.value = orderId
  assignDriverId.value = current ?? ''
}

async function confirmAssign(orderId: string) {
  if (!assignDriverId.value) return
  try {
    await adminApi.assignDriver(orderId, assignDriverId.value)
    await load()
  } catch {
    // ignore
  }
  assigningOrderId.value = null
}

async function doMarkPaid(invoiceId: string) {
  try {
    await invoiceApi.markPaid(invoiceId)
    await load()
  } catch {
    // ignore
  }
}

async function doMarkRetrieved(order: Order) {
  await Promise.all((order.bookingIds ?? []).map(bookingId => markContainerRetrieved(bookingId)))
  await load()
}

async function createCompany() {
  if (!newCompanyName.value.trim()) return
  companyMessage.value = ''
  try {
    await adminApi.createCompany({ name: newCompanyName.value.trim(), baseZipCode: newCompanyZip.value.trim() || undefined })
    newCompanyName.value = ''
    newCompanyZip.value = ''
    companyMessage.value = 'Firma erstellt.'
    await load()
  } catch (e: unknown) {
    companyMessage.value = e instanceof Error ? e.message : 'Firma konnte nicht erstellt werden.'
  }
}

async function assignCompanyUser() {
  if (!assignCompanyId.value || !assignEmail.value.trim()) return
  companyMessage.value = ''
  try {
    await adminApi.assignCompanyUser(assignCompanyId.value, assignEmail.value.trim(), assignRole.value)
    assignEmail.value = ''
    companyMessage.value = 'Benutzer zugewiesen.'
    await load()
  } catch (e: unknown) {
    companyMessage.value = e instanceof Error ? e.message : 'Benutzer konnte nicht zugewiesen werden.'
  }
}

const pendingOrders = computed(() => orders.value.filter(o => o.status === 'Requested' || o.status === 'Scheduled'))
const unpaidInvoices = computed(() => allInvoices.value.filter(i => i.status === 'unpaid'))
const errorCount = computed(() => errorLogs.value.filter(l => l.level === 'error').length)

function logLevelClass(level: ErrorLog['level']) {
  if (level === 'error') return 'badge-red'
  if (level === 'warn') return 'badge-orange'
  return 'badge-blue'
}
</script>

<template>
  <div>
    <div class="content-with-nav">
      <div class="page">
        <div class="row-between mb-2">
          <div>
            <h1 class="admin-title">Administration</h1>
            <p class="text-sm text-muted">Coflnet CDM</p>
          </div>
        </div>

        <!-- Summary chips -->
        <div class="summary-chips row mb-3">
          <div class="chip" :class="{ 'chip-warn': pendingOrders.length > 0 }">
            <span class="chip-val">{{ pendingOrders.length }}</span>
            <span class="chip-label">Aufträge</span>
          </div>
          <div class="chip" :class="{ 'chip-warn': unpaidInvoices.length > 0 }">
            <span class="chip-val">{{ unpaidInvoices.length }}</span>
            <span class="chip-label">Offen</span>
          </div>
          <div class="chip" :class="{ 'chip-warn': errorCount > 0 }">
            <span class="chip-val">{{ errorCount }}</span>
            <span class="chip-label">Fehler</span>
          </div>
          <div class="chip">
            <span class="chip-val">{{ allContainers.length }}</span>
            <span class="chip-label">Container</span>
          </div>
        </div>

        <div v-if="loading" class="spinner"></div>
        <div v-else-if="error" class="alert alert-error">{{ error }}</div>

        <div v-else>
          <!-- Tab content -->
          <div v-if="activeTab === 'orders'" class="stack">
            <div v-if="orders.length === 0" class="empty-state">
              <div class="icon">&#128203;</div>
              <p>Keine Aufträge vorhanden.</p>
            </div>
            <div v-for="o in orders" :key="o.orderId" class="card order-card">
              <div class="row-between mb-1">
                <div class="card-title-wrap">
                  <h3 class="card-h3">{{ siteName(o.siteId) }}</h3>
                  <p class="text-sm text-muted">{{ formatDate(o.createdAt) }}</p>
                </div>
                <span class="badge badge-shrink" :class="BOOKING_STATUS_BADGE[o.status]">
                  {{ BOOKING_STATUS_LABEL[o.status] }}
                </span>
              </div>

              <div class="meta-row text-sm text-muted mb-1">
                <span>Fahrer: <strong class="driver-name">{{ driverName(o.assignedDriverId) }}</strong></span>
              </div>
              <div v-if="o.notes" class="text-sm text-muted mb-1">Notiz: {{ o.notes }}</div>
              <div v-if="o.requestedDeliveryAt" class="text-sm text-muted mb-1">
                Lieferung: {{ formatDateTime(o.requestedDeliveryAt) }}
              </div>
              <div v-if="o.bookingIds?.length" class="booking-tags mb-2">
                <span v-for="bk in o.bookingIds" :key="bk" class="bk-tag">{{ bk }}</span>
              </div>

              <div v-if="o.reports.length" class="report-section mb-2">
                <p class="section-title" style="margin-bottom:0.55rem">Fahrerberichte</p>
                <div class="stack report-stack">
                  <TripReportCard
                    v-for="report in sortedReports(o)"
                    :key="report.reportId"
                    :report="report"
                    :waste-type="containerForBooking(report.bookingId)?.wasteType ?? 'Mixed'"
                    :container-number="containerForBooking(report.bookingId)?.containerNumber ?? null"
                    :site-name="siteName(o.siteId)"
                    :booking-status="containerForBooking(report.bookingId)?.status ?? o.status"
                  />
                </div>
              </div>
              <p v-else class="text-sm text-muted mb-2">Noch kein Fahrerbericht vorhanden.</p>

              <!-- Assign driver -->
              <div v-if="assigningOrderId === o.orderId" class="assign-row">
                <select v-model="assignDriverId" class="driver-select">
                  <option value="">Fahrer wählen...</option>
                  <option v-for="d in drivers" :key="d.driverId" :value="d.driverId">{{ d.name }}</option>
                </select>
                <button class="btn-primary btn-sm" @click="confirmAssign(o.orderId)" :disabled="!assignDriverId">Zuweisen</button>
                <button class="btn-ghost btn-sm" @click="assigningOrderId = null">Abbrechen</button>
              </div>
              <div v-else class="card-actions">
                <button class="btn-warning btn-sm" @click="openAssign(o.orderId, o.assignedDriverId)">
                  {{ o.assignedDriverId ? 'Fahrer ändern' : 'Fahrer zuweisen' }}
                </button>
                <button
                  v-if="o.bookingIds?.length"
                  class="btn-success btn-sm"
                  @click="doMarkRetrieved(o)"
                >
                  Abgeholt
                </button>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'containers'" class="stack">
            <div v-if="allContainers.length === 0" class="empty-state">
              <div class="icon">&#128465;</div>
              <p>Keine Container.</p>
            </div>
            <div v-for="c in allContainers" :key="c.bookingId" class="card">
              <div class="row-between mb-1">
                <div class="card-title-wrap">
                  <h3 class="card-h3">{{ WASTE_TYPE_LABEL[c.wasteType] }} — {{ c.containerNumber ?? 'ohne Nr.' }}</h3>
                  <p class="text-sm text-muted">{{ siteName(c.siteId) }}</p>
                </div>
                <span class="badge badge-shrink" :class="BOOKING_STATUS_BADGE[c.status]">
                  {{ BOOKING_STATUS_LABEL[c.status] }}
                </span>
              </div>
              <div class="fill-row row" style="gap:0.6rem;align-items:center">
                <div class="fill-bar-wrap" style="flex:1">
                  <div class="fill-bar" :style="{ width: Math.round(c.fillLevel * 100) + '%', background: c.fillLevel >= 0.8 ? '#e74c3c' : c.fillLevel >= 0.5 ? '#e67e22' : '#27ae60' }"></div>
                </div>
                <span class="text-sm text-muted" style="min-width:2.5rem;text-align:right">{{ Math.round(c.fillLevel * 100) }}%</span>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'invoices'">
            <div class="row-between mb-2">
              <p class="section-title" style="margin:0">Rechnungen</p>
              <button class="btn-warning btn-sm" @click="showWeightUpload = true">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14" style="display:inline;vertical-align:middle;margin-right:4px"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                Gewichte hochladen
              </button>
            </div>
            <div v-if="allInvoices.length === 0" class="empty-state">
              <div class="icon">&#129534;</div>
              <p>Keine Rechnungen.</p>
            </div>
            <div v-else class="stack">
              <div v-for="inv in allInvoices" :key="inv.invoiceId" class="card invoice-card">
                <div class="row-between mb-1">
                  <div class="card-title-wrap">
                    <h3 class="card-h3">{{ WASTE_TYPE_LABEL[inv.wasteType] }} — {{ inv.siteName ?? inv.siteId }}</h3>
                    <p class="text-sm text-muted">{{ formatDate(inv.issuedAt) }}</p>
                  </div>
                  <span class="badge badge-shrink" :class="inv.status === 'paid' ? 'badge-green' : 'badge-orange'">
                    {{ inv.status === 'paid' ? 'Bezahlt' : 'Offen' }}
                  </span>
                </div>
                <div class="invoice-amount">{{ inv.amount.toFixed(2) }} {{ inv.currency }}</div>
                <div v-if="inv.damageCharge" class="text-sm text-muted mb-1">
                  Schadensbelastung: {{ inv.damageCharge.toFixed(2) }} EUR
                </div>
                <div v-if="inv.weightKg" class="weight-row text-sm text-muted mb-1">
                  <span>{{ inv.weightKg.toLocaleString('de-DE') }} kg</span>
                  <span class="weight-sep">·</span>
                  <span>{{ inv.pricePerKg?.toFixed(4) }} €/kg</span>
                </div>
                <div v-else class="text-sm text-muted mb-1">Kein Gewicht hinterlegt</div>
                <div class="text-sm text-muted mb-2">{{ inv.invoiceId }}</div>
                <button
                  v-if="inv.status !== 'paid'"
                  class="btn-success btn-sm"
                  @click="doMarkPaid(inv.invoiceId)"
                >Als bezahlt markieren</button>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'logs'" class="stack">
            <div v-if="errorLogs.length === 0" class="empty-state">
              <div class="icon">&#9989;</div>
              <p>Keine Einträge im Fehlerprotokoll.</p>
            </div>
            <div v-for="log in errorLogs" :key="log.logId" class="card log-card">
              <div class="row-between mb-1">
                <span class="badge badge-shrink" :class="logLevelClass(log.level)">{{ log.level.toUpperCase() }}</span>
                <span class="text-sm text-muted">{{ formatDateTime(log.occurredAt) }}</span>
              </div>
              <p class="log-message">{{ log.message }}</p>
              <p v-if="log.context" class="text-sm text-muted mt-1">Kontext: {{ log.context }}</p>
            </div>
          </div>

          <div v-if="activeTab === 'companies'" class="stack">
            <div v-if="companyMessage" class="alert alert-info">{{ companyMessage }}</div>

            <div class="card">
              <p class="section-title">Firmen</p>
              <div v-if="companies.length === 0" class="text-sm text-muted">Keine Firma zugewiesen.</div>
              <div v-else class="company-list">
                <div v-for="company in companies" :key="company.companyId" class="company-row">
                  <div>
                    <strong>{{ company.name }}</strong>
                    <p class="text-sm text-muted">{{ company.baseZipCode || 'ohne PLZ' }} · {{ company.slug }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <p class="section-title">Neue Firma</p>
              <div class="form-group">
                <label>Name</label>
                <input v-model="newCompanyName" type="text" placeholder="Containerdienst Muster" />
              </div>
              <div class="form-group">
                <label>Basis-PLZ</label>
                <input v-model="newCompanyZip" type="text" inputmode="numeric" placeholder="84513" />
              </div>
              <button class="btn-primary btn-sm" @click="createCompany" :disabled="!newCompanyName.trim()">Firma erstellen</button>
            </div>

            <div class="card">
              <p class="section-title">E-Mail zuweisen</p>
              <div class="form-group">
                <label>Firma</label>
                <select v-model="assignCompanyId">
                  <option v-for="company in companies" :key="company.companyId" :value="company.companyId">{{ company.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>E-Mail</label>
                <input v-model="assignEmail" type="email" placeholder="fahrer@firma.de" />
              </div>
              <div class="form-group">
                <label>Rolle</label>
                <select v-model="assignRole">
                  <option value="driver">Fahrer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button class="btn-primary btn-sm" @click="assignCompanyUser" :disabled="!assignCompanyId || !assignEmail.trim()">Zuweisen</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <WeightUploadModal
        v-if="showWeightUpload"
        :invoices="allInvoices"
        @close="showWeightUpload = false"
        @applied="showWeightUpload = false; load()"
      />
    </Transition>

    <nav class="bottom-nav">
      <button class="bottom-nav-item" :class="{ active: activeTab === 'orders' }" @click="activeTab = 'orders'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        Aufträge
      </button>
      <button class="bottom-nav-item" :class="{ active: activeTab === 'containers' }" @click="activeTab = 'containers'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg>
        Container
      </button>
      <button class="bottom-nav-item" :class="{ active: activeTab === 'invoices' }" @click="activeTab = 'invoices'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Rechnungen
      </button>
      <button class="bottom-nav-item" :class="{ active: activeTab === 'logs' }" @click="activeTab = 'logs'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        Fehler
      </button>
      <button class="bottom-nav-item" :class="{ active: activeTab === 'companies' }" @click="activeTab = 'companies'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h1m-1 4h1m-1 4h1m6-4h1m-1 4h1"/></svg>
        Firmen
      </button>
    </nav>
  </div>
</template>

<style scoped>
.admin-title { font-size: 1.25rem; }
.summary-chips { gap: 0.6rem; flex-wrap: wrap; }
.chip {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 58px;
}
.chip-warn { border-color: rgba(230,126,34,0.4); }
.chip-val { font-size: 1.3rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
.chip-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 600; }
.card-title-wrap { min-width: 0; flex: 1; overflow: hidden; }
.card-h3 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge-shrink { flex-shrink: 0; }
.driver-name { color: var(--text-primary); }
.meta-row { margin-bottom: 0.25rem; }
.booking-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.bk-tag {
  background: rgba(58,143,212,0.12);
  color: var(--accent-blue-light);
  font-size: 0.72rem;
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
  font-weight: 600;
}
.assign-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0.5rem;
}
.driver-select {
  flex: 1;
  min-width: 130px;
}
.card-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}
.report-stack {
  gap: 0.6rem;
}
.invoice-amount {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.2rem;
}
.weight-row { display: flex; align-items: center; gap: 0.35rem; }
.weight-sep { color: var(--border-card); }
.log-message {
  font-size: 0.88rem;
  color: var(--text-primary);
  word-break: break-word;
}
.company-list { display: flex; flex-direction: column; gap: 0.5rem; }
.company-row {
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 0.65rem;
  background: #181818;
}
.mt-1 { margin-top: 0.4rem; }
.mb-1 { margin-bottom: 0.4rem; }
.mb-2 { margin-bottom: 0.75rem; }
.mb-3 { margin-bottom: 1.25rem; }
</style>
