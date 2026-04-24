<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { supabase } from '../../supabase'
import type { Container, Site, Pickup } from '../../supabase'

const props = defineProps<{
  container: Container
  site: Site
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', pickup: Pickup): void
}>()

const scheduledAt = ref('')
const notes = ref('')
const videoBlob = ref<Blob | null>(null)
const videoUrl = ref('')
const error = ref('')
const loading = ref(false)
const step = ref<'form' | 'video'>('form')
const recording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const videoPreviewUrl = ref('')
const chunks: BlobPart[] = []
const videoEl = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)

async function checkExistingPickup() {
  const { data } = await supabase
    .from('pickups')
    .select('*')
    .eq('container_id', props.container.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (data?.driveway_video_url) {
    videoUrl.value = data.driveway_video_url
  }
}

onMounted(() => {
  checkExistingPickup()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  scheduledAt.value = tomorrow.toISOString().slice(0, 16)
})

async function startCamera() {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    await nextTick()
    if (videoEl.value) {
      videoEl.value.srcObject = stream.value
      videoEl.value.play()
    }
  } catch (e: any) {
    error.value = 'Kamerazugriff verweigert: ' + e.message
    step.value = 'form'
  }
}

async function startRecording() {
  chunks.length = 0
  const mr = new MediaRecorder(stream.value!, { mimeType: 'video/webm' })
  mediaRecorder.value = mr
  mr.ondataavailable = (e) => chunks.push(e.data)
  mr.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' })
    videoBlob.value = blob
    videoPreviewUrl.value = URL.createObjectURL(blob)
    stream.value?.getTracks().forEach(t => t.stop())
    stream.value = null
  }
  mr.start()
  recording.value = true
}

function stopRecording() {
  mediaRecorder.value?.stop()
  recording.value = false
}

async function uploadVideo(): Promise<string> {
  if (!videoBlob.value) return ''
  const fileName = `driveway-${props.site.id}-${Date.now()}.webm`
  const { error: uploadError } = await supabase.storage
    .from('driveway-videos')
    .upload(fileName, videoBlob.value, { contentType: 'video/webm', upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('driveway-videos').getPublicUrl(fileName)
  return data.publicUrl
}

async function save() {
  if (!videoUrl.value && !videoBlob.value) {
    error.value = 'Bitte nimm vor der Planung ein Einfahrtsvideo auf.'
    return
  }
  error.value = ''
  loading.value = true
  try {
    let finalVideoUrl = videoUrl.value
    if (videoBlob.value) {
      finalVideoUrl = await uploadVideo()
    }
    const { data, error: insertError } = await supabase
      .from('pickups')
      .insert({
        container_id: props.container.id,
        site_id: props.site.id,
        customer_id: props.site.customer_id,
        scheduled_at: new Date(scheduledAt.value).toISOString(),
        notes: notes.value,
        driveway_video_url: finalVideoUrl,
        status: 'pending',
      })
      .select()
      .single()
    if (insertError) throw insertError

    await supabase.from('containers').update({ status: 'scheduled_pickup', pickup_date: new Date(scheduledAt.value).toISOString().slice(0,10) })
      .eq('id', props.container.id)

    emit('saved', data)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Abholung planen</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

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
          <div v-if="videoPreviewUrl || videoUrl" class="video-preview">
            <video :src="videoPreviewUrl || videoUrl" controls></video>
            <p class="text-sm text-muted mt-1">Video aufgenommen. <a href="#" @click.prevent="videoPreviewUrl = ''; videoBlob = null; videoUrl = ''">Neu aufnehmen</a></p>
          </div>
          <div v-else>
            <p class="text-sm text-muted mb-2">Bitte nimm ein kurzes Video des Einfahrtsweges auf, damit der Fahrer deinen Standort findet.</p>
            <button class="btn-warning btn-block" @click="step = 'video'; nextTick(() => startCamera())">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h9a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z"/></svg>
              Einfahrtsvideo aufnehmen
            </button>
          </div>
        </div>

        <div class="row mt-3" style="gap:0.75rem">
          <button class="btn-ghost btn-block" @click="emit('close')">Abbrechen</button>
          <button class="btn-primary btn-block" @click="save" :disabled="loading">
            {{ loading ? 'Speichern...' : 'Abholung planen' }}
          </button>
        </div>
      </div>

      <div v-else>
        <p class="text-sm text-muted mb-2">Filme den Weg von der Straße bis zum Containerstandort. Bitte unter 60 Sekunden bleiben.</p>
        <div class="camera-area">
          <video ref="videoEl" autoplay muted playsinline class="camera-feed"></video>
          <div v-if="!stream && !videoPreviewUrl" class="camera-placeholder">
            <span>Kamera wird gestartet...</span>
          </div>
        </div>
        <div class="row mt-2" style="gap:0.75rem; justify-content: center">
          <button v-if="!recording" class="btn-danger btn-lg" @click="startRecording">
            &#9679; Aufnahme starten
          </button>
          <button v-else class="btn-warning btn-lg" @click="stopRecording">
            &#9632; Stopp
          </button>
        </div>
        <div v-if="videoPreviewUrl" class="mt-2">
          <video :src="videoPreviewUrl" controls></video>
          <div class="row mt-2" style="gap:0.75rem">
            <button class="btn-ghost btn-block" @click="videoPreviewUrl = ''; videoBlob = null; nextTick(() => startCamera())">Neu aufnehmen</button>
            <button class="btn-primary btn-block" @click="step = 'form'">Video verwenden</button>
          </div>
        </div>
        <button v-if="!videoPreviewUrl" class="btn-ghost btn-block mt-2" @click="step = 'form'; stream?.getTracks().forEach(t => t.stop()); stream = null">Zurück</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-section { margin-top: 0.75rem; }
.video-preview video { max-height: 200px; object-fit: cover; }
.camera-area { position: relative; background: #000; border-radius: var(--radius-sm); overflow: hidden; min-height: 200px; }
.camera-feed { max-height: 300px; object-fit: cover; }
.camera-placeholder {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); font-size: 0.85rem;
}
</style>
