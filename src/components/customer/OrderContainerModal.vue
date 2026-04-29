<script setup lang="ts">
import { ref } from 'vue'
import { sitesApi } from '../../api'
import type { Site, WasteType } from '../../api'
import { useVideoRecorder } from '../../composables/useVideoRecorder'
import { WASTE_TYPE_LABEL } from '../../utils'
import { useBodyLock } from '../../composables/useBodyLock'
useBodyLock()

const props = defineProps<{ sites: Site[] }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'ordered'): void }>()

const NEW_SITE_ID = '__new'
const siteId = ref(props.sites[0]?.siteId ?? NEW_SITE_ID)
const wasteType = ref<WasteType>('Mixed')
const notes = ref('')
const preferredDate = ref('')
const newSiteName = ref('')
const newSiteAddress = ref('')
const newSiteZip = ref('')
const error = ref('')
const loading = ref(false)

const wasteTypes: WasteType[] = ['Mixed', 'Wood', 'Metal', 'Concrete', 'Paper', 'Plastic', 'Organic', 'Electronics']

const recorder = useVideoRecorder()
const { step, recording, videoBlob, videoPreviewUrl, stream } = recorder
const { openCamera, startRecording, stopRecording, stopCamera, rerecord } = recorder

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
      notes: notes.value || undefined,
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
          <label>Gewünschtes Lieferdatum (optional)</label>
          <input type="datetime-local" v-model="preferredDate" />
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
.mt-2 { margin-top: 0.75rem; }
.mt-3 { margin-top: 1.25rem; }
</style>
