<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../supabase'
import type { Container, Site, Pickup } from '../../supabase'
import { fillColor, formatDate, formatDateTime, CONTAINER_STATUS_LABEL, CONTAINER_STATUS_BADGE, PICKUP_STATUS_LABEL, PICKUP_STATUS_BADGE } from '../../utils'

const props = defineProps<{ container: Container; site: Site }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'schedule-pickup'): void
  (e: 'update-fill'): void
}>()

const pickups = ref<Pickup[]>([])
const loading = ref(true)

onMounted(async () => {
  const { data } = await supabase
    .from('pickups')
    .select('*')
    .eq('container_id', props.container.id)
    .order('scheduled_at', { ascending: false })
    .limit(5)
  pickups.value = data ?? []
  loading.value = false
})

const currentFillColor = computed(() => fillColor(props.container.fill_state))

const pendingPickup = computed(() =>
  pickups.value.find(p => p.status === 'pending' || p.status === 'driver_en_route')
)
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal-detail">
      <div class="modal-header">
        <h2>{{ container.container_type }} Mulde</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <!-- Status + site -->
      <div class="detail-hero">
        <div class="row-between mb-2">
          <div>
            <p class="detail-site">{{ site.name }}</p>
            <p class="text-sm text-muted">{{ site.address }}</p>
          </div>
          <span class="badge" :class="CONTAINER_STATUS_BADGE[container.status]">
            {{ CONTAINER_STATUS_LABEL[container.status] }}
          </span>
        </div>

        <!-- Fill state -->
        <div class="fill-section">
          <div class="row-between mb-1">
            <span class="text-sm text-muted">Füllstand</span>
            <span class="fill-pct" :style="{ color: currentFillColor }">{{ container.fill_state }}%</span>
          </div>
          <div class="fill-bar-wrap fill-bar-lg">
            <div class="fill-bar" :style="{ width: container.fill_state + '%', background: currentFillColor, transition: 'width 0.4s ease' }"></div>
          </div>
          <div class="fill-labels row-between text-sm text-muted" style="margin-top:0.25rem">
            <span>Leer</span><span>Halb</span><span>Voll</span>
          </div>
        </div>
      </div>

      <!-- Meta grid -->
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Containertyp</span>
          <span class="meta-val">{{ container.container_type }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Geliefert am</span>
          <span class="meta-val">{{ formatDate(container.delivered_at) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Geplante Abholung</span>
          <span class="meta-val" :class="{ 'text-danger': container.pickup_date && (new Date(container.pickup_date).getTime() - Date.now()) < 1000*60*60*48 }">
            {{ formatDate(container.pickup_date) }}
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Standort</span>
          <span class="meta-val">{{ site.name }}</span>
        </div>
      </div>

      <!-- Active pickup alert -->
      <div v-if="pendingPickup" class="alert alert-info" style="margin-bottom:0.75rem">
        <strong>Abholung geplant:</strong> {{ formatDateTime(pendingPickup.scheduled_at) }}
        <span class="badge" :class="PICKUP_STATUS_BADGE[pendingPickup.status]" style="margin-left:0.5rem">
          {{ PICKUP_STATUS_LABEL[pendingPickup.status] }}
        </span>
        <div v-if="pendingPickup.driver_eta" class="text-sm" style="margin-top:0.25rem">
          Fahrer ETA: {{ formatDateTime(pendingPickup.driver_eta) }}
        </div>
      </div>

      <!-- Driveway video -->
      <div v-if="container.driveway_video_url" class="video-section">
        <p class="section-title">Einfahrtsvideo</p>
        <video :src="container.driveway_video_url" controls class="driveway-video"></video>
      </div>

      <!-- Pickup history -->
      <div class="history-section">
        <p class="section-title">Abholungsverlauf</p>
        <div v-if="loading" class="spinner-sm"></div>
        <div v-else-if="pickups.length === 0" class="text-sm text-muted">Keine Abholungen bisher.</div>
        <div v-else class="pickup-list">
          <div v-for="p in pickups" :key="p.id" class="pickup-row row-between">
            <div>
              <p class="text-sm">{{ formatDateTime(p.scheduled_at) }}</p>
              <p v-if="p.notes" class="text-sm text-muted">{{ p.notes }}</p>
            </div>
            <span class="badge" :class="PICKUP_STATUS_BADGE[p.status]">{{ PICKUP_STATUS_LABEL[p.status] }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="row" style="gap:0.75rem;margin-top:1rem">
        <button class="btn-ghost btn-block" @click="emit('update-fill')">Füllstand aktualisieren</button>
        <button class="btn-primary btn-block" @click="emit('schedule-pickup')">Abholung planen</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-detail { max-height: 90vh; overflow-y: auto; }
.detail-hero {
  background: #181818;
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 1rem;
}
.detail-site { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
.fill-section { margin-top: 0.75rem; }
.fill-bar-lg { height: 10px; }
.fill-pct { font-size: 1.1rem; font-weight: 700; }
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem 1rem;
  margin-bottom: 1rem;
}
.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.meta-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; }
.meta-val { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); }
.text-danger { color: #e74c3c; }
.video-section { margin-bottom: 1rem; }
.driveway-video { width: 100%; max-height: 200px; object-fit: cover; border-radius: var(--radius-sm); }
.history-section { margin-bottom: 0.5rem; }
.pickup-list { display: flex; flex-direction: column; gap: 0.5rem; }
.pickup-row {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-card);
  align-items: center;
}
.pickup-row:last-child { border-bottom: none; }
.spinner-sm {
  width: 20px; height: 20px;
  border: 2px solid var(--border-card);
  border-top-color: var(--accent-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin: 0.5rem 0;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
