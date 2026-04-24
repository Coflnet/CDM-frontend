<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../../supabase'
import { authState } from '../../store/auth'
import type { Container } from '../../supabase'

const props = defineProps<{ container: Container }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'updated'): void }>()

const fillState = ref(props.container.fill_state)
const photoBlob = ref<Blob | null>(null)
const photoPreviewUrl = ref('')
const error = ref('')
const loading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const fillColor = (v: number) => v >= 80 ? '#e74c3c' : v >= 50 ? '#e67e22' : '#27ae60'

function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  photoBlob.value = file
  photoPreviewUrl.value = URL.createObjectURL(file)
}

async function save() {
  error.value = ''
  loading.value = true
  try {
    let photoUrl = ''
    if (photoBlob.value) {
      const fileName = `fill-${props.container.id}-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('container-photos').upload(fileName, photoBlob.value, { contentType: photoBlob.value.type, upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('container-photos').getPublicUrl(fileName)
      photoUrl = data.publicUrl
    }

    const { error: updateErr } = await supabase.from('containers').update({ fill_state: fillState.value }).eq('id', props.container.id)
    if (updateErr) throw updateErr

    if (photoUrl) {
      await supabase.from('container_photos').insert({
        container_id: props.container.id,
        photo_url: photoUrl,
        fill_state: fillState.value,
        taken_by: authState.user!.id,
      })
    }
    emit('updated')
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
        <h2>Update Fill State</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <div class="form-group">
        <label>Fill Level: <strong :style="{ color: fillColor(fillState) }">{{ fillState }}%</strong></label>
        <div class="slider-wrap">
          <input type="range" v-model.number="fillState" min="0" max="100" step="5" class="fill-slider" />
          <div class="fill-bar-wrap mt-1">
            <div class="fill-bar" :style="{ width: fillState + '%', background: fillColor(fillState) }"></div>
          </div>
        </div>
        <div class="fill-labels row-between text-sm text-muted mt-1">
          <span>Empty</span><span>Half</span><span>Full</span>
        </div>
      </div>

      <div class="form-group">
        <label>Container Photo (optional)</label>
        <div v-if="photoPreviewUrl" class="photo-preview">
          <img :src="photoPreviewUrl" alt="Container photo" />
          <button class="btn-ghost btn-sm mt-1" @click="photoPreviewUrl = ''; photoBlob = null">Remove</button>
        </div>
        <div v-else class="photo-btn-wrap">
          <button class="btn-ghost btn-block" @click="fileInput?.click()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Take / Upload Photo
          </button>
          <input ref="fileInput" type="file" accept="image/*" capture="environment" style="display:none" @change="handleFile" />
        </div>
      </div>

      <div class="row mt-3" style="gap:0.75rem">
        <button class="btn-ghost btn-block" @click="emit('close')">Cancel</button>
        <button class="btn-primary btn-block" @click="save" :disabled="loading">
          {{ loading ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fill-slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 99px;
  background: var(--border-card-light);
  outline: none;
  padding: 0;
  border: none;
}
.fill-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--accent-blue);
  cursor: pointer;
  box-shadow: 0 0 0 3px rgba(58,143,212,0.25);
}
.photo-preview img {
  width: 100%;
  border-radius: var(--radius-sm);
  max-height: 200px;
  object-fit: cover;
}
.photo-btn-wrap { position: relative; }
</style>
