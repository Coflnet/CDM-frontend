<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { supabase } from '../../supabase'
import type { Site, ContainerOrder } from '../../supabase'

const props = defineProps<{ sites: Site[] }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'ordered'): void }>()

const siteId = ref(props.sites[0]?.id ?? '')
const containerType = ref('10yd')
const quantity = ref(1)
const notes = ref('')
const error = ref('')
const loading = ref(false)
const pastOrders = ref<ContainerOrder[]>([])

// Video state
const step = ref<'form' | 'video'>('form')
const recording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const videoBlob = ref<Blob | null>(null)
const videoPreviewUrl = ref('')
const videoEl = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const chunks: BlobPart[] = []

const containerTypes = ['10yd', '15yd', '20yd', '30yd', '40yd']

onMounted(async () => {
  const { data } = await supabase
    .from('container_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)
  pastOrders.value = data ?? []
})

function reorder(order: ContainerOrder) {
  siteId.value = order.site_id
  containerType.value = order.container_type
  quantity.value = order.quantity
  notes.value = order.notes
}

async function openCamera() {
  step.value = 'video'
  await nextTick()
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    await nextTick()
    if (videoEl.value) {
      videoEl.value.srcObject = stream.value
      videoEl.value.play()
    }
  } catch (e: any) {
    error.value = 'Camera access denied: ' + (e as Error).message
    step.value = 'form'
  }
}

function startRecording() {
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

function rerecord() {
  videoPreviewUrl.value = ''
  videoBlob.value = null
  nextTick(() => openCamera())
}

function stopCamera() {
  stream.value?.getTracks().forEach(t => t.stop())
  stream.value = null
}

async function uploadVideo(siteIdVal: string): Promise<string> {
  if (!videoBlob.value) return ''
  const fileName = `driveway-${siteIdVal}-${Date.now()}.webm`
  const { error: uploadError } = await supabase.storage
    .from('driveway-videos')
    .upload(fileName, videoBlob.value, { contentType: 'video/webm', upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('driveway-videos').getPublicUrl(fileName)
  return data.publicUrl
}

async function save() {
  if (!siteId.value) { error.value = 'Please select a site.'; return }
  if (!videoBlob.value) { error.value = 'Please record a driveway video before ordering.'; return }
  error.value = ''
  loading.value = true
  try {
    const site = props.sites.find(s => s.id === siteId.value)!
    const videoUrl = await uploadVideo(siteId.value)

    // Create the order record
    const { error: orderErr } = await supabase.from('container_orders').insert({
      customer_id: site.customer_id,
      site_id: siteId.value,
      container_type: containerType.value,
      quantity: quantity.value,
      notes: notes.value,
      status: 'pending',
    })
    if (orderErr) throw orderErr

    // Create actual container rows so they appear on the containers page
    const containerInserts = Array.from({ length: quantity.value }, () => ({
      site_id: siteId.value,
      container_type: containerType.value,
      fill_state: 0,
      status: 'ordered' as const,
      driveway_video_url: videoUrl,
    }))
    const { error: containerErr } = await supabase.from('containers').insert(containerInserts)
    if (containerErr) throw containerErr

    emit('ordered')
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
        <h2>{{ step === 'video' ? 'Record Driveway Video' : 'Order New Container' }}</h2>
        <button class="modal-close" @click="stopCamera(); emit('close')">&times;</button>
      </div>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <!-- Order form -->
      <div v-if="step === 'form'">
        <div v-if="pastOrders.length" class="past-orders mb-2">
          <p class="section-title">Re-order Previous</p>
          <div class="stack">
            <div v-for="o in pastOrders" :key="o.id" class="row-between card" style="padding:0.75rem">
              <div>
                <span class="text-sm font-bold">{{ o.quantity }}x {{ o.container_type }}</span>
                <p class="text-sm text-muted">{{ sites.find(s => s.id === o.site_id)?.name ?? 'Unknown site' }}</p>
              </div>
              <button class="btn-ghost btn-sm" @click="reorder(o)">Reorder</button>
            </div>
          </div>
          <hr class="divider" />
        </div>

        <div class="form-group">
          <label>Site</label>
          <select v-model="siteId">
            <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Container Size</label>
          <select v-model="containerType">
            <option v-for="t in containerTypes" :key="t" :value="t">{{ t }} Dumpster</option>
          </select>
        </div>
        <div class="form-group">
          <label>Quantity</label>
          <input type="number" v-model.number="quantity" min="1" max="10" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea v-model="notes" rows="2" placeholder="Any special instructions..."></textarea>
        </div>

        <!-- Driveway video section -->
        <div class="video-section">
          <p class="section-title">Driveway Video <span class="required">*</span></p>
          <div v-if="videoPreviewUrl" class="video-preview">
            <video :src="videoPreviewUrl" controls></video>
            <div class="row" style="gap:0.5rem;margin-top:0.5rem">
              <button class="btn-ghost btn-sm" @click="rerecord()">Re-record</button>
              <span class="text-sm text-muted" style="align-self:center">Video ready</span>
            </div>
          </div>
          <div v-else>
            <p class="text-sm text-muted mb-2">Record a short video of the driveway path so the driver can navigate to the container location.</p>
            <button class="btn-warning btn-block" @click="openCamera()">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18" style="display:inline;vertical-align:middle;margin-right:6px"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h9a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z"/></svg>
              Record Driveway Video
            </button>
          </div>
        </div>

        <div class="row mt-3" style="gap:0.75rem">
          <button class="btn-ghost btn-block" @click="emit('close')">Cancel</button>
          <button class="btn-primary btn-block" @click="save" :disabled="loading || !videoBlob">
            {{ loading ? 'Ordering...' : 'Place Order' }}
          </button>
        </div>
      </div>

      <!-- Camera / recording view -->
      <div v-else>
        <p class="text-sm text-muted mb-2">Film the path from the street to where the container should go. Keep it under 60 seconds.</p>

        <div class="camera-area">
          <video ref="videoEl" autoplay muted playsinline class="camera-feed"></video>
          <div v-if="!stream && !videoPreviewUrl" class="camera-placeholder">
            <span>Starting camera...</span>
          </div>
          <div v-if="recording" class="rec-badge">&#9679; REC</div>
        </div>

        <div v-if="!videoPreviewUrl" class="row mt-2" style="gap:0.75rem;justify-content:center">
          <button v-if="!recording" class="btn-danger btn-lg" @click="startRecording()">
            &#9679; Start Recording
          </button>
          <button v-else class="btn-warning btn-lg" @click="stopRecording()">
            &#9632; Stop
          </button>
        </div>

        <div v-if="videoPreviewUrl" class="mt-2">
          <video :src="videoPreviewUrl" controls class="preview-video"></video>
          <div class="row mt-2" style="gap:0.75rem">
            <button class="btn-ghost btn-block" @click="rerecord()">Re-record</button>
            <button class="btn-primary btn-block" @click="step = 'form'">Use This Video</button>
          </div>
        </div>

        <button v-if="!videoPreviewUrl && !recording" class="btn-ghost btn-block mt-2" @click="stopCamera(); step = 'form'">Back</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-bold { font-weight: 700; }
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
