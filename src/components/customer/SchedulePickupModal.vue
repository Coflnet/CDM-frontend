<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../../supabase'
import type { Container, Site, Pickup } from '../../supabase'
import { useVideoRecorder } from '../../composables/useVideoRecorder'

const props = defineProps<{ container: Container; site: Site }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved', pickup: Pickup): void }>()

const scheduledAt = ref('')
const notes = ref('')
const existingVideoUrl = ref('')
const error = ref('')
const loading = ref(false)

const recorder = useVideoRecorder('driveway-videos')
const { step, recording, videoBlob, videoPreviewUrl, stream } = recorder
const { openCamera, startRecording, stopRecording, stopCamera, rerecord, uploadVideo } = recorder

onMounted(async () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  scheduledAt.value = tomorrow.toISOString().slice(0, 16)

  const { data } = await supabase
    .from('pickups')
    .select('driveway_video_url')
    .eq('container_id', props.container.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (data?.driveway_video_url) {
    existingVideoUrl.value = data.driveway_video_url
  }
})

async function save() {
  const hasVideo = videoBlob.value || existingVideoUrl.value
  if (!hasVideo) {
    error.value = 'Bitte nimm vor der Planung ein Einfahrtsvideo auf.'
    return
  }
  error.value = ''
  loading.value = true
  try {
    const videoUrl = videoBlob.value
      ? await uploadVideo(`driveway-${props.site.id}`)
      : existingVideoUrl.value

    const { data, error: insertError } = await supabase
      .from('pickups')
      .insert({
        container_id: props.container.id,
        site_id: props.site.id,
        customer_id: props.site.customer_id,
        scheduled_at: new Date(scheduledAt.value).toISOString(),
        notes: notes.value || null,
        driveway_video_url: videoUrl,
        status: 'pending',
      })
      .select()
      .single()
    if (insertError) throw insertError

    await supabase
      .from('containers')
      .update({
        status: 'scheduled_pickup',
        pickup_date: new Date(scheduledAt.value).toISOString().slice(0, 10),
      })
      .eq('id', props.container.id)

    emit('saved', data)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Unbekannter Fehler'
  } finally {
    loading.value = false
  }
}

function clearExistingVideo() {
  existingVideoUrl.value = ''
}
</script>

<template>
  <div class="modal-overlay" @click.self="stopCamera(); emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Abholung planen</h2>
        <button class="modal-close" @click="stopCamera(); emit('close')">&times;</button>
      </div>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <!-- Form view -->
      <div v-if="step === 'form'">
        <div class="form-group">
          <label>Datum &amp; Uhrzeit der Abholung</label>
          <input type="datetime-local" v-model="scheduledAt" />
        </div>
        <div class="form-group">
          <label>Hinweise für den Fahrer</label>
          <textarea v-model="notes" rows="2" placeholder="Zugangsinformationen..."></textarea>
        </div>

        <div class="video-section">
          <p class="section-title">Einfahrtsvideo</p>
          <div v-if="videoPreviewUrl || existingVideoUrl" class="video-preview">
            <video :src="videoPreviewUrl || existingVideoUrl" controls></video>
            <p class="text-sm text-muted mt-1">
              Video aufgenommen.
              <a href="#" @click.prevent="videoPreviewUrl ? rerecord() : clearExistingVideo()">Neu aufnehmen</a>
            </p>
          </div>
          <div v-else>
            <p class="text-sm text-muted mb-2">
              Bitte nimm ein kurzes Video des Einfahrtsweges auf, damit der Fahrer deinen Standort findet.
            </p>
            <button class="btn-warning btn-block" @click="openCamera()">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h9a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z"/>
              </svg>
              Einfahrtsvideo aufnehmen
            </button>
          </div>
        </div>

        <div class="row mt-3" style="gap:0.75rem">
          <button class="btn-ghost btn-block" @click="stopCamera(); emit('close')">Abbrechen</button>
          <button class="btn-primary btn-block" @click="save" :disabled="loading">
            {{ loading ? 'Speichern...' : 'Abholung planen' }}
          </button>
        </div>
      </div>

      <!-- Camera view -->
      <div v-else>
        <p class="text-sm text-muted mb-2">
          Filme den Weg von der Straße bis zum Containerstandort. Bitte unter 60 Sekunden bleiben.
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
