<script setup lang="ts">
import { ref } from 'vue'
import { sitesApi } from '../../api'
import type { Site } from '../../api'

const emit = defineEmits<{ (e: 'close'): void; (e: 'created', site: Site): void }>()

const name = ref('')
const address = ref('')
const orientationNote = ref('')
const error = ref('')
const loading = ref(false)

async function save() {
  if (!name.value.trim()) { error.value = 'Standortname ist erforderlich.'; return }
  if (!address.value.trim()) { error.value = 'Adresse ist erforderlich.'; return }
  error.value = ''
  loading.value = true
  try {
    const site = await sitesApi.create({
      name: name.value.trim(),
      address: address.value.trim(),
      lat: 0,
      lon: 0,
      orientationNote: orientationNote.value.trim() || undefined,
    })
    emit('created', site)
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
        <h2>Neuen Standort hinzufügen</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <div class="form-group">
        <label>Standortname</label>
        <input v-model="name" type="text" placeholder="z. B. Baustelle Eichenweg 45" autofocus />
      </div>
      <div class="form-group">
        <label>Adresse</label>
        <input v-model="address" type="text" placeholder="Musterstraße 1, Stadt, Bundesland" />
      </div>
      <div class="form-group">
        <label>Hinweis für Fahrer (optional)</label>
        <textarea v-model="orientationNote" rows="2" placeholder="z. B. Tor auf der Nordseite, Einfahrt links..."></textarea>
      </div>

      <div class="row mt-3" style="gap:0.75rem">
        <button class="btn-ghost btn-block" @click="emit('close')">Abbrechen</button>
        <button class="btn-primary btn-block" @click="save" :disabled="loading">
          {{ loading ? 'Speichern...' : 'Standort erstellen' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mt-3 { margin-top: 1.25rem; }
</style>
