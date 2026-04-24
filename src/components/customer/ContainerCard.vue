<script setup lang="ts">
import { computed } from 'vue'
import type { Container, Site } from '../../supabase'
import { fillColor, formatDate, CONTAINER_STATUS_LABEL, CONTAINER_STATUS_BADGE } from '../../utils'

const props = defineProps<{
  container: Container
  site: Site
}>()

const emit = defineEmits<{
  (e: 'schedule-pickup'): void
  (e: 'update-fill'): void
  (e: 'view-detail'): void
}>()

const currentFillColor = computed(() => fillColor(props.container.fill_state))

const pickupSoon = computed(() => {
  if (!props.container.pickup_date) return false
  const diff = new Date(props.container.pickup_date).getTime() - Date.now()
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 2
})
</script>

<template>
  <div class="card container-card" :class="{ 'warn-pulse': pickupSoon }">
    <div class="row-between mb-1">
      <div>
        <h3>{{ container.container_type }} Mulde</h3>
        <p class="text-sm text-muted">{{ site.name }}</p>
      </div>
      <span class="badge" :class="CONTAINER_STATUS_BADGE[container.status]">
        {{ CONTAINER_STATUS_LABEL[container.status] }}
      </span>
    </div>

    <div class="fill-row row mb-1">
      <span class="text-sm text-muted" style="min-width:32px">{{ container.fill_state }}%</span>
      <div class="fill-bar-wrap">
        <div class="fill-bar" :style="{ width: container.fill_state + '%', background: currentFillColor }"></div>
      </div>
    </div>

    <div class="meta-row row-between text-sm text-muted">
      <span>Geliefert {{ formatDate(container.delivered_at) }}</span>
      <span v-if="container.pickup_date" :class="{ 'text-danger': pickupSoon }">
        Abholung: {{ formatDate(container.pickup_date) }}
        <span v-if="pickupSoon" class="badge badge-red" style="margin-left:4px">Bald</span>
      </span>
    </div>

    <hr class="divider" />

    <div class="row" style="gap:0.5rem;flex-wrap:wrap">
      <button class="btn-primary btn-sm" @click="emit('schedule-pickup')">Abholung planen</button>
      <button class="btn-ghost btn-sm" @click="emit('update-fill')">Füllstand</button>
      <button class="btn-ghost btn-sm" @click="emit('view-detail')">Details</button>
    </div>
  </div>
</template>

<style scoped>
.container-card { transition: border-color 0.2s; }
.fill-row { gap: 0.6rem; }
</style>
