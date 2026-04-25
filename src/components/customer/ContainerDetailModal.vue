<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { sitesApi } from '../../api'
import type { CustomerContainerView, Site, Anfahrt } from '../../api'
import { fillColor, formatDate, BOOKING_STATUS_LABEL, BOOKING_STATUS_BADGE, WASTE_TYPE_LABEL } from '../../utils'
import { useBodyLock } from '../../composables/useBodyLock'
useBodyLock()

const props = defineProps<{ container: CustomerContainerView; site: Site }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'schedule-pickup'): void
  (e: 'update-fill'): void
}>()

const anfahrten = ref<Anfahrt[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    anfahrten.value = await sitesApi.listAnfahrten(props.site.siteId)
  } catch {
    // no anfahrten available
  } finally {
    loading.value = false
  }
})

const fillPct = computed(() => Math.round(props.container.fillLevel * 100))
const currentFillColor = computed(() => fillColor(fillPct.value))

const latestAnfahrt = computed(() => anfahrten.value[0] ?? null)
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal-detail">
      <div class="modal-header">
        <h2>{{ WASTE_TYPE_LABEL[container.wasteType] }} Mulde</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <!-- Status + site -->
      <div class="detail-hero">
        <div class="row-between mb-2">
          <div>
            <p class="detail-site">{{ site.name }}</p>
            <p class="text-sm text-muted">{{ site.address }}</p>
          </div>
          <span class="badge" :class="BOOKING_STATUS_BADGE[container.status]">
            {{ BOOKING_STATUS_LABEL[container.status] }}
          </span>
        </div>

        <!-- Fill state -->
        <div class="fill-section">
          <div class="row-between mb-1">
            <span class="text-sm text-muted">Füllstand</span>
            <span class="fill-pct" :style="{ color: currentFillColor }">{{ fillPct }}%</span>
          </div>
          <div class="fill-bar-wrap fill-bar-lg">
            <div class="fill-bar" :style="{ width: fillPct + '%', background: currentFillColor, transition: 'width 0.4s ease' }"></div>
          </div>
          <div class="fill-labels row-between text-sm text-muted" style="margin-top:0.25rem">
            <span>Leer</span><span>Halb</span><span>Voll</span>
          </div>
        </div>
      </div>

      <!-- Meta grid -->
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Abfalltyp</span>
          <span class="meta-val">{{ WASTE_TYPE_LABEL[container.wasteType] }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Containernummer</span>
          <span class="meta-val">{{ container.containerNumber ?? '—' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Geplante Leerung</span>
          <span class="meta-val" :class="{ 'text-danger': container.expectedEmptyingAt && (new Date(container.expectedEmptyingAt).getTime() - Date.now()) < 1000*60*60*48 }">
            {{ formatDate(container.expectedEmptyingAt) }}
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Standort</span>
          <span class="meta-val">{{ site.name }}</span>
        </div>
      </div>

      <!-- Orientation note -->
      <div v-if="site.orientationNote" class="alert alert-info" style="margin-bottom:0.75rem">
        <strong>Hinweis:</strong> {{ site.orientationNote }}
      </div>

      <!-- Anfahrt video -->
      <div v-if="loading" class="spinner-sm"></div>
      <div v-else-if="latestAnfahrt" class="video-section">
        <p class="section-title">Einfahrtsvideo</p>
        <video
          :src="sitesApi.videoUrl(site.siteId, latestAnfahrt.anfahrtId)"
          controls
          class="driveway-video"
        ></video>
        <p v-if="latestAnfahrt.orientationNote" class="text-sm text-muted" style="margin-top:0.35rem">{{ latestAnfahrt.orientationNote }}</p>
      </div>

      <!-- Actions -->
      <div class="action-row">
        <button class="btn-ghost btn-block" @click="emit('update-fill')">Füllstand aktualisieren</button>
        <button class="btn-primary btn-block" @click="emit('schedule-pickup')">Abholung planen</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-detail { }
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
.spinner-sm {
  width: 20px; height: 20px;
  border: 2px solid var(--border-card);
  border-top-color: var(--accent-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin: 0.5rem 0;
}
@keyframes spin { to { transform: rotate(360deg); } }
.action-row {
  display: flex;
  gap: 0.6rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}
.action-row .btn-block { flex: 1; min-width: 120px; }
</style>
