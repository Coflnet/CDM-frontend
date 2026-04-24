<script setup lang="ts">
import { computed } from 'vue'
import type { Container, Site } from '../../supabase'

const props = defineProps<{
  container: Container
  site: Site
}>()

const emit = defineEmits<{
  (e: 'schedule-pickup'): void
  (e: 'update-fill'): void
  (e: 'view-detail'): void
}>()

const fillColor = computed(() => {
  const f = props.container.fill_state
  if (f >= 80) return '#e74c3c'
  if (f >= 50) return '#e67e22'
  return '#27ae60'
})

const pickupSoon = computed(() => {
  if (!props.container.pickup_date) return false
  const diff = new Date(props.container.pickup_date).getTime() - Date.now()
  return diff < 1000 * 60 * 60 * 24 * 2 // within 48h
})

const statusLabel: Record<string, string> = {
  active: 'Active',
  scheduled_pickup: 'Pickup Scheduled',
  picked_up: 'Picked Up',
  ordered: 'Ordered',
}
const statusBadge: Record<string, string> = {
  active: 'badge-green',
  scheduled_pickup: 'badge-blue',
  picked_up: 'badge-gray',
  ordered: 'badge-orange',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="card container-card" :class="{ 'warn-pulse': pickupSoon }">
    <div class="row-between mb-1">
      <div>
        <h3>{{ container.container_type }} Dumpster</h3>
        <p class="text-sm text-muted">{{ site.name }}</p>
      </div>
      <span class="badge" :class="statusBadge[container.status]">{{ statusLabel[container.status] }}</span>
    </div>

    <div class="fill-row row mb-1">
      <span class="text-sm text-muted" style="min-width:32px">{{ container.fill_state }}%</span>
      <div class="fill-bar-wrap">
        <div class="fill-bar" :style="{ width: container.fill_state + '%', background: fillColor }"></div>
      </div>
    </div>

    <div class="meta-row row-between text-sm text-muted">
      <span>Delivered {{ formatDate(container.delivered_at) }}</span>
      <span v-if="container.pickup_date" :class="{ 'text-danger': pickupSoon }">
        Pickup: {{ formatDate(container.pickup_date) }}
        <span v-if="pickupSoon" class="badge badge-red" style="margin-left:4px">Soon</span>
      </span>
    </div>

    <hr class="divider" />

    <div class="row" style="gap:0.5rem;flex-wrap:wrap">
      <button class="btn-primary btn-sm" @click="emit('schedule-pickup')">Schedule Pickup</button>
      <button class="btn-ghost btn-sm" @click="emit('update-fill')">Update Fill</button>
      <button class="btn-ghost btn-sm" @click="emit('view-detail')">Details</button>
    </div>
  </div>
</template>

<style scoped>
.container-card { transition: border-color 0.2s; }
.fill-row { gap: 0.6rem; }
</style>
