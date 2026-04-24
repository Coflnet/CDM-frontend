<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../supabase'
import type { Container, Site, Pickup } from '../../supabase'
import ContainerCard from './ContainerCard.vue'
import SchedulePickupModal from './SchedulePickupModal.vue'
import UpdateFillModal from './UpdateFillModal.vue'
import OrderContainerModal from './OrderContainerModal.vue'

const sites = ref<Site[]>([])
const containers = ref<Container[]>([])
const pickups = ref<Pickup[]>([])
const loading = ref(true)

const activeTab = ref<'containers' | 'pickups' | 'order'>('containers')

const scheduleTarget = ref<{ container: Container; site: Site } | null>(null)
const fillTarget = ref<Container | null>(null)
const showOrder = ref(false)

async function load() {
  loading.value = true
  const [sitesRes, containersRes, pickupsRes] = await Promise.all([
    supabase.from('sites').select('*').order('created_at'),
    supabase.from('containers').select('*').order('created_at'),
    supabase.from('pickups').select('*').order('scheduled_at'),
  ])
  sites.value = sitesRes.data ?? []
  containers.value = containersRes.data ?? []
  pickups.value = pickupsRes.data ?? []
  loading.value = false
}

onMounted(load)

function siteForContainer(c: Container) {
  return sites.value.find(s => s.id === c.site_id) ?? ({ name: 'Unknown', id: '', address: '', customer_id: '', lat: null, lng: null, created_at: '' } as Site)
}

const activeContainers = computed(() => containers.value.filter(c => c.status !== 'picked_up'))
const upcomingPickups = computed(() => pickups.value.filter(p => p.status !== 'completed' && p.status !== 'cancelled').sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()))

function pickupStatusLabel(s: string) {
  const m: Record<string, string> = { pending: 'Pending', driver_en_route: 'Driver En Route', completed: 'Completed', cancelled: 'Cancelled' }
  return m[s] ?? s
}
function pickupStatusBadge(s: string) {
  const m: Record<string, string> = { pending: 'badge-gray', driver_en_route: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' }
  return m[s] ?? 'badge-gray'
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function pickupSoon(d: string) {
  const diff = new Date(d).getTime() - Date.now()
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 2
}

function containerForPickup(p: Pickup) {
  return containers.value.find(c => c.id === p.container_id)
}
</script>

<template>
  <div>
    <div class="content-with-nav">
      <div class="page">
        <div class="dash-header row-between mb-2">
          <div>
            <h1 class="dash-greeting">Customer Portal</h1>
            <p class="text-sm text-muted">Container overview</p>
          </div>
          <button class="btn-primary btn-sm" @click="showOrder = true">+ Order</button>
        </div>

        <div v-if="loading" class="spinner"></div>

        <div v-else>
          <!-- Summary chips -->
          <div class="summary-chips row mb-3">
            <div class="chip">
              <span class="chip-val">{{ activeContainers.length }}</span>
              <span class="chip-label">Active</span>
            </div>
            <div class="chip chip-warn" v-if="upcomingPickups.length">
              <span class="chip-val">{{ upcomingPickups.length }}</span>
              <span class="chip-label">Scheduled</span>
            </div>
            <div class="chip">
              <span class="chip-val">{{ sites.length }}</span>
              <span class="chip-label">Sites</span>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs row mb-3">
            <button :class="['tab', { active: activeTab === 'containers' }]" @click="activeTab = 'containers'">Containers</button>
            <button :class="['tab', { active: activeTab === 'pickups' }]" @click="activeTab = 'pickups'">Pickups</button>
          </div>

          <!-- Containers tab -->
          <div v-if="activeTab === 'containers'">
            <div v-if="activeContainers.length === 0" class="empty-state">
              <div class="icon">🗑️</div>
              <p>No active containers. Order one below.</p>
              <button class="btn-primary mt-2" @click="showOrder = true">Order Container</button>
            </div>
            <div v-else class="stack">
              <ContainerCard
                v-for="c in activeContainers"
                :key="c.id"
                :container="c"
                :site="siteForContainer(c)"
                @schedule-pickup="scheduleTarget = { container: c, site: siteForContainer(c) }"
                @update-fill="fillTarget = c"
                @view-detail="fillTarget = c"
              />
            </div>
          </div>

          <!-- Pickups tab -->
          <div v-if="activeTab === 'pickups'">
            <div v-if="upcomingPickups.length === 0" class="empty-state">
              <div class="icon">📅</div>
              <p>No scheduled pickups.</p>
            </div>
            <div v-else class="stack">
              <div v-for="p in upcomingPickups" :key="p.id" class="card" :class="{ 'warn-pulse': pickupSoon(p.scheduled_at) }">
                <div class="row-between mb-1">
                  <div>
                    <h3>{{ containerForPickup(p)?.container_type ?? '?' }} Pickup</h3>
                    <p class="text-sm text-muted">{{ siteForContainer(containerForPickup(p)!).name }}</p>
                  </div>
                  <span class="badge" :class="pickupStatusBadge(p.status)">{{ pickupStatusLabel(p.status) }}</span>
                </div>
                <p class="text-sm text-muted">{{ formatDateTime(p.scheduled_at) }}</p>
                <div v-if="p.driver_eta" class="alert alert-info mt-2">
                  Driver ETA: {{ formatDateTime(p.driver_eta) }}
                </div>
                <div v-if="pickupSoon(p.scheduled_at)" class="alert alert-warning mt-2">
                  Pickup is within 48 hours!
                </div>
                <div v-if="p.notes" class="text-sm text-muted mt-1">Note: {{ p.notes }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom nav -->
    <nav class="bottom-nav">
      <button class="bottom-nav-item" :class="{ active: activeTab === 'containers' }" @click="activeTab = 'containers'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg>
        Containers
      </button>
      <button class="bottom-nav-item" :class="{ active: activeTab === 'pickups' }" @click="activeTab = 'pickups'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        Pickups
      </button>
      <button class="bottom-nav-item" @click="showOrder = true">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Order
      </button>
    </nav>

    <!-- Modals -->
    <Transition name="fade">
      <SchedulePickupModal
        v-if="scheduleTarget"
        :container="scheduleTarget.container"
        :site="scheduleTarget.site"
        @close="scheduleTarget = null"
        @saved="scheduleTarget = null; load()"
      />
    </Transition>
    <Transition name="fade">
      <UpdateFillModal
        v-if="fillTarget"
        :container="fillTarget"
        @close="fillTarget = null"
        @updated="fillTarget = null; load()"
      />
    </Transition>
    <Transition name="fade">
      <OrderContainerModal
        v-if="showOrder"
        :sites="sites"
        @close="showOrder = false"
        @ordered="showOrder = false; load()"
      />
    </Transition>
  </div>
</template>

<style scoped>
.dash-greeting { font-size: 1.5rem; }
.summary-chips { gap: 0.75rem; flex-wrap: wrap; }
.chip {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;
}
.chip-warn { border-color: rgba(230,126,34,0.4); }
.chip-val { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
.chip-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 600; }
.tabs { gap: 0.5rem; background: #181818; border-radius: var(--radius-sm); padding: 0.3rem; }
.tab {
  flex: 1;
  padding: 0.45rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.tab.active {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-card);
}
.mt-2 { margin-top: 1rem; }
</style>
