<script setup lang="ts">
import { ref, computed } from 'vue'
import { containersApi } from '../../api'
import type { CustomerContainerView } from '../../api'
import { fillColor, WASTE_TYPE_LABEL } from '../../utils'
import { useBodyLock } from '../../composables/useBodyLock'
useBodyLock()

const props = defineProps<{ container: CustomerContainerView }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'updated'): void }>()

const fillState = ref(Math.round(props.container.fillLevel * 100))
const note = ref('')
const error = ref('')
const loading = ref(false)

const fillColorVal = computed(() => fillColor(fillState.value))

async function save() {
  error.value = ''
  loading.value = true
  try {
    await containersApi.updateFill(props.container.bookingId, fillState.value / 100, note.value || undefined)
    emit('updated')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Unbekannter Fehler'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Füllstand aktualisieren</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <p class="text-sm text-muted mb-2">{{ WASTE_TYPE_LABEL[container.wasteType] }}</p>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <div class="form-group">
        <label>
          Füllstand: <strong :style="{ color: fillColorVal }">{{ fillState }}%</strong>
        </label>
        <div class="slider-wrap">
          <input type="range" v-model.number="fillState" min="0" max="100" step="5" class="fill-slider" />
          <div class="fill-bar-wrap mt-1">
            <div class="fill-bar" :style="{ width: fillState + '%', background: fillColorVal }"></div>
          </div>
        </div>
        <div class="fill-labels row-between text-sm text-muted mt-1">
          <span>Leer</span><span>Halb</span><span>Voll</span>
        </div>
      </div>

      <div class="form-group">
        <label>Notiz (optional)</label>
        <input v-model="note" type="text" placeholder="Kurze Anmerkung..." />
      </div>

      <div class="row mt-3" style="gap:0.75rem">
        <button class="btn-ghost btn-block" @click="emit('close')">Abbrechen</button>
        <button class="btn-primary btn-block" @click="save" :disabled="loading">
          {{ loading ? 'Speichern...' : 'Speichern' }}
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
.mt-1 { margin-top: 0.4rem; }
.mt-3 { margin-top: 1.25rem; }
</style>
