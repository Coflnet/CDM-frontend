<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { driverApi } from '../../api'
import type { DriverTrip, DriverReportPhotoSide } from '../../api'
import { REPORT_PHOTO_SIDE_LABEL, TRIP_KIND_LABEL, WASTE_TYPE_LABEL } from '../../utils'
import { useBodyLock } from '../../composables/useBodyLock'

useBodyLock()

const props = defineProps<{ trip: DriverTrip }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>()

type DraftPhoto = { imageUrl: string; fileName: string }

const photoSides: DriverReportPhotoSide[] = ['front', 'right', 'back', 'left']
const customerName = ref('')
const damageNotes = ref('')
const damageCharge = ref('')
const loading = ref(false)
const error = ref('')
const signatureCanvas = ref<HTMLCanvasElement | null>(null)
const hasSignature = ref(false)
const isDrawing = ref(false)
const photoDrafts = ref<Record<DriverReportPhotoSide, DraftPhoto | null>>({
  front: null,
  right: null,
  back: null,
  left: null,
})

const reportTitle = computed(() =>
  props.trip.tripKind === 'pickup' ? 'Rücknahmebericht' : 'Übergabebericht'
)

const allPhotosReady = computed(() => photoSides.every(side => Boolean(photoDrafts.value[side])))

function setupCanvas(): void {
  const canvas = signatureCanvas.value
  if (!canvas) return

  const scale = window.devicePixelRatio || 1
  const width = canvas.clientWidth || 320
  const height = canvas.clientHeight || 180
  canvas.width = width * scale
  canvas.height = height * scale

  const context = canvas.getContext('2d')
  if (!context) return

  context.scale(scale, scale)
  context.lineWidth = 2
  context.lineCap = 'round'
  context.strokeStyle = '#0d1117'
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
}

onMounted(() => {
  void nextTick(() => setupCanvas())
})

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Image could not be read'))
    reader.readAsDataURL(file)
  })
}

async function onPhotoSelected(side: DriverReportPhotoSide, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const imageUrl = await readFileAsDataUrl(file)
    photoDrafts.value[side] = { imageUrl, fileName: file.name }
  } catch (photoError) {
    error.value = photoError instanceof Error ? photoError.message : 'Image could not be loaded.'
  }
}

function clearPhoto(side: DriverReportPhotoSide): void {
  photoDrafts.value[side] = null
}

function canvasPoint(event: PointerEvent): { x: number; y: number } | null {
  const canvas = signatureCanvas.value
  if (!canvas) return null

  const bounds = canvas.getBoundingClientRect()
  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  }
}

function startDrawing(event: PointerEvent): void {
  const canvas = signatureCanvas.value
  const point = canvasPoint(event)
  if (!canvas || !point) return

  const context = canvas.getContext('2d')
  if (!context) return

  isDrawing.value = true
  hasSignature.value = true
  context.beginPath()
  context.moveTo(point.x, point.y)
}

function draw(event: PointerEvent): void {
  if (!isDrawing.value) return
  const canvas = signatureCanvas.value
  const point = canvasPoint(event)
  if (!canvas || !point) return

  const context = canvas.getContext('2d')
  if (!context) return

  context.lineTo(point.x, point.y)
  context.stroke()
}

function stopDrawing(): void {
  isDrawing.value = false
}

function clearSignature(): void {
  const canvas = signatureCanvas.value
  if (!canvas) return
  const context = canvas.getContext('2d')
  if (!context) return

  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.restore()
  hasSignature.value = false
  setupCanvas()
}

async function save(): Promise<void> {
  error.value = ''

  if (!props.trip.tripKind) {
    error.value = 'Trip type is missing.'
    return
  }

  if (!customerName.value.trim()) {
    error.value = 'Bitte den Namen des unterschreibenden Kunden angeben.'
    return
  }

  if (!allPhotosReady.value) {
    error.value = 'Bitte vier Fotos aufnehmen, eines pro Seite.'
    return
  }

  if (!hasSignature.value || !signatureCanvas.value) {
    error.value = 'Bitte die Kundenunterschrift erfassen.'
    return
  }

  const parsedDamageCharge = damageCharge.value.trim()
    ? Number(damageCharge.value.replace(',', '.'))
    : 0

  if (Number.isNaN(parsedDamageCharge) || parsedDamageCharge < 0) {
    error.value = 'Bitte einen gültigen Schadensbetrag eingeben.'
    return
  }

  if (props.trip.tripKind === 'pickup' && parsedDamageCharge > 0 && !damageNotes.value.trim()) {
    error.value = 'Bitte den festgestellten Schaden beschreiben.'
    return
  }

  loading.value = true
  try {
    await driverApi.submitTripReport(props.trip.bookingId, props.trip.tripKind, {
      driverId: props.trip.driverUserId,
      signerName: customerName.value.trim(),
      signatureDataUrl: signatureCanvas.value.toDataURL('image/png'),
      damageNotes: damageNotes.value.trim() || undefined,
      damageCharge: props.trip.tripKind === 'pickup' ? parsedDamageCharge : undefined,
      photos: photoSides.map(side => ({
        side,
        imageUrl: photoDrafts.value[side]!.imageUrl,
      })),
    })
    emit('saved')
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : 'Der Bericht konnte nicht gespeichert werden.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal-report">
      <div class="modal-header">
        <div>
          <h2>{{ reportTitle }}</h2>
          <p class="text-sm text-muted">{{ WASTE_TYPE_LABEL[trip.wasteType] }} · {{ TRIP_KIND_LABEL[trip.tripKind!] }}</p>
        </div>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <div class="form-group">
        <label>Name des Kunden</label>
        <input v-model="customerName" type="text" placeholder="Max Mustermann" />
      </div>

      <div class="report-section">
        <div class="row-between mb-1">
          <p class="section-title" style="margin:0">Vier Seitenfotos</p>
          <span class="text-sm text-muted">Pflicht</span>
        </div>
        <div class="photo-grid">
          <div v-for="side in photoSides" :key="side" class="photo-input-card">
            <div class="row-between mb-1">
              <span class="photo-side">{{ REPORT_PHOTO_SIDE_LABEL[side] }}</span>
              <button v-if="photoDrafts[side]" class="link-btn" @click.prevent="clearPhoto(side)">Entfernen</button>
            </div>

            <img v-if="photoDrafts[side]" :src="photoDrafts[side]!.imageUrl" :alt="REPORT_PHOTO_SIDE_LABEL[side]" class="photo-preview" />
            <div v-else class="photo-placeholder">Foto aufnehmen</div>

            <label class="btn-ghost btn-sm btn-block file-label">
              {{ photoDrafts[side] ? 'Foto ersetzen' : 'Foto aufnehmen' }}
              <input type="file" accept="image/*" capture="environment" class="file-input" @change="onPhotoSelected(side, $event)" />
            </label>
          </div>
        </div>
      </div>

      <div class="report-section">
        <div class="row-between mb-1">
          <p class="section-title" style="margin:0">Kundenunterschrift</p>
          <button class="link-btn" @click.prevent="clearSignature">Zurücksetzen</button>
        </div>
        <canvas
          ref="signatureCanvas"
          class="signature-canvas"
          @pointerdown.prevent="startDrawing"
          @pointermove.prevent="draw"
          @pointerup.prevent="stopDrawing"
          @pointerleave.prevent="stopDrawing"
          @pointercancel.prevent="stopDrawing"
        ></canvas>
      </div>

      <div class="form-group">
        <label>Schäden / Notizen</label>
        <textarea v-model="damageNotes" rows="3" placeholder="Dokumentierte Schäden, Auffälligkeiten oder Bemerkungen..."></textarea>
      </div>

      <div v-if="trip.tripKind === 'pickup'" class="form-group">
        <label>Schadensbelastung (EUR, optional)</label>
        <input v-model="damageCharge" type="text" inputmode="decimal" placeholder="0,00" />
      </div>

      <div class="row mt-3" style="gap:0.75rem">
        <button class="btn-ghost btn-block" @click="emit('close')">Abbrechen</button>
        <button class="btn-primary btn-block" :disabled="loading" @click="save">
          {{ loading ? 'Wird gespeichert...' : 'Bericht speichern' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-report {
  width: min(720px, calc(100vw - 2rem));
}
.report-section {
  margin-top: 0.9rem;
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
.photo-input-card {
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  background: rgba(255,255,255,0.02);
}
.photo-side {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
}
.photo-preview,
.photo-placeholder {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-sm);
  margin-bottom: 0.6rem;
}
.photo-preview {
  display: block;
  object-fit: cover;
}
.photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.04);
  border: 1px dashed var(--border-card);
  color: var(--text-muted);
  font-size: 0.85rem;
}
.signature-canvas {
  display: block;
  width: 100%;
  height: 180px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-card);
  background: #fff;
  touch-action: none;
}
.file-label {
  position: relative;
  overflow: hidden;
}
.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.mb-1 { margin-bottom: 0.45rem; }
.mb-2 { margin-bottom: 0.75rem; }
.mt-3 { margin-top: 1.25rem; }
</style>