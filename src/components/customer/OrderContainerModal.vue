<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { sitesApi, customerExtrasApi } from '../../api'
import type { Site, WasteType } from '../../api'
import { useVideoRecorder } from '../../composables/useVideoRecorder'
import { LEITL_CONTAINERS, WASTE_TYPE_LABEL, suggestContainerVariants } from '../../utils'
import { useBodyLock } from '../../composables/useBodyLock'
useBodyLock()

const props = defineProps<{ sites: Site[] }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'ordered'): void }>()

const NEW_SITE_ID = '__new'
const siteId = ref(props.sites[0]?.siteId ?? NEW_SITE_ID)
const wasteType = ref<WasteType>('Mixed')
const containerVariantId = ref<string>('absetz-7-offen')
const notes = ref('')
const preferredDate = ref('')
const newSiteName = ref('')
const newSiteAddress = ref('')
const newSiteZip = ref('')
const error = ref('')
const loading = ref(false)

// Feature 1 — pricing transparency
const priceCents = ref<number | null>(null)
const priceCurrency = ref<string>('EUR')
const priceLoading = ref(false)

// Feature 2 — optional placement-spot photo
const placementPhoto = ref<File | null>(null)
const placementPhotoKey = ref<string>('')

// Feature 7 — optional Stellgenehmigung tracker
const showPermit = ref(false)
const permitNumber = ref('')
const permitExpiresAt = ref('')

const wasteTypes: WasteType[] = ['Mixed', 'Wood', 'Metal', 'Concrete', 'Paper', 'Plastic', 'Organic', 'Electronics']

const suggestedVariants = computed(() => suggestContainerVariants(wasteType.value))
const selectedVariant = computed(() =>
  LEITL_CONTAINERS.find(c => c.id === containerVariantId.value) ?? LEITL_CONTAINERS[0],
)

// When the customer changes the waste type, default to the first suggested
// variant if the current one is not in the suggestion list.
watch(wasteType, (next) => {
  const recommended = suggestContainerVariants(next)
  if (!recommended.some(v => v.id === containerVariantId.value)) {
    containerVariantId.value = recommended[0]?.id ?? containerVariantId.value
  }
})

async function refreshPrice() {
  priceLoading.value = true
  try {
    const quote = await customerExtrasApi.getPrice(containerVariantId.value, wasteType.value)
    priceCents.value = quote.priceCents
    priceCurrency.value = quote.currency || 'EUR'
  } catch {
    priceCents.value = null
  } finally {
    priceLoading.value = false
  }
}
watch([wasteType, containerVariantId], refreshPrice, { immediate: true })

const formattedPrice = computed(() => {
  if (priceCents.value == null) return ''
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: priceCurrency.value }).format(priceCents.value / 100)
  } catch {
    return `${(priceCents.value / 100).toFixed(2)} ${priceCurrency.value}`
  }
})

async function onPlacementPhoto(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  placementPhoto.value = file
  try {
    const res = await customerExtrasApi.uploadPlacementPhoto(file)
    placementPhotoKey.value = res.storageKey
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Foto-Upload fehlgeschlagen'
    placementPhoto.value = null
  }
}

const recorder = useVideoRecorder()
const { step, recording, videoBlob, videoPreviewUrl, stream } = recorder
const { openCamera, startRecording, stopRecording, stopCamera, rerecord } = recorder

function buildNotes(): string | undefined {
  const variant = selectedVariant.value
  const tag = variant ? `[Container: ${variant.label}]` : ''
  co  containerVariantId: containerVariantId.value,
      placementPhotoKey: placementPhotoKey.value || undefined,
      permitNumber: showPermit.value && permitNumber.value ? permitNumber.value : undefined,
      permitExpiresAt: showPermit.value && permitExpiresAt.value ? new Date(permitExpiresAt.value).toISOString() : undefined,
    nst free = notes.value.trim()
  const combined = [tag, free].filter(Boolean).join('\n')
  return combined ? combined : undefined
}

async function save() {
  if (!videoBlob.value) { error.value = 'Bitte nimm vor der Bestellung ein Einfahrtsvideo auf.'; return }
  error.value = ''
  loading.value = true
  try {
    let site = props.sites.find(s => s.siteId === siteId.value)
    if (!site) {
      if (!newSiteZip.value.trim()) { error.value = 'Bitte gib eine Postleitzahl ein.'; return }
      site = await sitesApi.create({
        name: newSiteName.value.trim() || `Bestellung ${newSiteZip.value.trim()}`,
        address: newSiteAddress.value.trim() || newSiteZip.value.trim(),
        zipCode: newSiteZip.value.trim(),
        lat: 0,
        lon: 0,
        orientationNote: notes.value.trim() || undefined,
      })
      siteId.value = site.siteId
    }

    // Upload anfahrt video first
    const form = new FormData()
    form.append('video', videoBlob.value, 'anfahrt.webm')
    form.append('lat', String(site.lat))
    form.append('lon', String(site.lon))
    if (site.orientationNote) form.append('orientationNote', site.orientationNote)
    await sitesApi.uploadAnfahrt(siteId.value, form)

    // Create order
    await sitesApi.createOrder(siteId.value, {
      wasteTypes: [wasteType.value],
      requestedDeliveryAt: preferredDate.value ? new Date(preferredDate.value).toISOString() : undefined,
      notes: buildNotes(),
    })

    emit('ordered')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Unbekannter Fehler'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="stopCamera(); emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>{{ step === 'video' ? 'Einfahrtsvideo aufnehmen' : 'Container bestellen' }}</h2>
        <button class="modal-close" @click="stopCamera(); emit('close')">&times;</button>
      </div>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <!-- Order form -->
      <div v-if="step === 'form'">
        <div class="form-group">
          <label>Standort</label>
          <select v-model="siteId">
            <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
            <option :value="NEW_SITE_ID">Neuer Standort</option>
          </select>
        </div>
        <div v-if="siteId === NEW_SITE_ID" class="new-site-fields">
          <div class="form-group">
            <label>Postleitzahl</label>
            <input v-model="newSiteZip" type="text" inputmode="numeric" placeholder="84513" />
          </div>
          <div class="form-group">
            <label>Adresse</label>
            <input v-model="newSiteAddress" type="text" placeholder="Straße und Ort" />
          </div>
          <div class="form-group">
            <label>Standortname</label>
            <input v-model="newSiteName" type="text" placeholder="Baustelle oder Lieferort" />
          </div>
        </div>
        <div class="form-group">
          <label>Abfalltyp</label>
          <select v-model="wasteType">
            <option v-for="t in wasteTypes" :key="t" :value="t">{{ WASTE_TYPE_LABEL[t] }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Container auswählen</label>
          <p class="text-sm text-muted mb-2">
            Empfehlungen für {{ WASTE_TYPE_LABEL[wasteType] }} – passend zum Containerservice von Leitl Recycling.
          </p>
          <div class="variant-grid">
            <label
              v-for="v in suggestedVariants"
              :key="v.id"
              class="variant-card"
              :class="{ active: containerVariantId === v.id }"
            >
              <input type="radio" :value="v.id" v-model="containerVariantId" class="variant-radio" />
              <svg
                class="variant-icon"
                viewBox="0 0 80 50"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <!-- Absetzcontainer (trapezoid) vs Abrollcontainer (rectangle) -->
                <template v-if="v.kind === 'Absetz'">
                  <polygon points="8,40 18,18 62,18 72,40" fill="#fb923c" stroke="#9a3412" stroke-width="1.5" />
                  <line x1="8" y1="40" x2="72" y2="40" stroke="#9a3412" stroke-width="1.5" />
                  <circle cx="20" cy="42" r="3" fill="#1f2937" />
                  <circle cx="60" cy="42" r="3" fill="#1f2937" />
                </template>
                <template v-else>
                  <rect x="6" y="14" width="68" height="26" fill="#0ea5e9" stroke="#075985" stroke-width="1.5" />
                  <line x1="6" y1="40" x2="74" y2="40" stroke="#075985" stroke-width="1.5" />
                  <circle cx="16" cy="42" r="3" fill="#1f2937" />
                  <circle cx="40" cy="42" r="3" fill="#1f2937" />
                  <circle cx="64" cy="42" r="3" fill="#1f2937" />
                </template>
                <!-- Lid indicator -->
                <line v-if="v.hasLid" x1="14" y1="14" x2="66" y2="14" stroke="#1f2937" stroke-width="2" stroke-linecap="round" />
              </svg>
              <div class="variant-body">
                <div class="variant-title">{{ v.label }}</div>
                <div class="variant-meta">
                  <span class="badge badge-blue">{{ v.volumeM3 }} m³</span>
                  <span v-if="v.hasLid" class="badge badge-green">Mit Deckel</span>
                  <span v-else class="badge badge-gray">Offen</span>
                </div>
                <div class="variant-foot text-muted">{{ v.footprint }}</div>
              </div>
            </label>
          </div>
          <p v-if="selectedVariant" class="text-sm text-muted variant-desc">
            {{ selectedVariant.description }}
          </p>
          <div v-if="formattedPrice" class="alert alert-info mt-2 d-flex justify-content-between align-items-center">
            <span>Indikativer Preis</span>
            <strong>{{ formattedPrice }}</strong>
          </div>
          <p v-if="priceLoading" class="text-sm text-muted">Preis wird berechnet…</p>
        </div>
        <div class="form-group">
          <label>Gewünschtes Lieferdatum (optional)</label>
          <input type="datetime-local" v-model="preferredDate" />
        </div>

        <div class="form-group">
          <label>Foto vom Stellplatz (optional)</label>
          <input type="file" accept="image/*" capture="environment" @change="onPlacementPhoto" />
          <p class="text-sm text-muted mt-1">
            Hilft dem Fahrer, den richtigen Platz beim ersten Versuch zu finden.
          </p>
          <p v-if="placementPhotoKey" class="text-success small">Foto hochgeladen ✓</p>
        </div>

        <div class="form-group">
          <label class="d-flex align-items-center" style="gap:0.5rem">
            <input type="checkbox" v-model="showPermit" />
            Stellgenehmigung vorhanden (öffentlicher Grund)
          </label>
          <div v-if="showPermit" class="permit-fields mt-2">
            <input v-model="permitNumber" type="text" placeholder="Genehmigungsnummer" class="mb-2" />
            <label class="text-sm text-muted">Gültig bis</label>
            <input v-model="permitExpiresAt" type="datetime-local" />
          </div>
        </div>

        <div class="form-group">
          <label>Hinweise</label>
          <textarea v-model="notes" rows="2" placeholder="Besondere Anweisungen..."></textarea>
        </div>

        <div class="video-section">
          <p class="section-title">Einfahrtsvideo <span class="required">*</span></p>
          <div v-if="videoPreviewUrl" class="video-preview">
            <video :src="videoPreviewUrl" controls></video>
            <div class="row" style="gap:0.5rem;margin-top:0.5rem">
              <button class="btn-ghost btn-sm" @click="rerecord()">Neu aufnehmen</button>
              <span class="text-sm text-muted" style="align-self:center">Video bereit</span>
            </div>
          </div>
          <div v-else>
            <p class="text-sm text-muted mb-2">
              Nimm ein kurzes Video des Einfahrtsweges auf, damit der Fahrer den Containerstandort findet.
            </p>
            <button class="btn-warning btn-block" @click="openCamera()">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18" style="display:inline;vertical-align:middle;margin-right:6px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h9a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z"/>
              </svg>
              Einfahrtsvideo aufnehmen
            </button>
          </div>
        </div>

        <div class="row mt-3" style="gap:0.75rem">
          <button class="btn-ghost btn-block" @click="emit('close')">Abbrechen</button>
          <button class="btn-primary btn-block" @click="save" :disabled="loading || !videoBlob">
            {{ loading ? 'Wird bestellt...' : 'Bestellen' }}
          </button>
        </div>
      </div>

      <!-- Camera view -->
      <div v-else>
        <p class="text-sm text-muted mb-2">
          Filme den Weg von der Straße zum geplanten Containerstandort. Bitte unter 60 Sekunden bleiben.
        </p>

        <div class="camera-area">
          <video :ref="(el) => { recorder.videoEl.value = el as HTMLVideoElement | null }" autoplay muted playsinline class="camera-feed"></video>
          <div v-if="!stream && !videoPreviewUrl" class="camera-placeholder">
            <span>Kamera wird gestartet...</span>
          </div>
          <div v-if="recording" class="rec-badge">&#9679; REC</div>
        </div>

        <div v-if="!videoPreviewUrl" class="row mt-2" style="gap:0.75rem;justify-content:center">
          <button v-if="!recording" class="btn-danger btn-lg" @click="startRecording()">
            &#9679; Aufnahme starten
          </button>
          <button v-else class="btn-warning btn-lg" @click="stopRecording()">
            &#9632; Stopp
          </button>
        </div>

        <div v-if="videoPreviewUrl" class="mt-2">
          <video :src="videoPreviewUrl" controls class="preview-video"></video>
          <div class="row mt-2" style="gap:0.75rem">
            <button class="btn-ghost btn-block" @click="rerecord()">Neu aufnehmen</button>
            <button class="btn-primary btn-block" @click="step = 'form'">Video verwenden</button>
          </div>
        </div>

        <button v-if="!videoPreviewUrl && !recording" class="btn-ghost btn-block mt-2" @click="stopCamera(); step = 'form'">
          Zurück
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.required { color: #e74c3c; }
.video-section { margin-top: 0.75rem; }
.video-preview video,
.preview-video { width: 100%; max-height: 220px; object-fit: cover; border-radius: var(--radius-sm); }
.camera-area {
  position: relative;
  background: #000;
  border-radius: var(--radius-sm);
  overflow: hidden;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.camera-feed { width: 100%; max-height: 300px; object-fit: cover; display: block; }
.camera-placeholder {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); font-size: 0.85rem;
}
.rec-badge {
  position: absolute; top: 0.6rem; right: 0.75rem;
  background: rgba(231,76,60,0.9);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.5rem;
}
.variant-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  background: var(--bs-body-bg, transparent);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.variant-card:hover { border-color: var(--bs-primary, #0d6efd); }
.variant-card.active {
  border-color: var(--bs-primary, #0d6efd);
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
}
.variant-radio {
  position: absolute; top: 0.4rem; right: 0.4rem;
  margin: 0;
}
.variant-icon { flex: 0 0 60px; height: 38px; }
.variant-body { flex: 1; min-width: 0; }
.variant-title { font-weight: 600; font-size: 0.9rem; line-height: 1.2; }
.variant-meta {
  display: flex; flex-wrap: wrap; gap: 0.25rem;
  margin-top: 0.25rem;
}
.variant-meta .badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; }
.variant-foot { font-size: 0.7rem; margin-top: 0.2rem; }
.variant-desc { margin-top: 0.5rem; }
.mt-2 { margin-top: 0.75rem; }
.mt-3 { margin-top: 1.25rem; }
</style>
