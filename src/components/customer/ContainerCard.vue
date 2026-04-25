<script setup lang="ts">
import { computed } from 'vue'
import type { CustomerContainerView, Site } from '../../api'
import { fillColor, formatDate, BOOKING_STATUS_LABEL, BOOKING_STATUS_BADGE, WASTE_TYPE_LABEL } from '../../utils'

const props = defineProps<{
  container: CustomerContainerView
  site: Site
}>()

const emit = defineEmits<{
  (e: 'schedule-pickup'): void
  (e: 'update-fill'): void
  (e: 'view-detail'): void
}>()

const fillPct = computed(() => Math.round(props.container.fillLevel * 100))
const currentFillColor = computed(() => fillColor(fillPct.value))

const pickupSoon = computed(() => {
  if (!props.container.expectedEmptyingAt) return false
  const diff = new Date(props.container.expectedEmptyingAt).getTime() - Date.now()
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 2
})
</script>

<template>
  <div class="card container-card" :class="{ 'warn-pulse': pickupSoon }">
    <div class="row-between mb-1">
      <div>
        <h3>{{ WASTE_TYPE_LABEL[container.wasteType] }} Mulde</h3>
        <p class="text-sm text-muted">{{ site.name }}</p>
      </div>
      <span class="badge" :class="BOOKING_STATUS_BADGE[container.status]">
        {{ BOOKING_STATUS_LABEL[container.status] }}
      </span>
    </div>

    <div class="fill-row row mb-1">
      <span class="text-sm text-muted" style="min-width:32px">{{ fillPct }}%</span>
      <div class="fill-bar-wrap">
        <div class="fill-bar" :style="{ width: fillPct + '%', background: currentFillColor }"></div>
      </div>
    </div>

    <div class="meta-row row-between text-sm text-muted">
      <span v-if="container.expectedEmptyingAt" :class="{ 'text-danger': pickupSoon }">
        Leerung: {{ formatDate(container.expectedEmptyingAt) }}
        <span v-if="pickupSoon" class="badge badge-red" style="margin-left:4px">Bald</span>
      </span>
      <span v-if="container.containerNumber" class="text-sm text-muted">{{ container.containerNumber }}</span>
    </div>

    <hr class="divider" />

    <div class="card-actions">
      <button class="btn-primary btn-sm" @click="emit('schedule-pickup')">Abholung planen</button>
      <button class="btn-ghost btn-sm" @click="emit('update-fill')">Füllstand</button>
      <button class="btn-ghost btn-sm" @click="emit('view-detail')">Details</button>
    </div>
  </div>
</template>

<style scoped>
.container-card { transition: border-color 0.2s; }
.fill-row { gap: 0.6rem; }
.text-danger { color: #e74c3c; }
.card-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.card-actions button { flex: 1; min-width: 70px; text-align: center; justify-content: center; }
</style>
