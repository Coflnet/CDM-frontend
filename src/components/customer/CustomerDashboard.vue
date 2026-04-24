<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../supabase'
import type { Container, Site, Pickup } from '../../supabase'
import { fillColor, formatDateTime, PICKUP_STATUS_LABEL, PICKUP_STATUS_BADGE } from '../../utils'
import ContainerCard from './ContainerCard.vue'
import SchedulePickupModal from './SchedulePickupModal.vue'
import UpdateFillModal from './UpdateFillModal.vue'
import OrderContainerModal from './OrderContainerModal.vue'
import CreateSiteModal from './CreateSiteModal.vue'

const sites = ref<Site[]>([])
const containers = ref<Container[]>([])
const pickups = ref<Pickup[]>([])
const loading = ref(true)

const activeTab = ref<'containers' | 'pickups' | 'sites'>('containers')
const scheduleTarget = ref<{ container: Container; site: Site } | null>(null)
const fillTarget = ref<Container | null>(null)
const showOrder = ref(false)
const showCreateSite = ref(false)

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

function siteForContainer(c: Container): Site | undefined {
  return sites.value.find(s => s.id === c.site_id)
}

function containersForSite(siteId: string): Container[] {
  return containers.value.filter(c => c.site_id === siteId && c.status !== 'picked_up')
}

function containerForPickup(p: Pickup): Container | undefined {
  return containers.value.find(c => c.id === p.container_id)
}

function pickupSoon(scheduledAt: string): boolean {
  const diff = new Date(scheduledAt).getTime() - Date.now()
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 2
}

const activeContainers = computed(() =>
  containers.value.filter(c => c.status !== 'picked_up')
)

const upcomingPickups = computed(() =>
  pickups.value
    .filter(p => p.status !== 'completed' && p.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
)
</script>

<template>
  <div>
    <div class="content-with-nav">
      <div class="page">
        <div class="dash-header row-between mb-2">
          <div>
            <h1 class="dash-greeting">Kundenportal</h1>
            <p class="text-sm text-muted">Container-Übersicht</p>
          </div>
          <button class="btn-primary btn-sm" @click="showOrder = true">+ Bestellen</button>
        </div>

        <div v-if="loading" class="spinner"></div>

        <div v-else>
          <div class="summary-chips row mb-3">
            <div class="chip">
              <span class="chip-val">{{ activeContainers.length }}</span>
              <span class="chip-label">Aktiv</span>
            </div>
            <div v-if="upcomingPickups.length" class="chip chip-warn">
              <span class="chip-val">{{ upcomingPickups.length }}</span>
              <span class="chip-label">Geplant</span>
            </div>
            <div class="chip">
              <span class="chip-val">{{ sites.length }}</span>
              <span class="chip-label">Standorte</span>
            </div>
          </div>

          <div class="tabs row mb-3">
            <button :class="['tab', { active: activeTab === 'containers' }]" @click="activeTab = 'containers'">Container</button>
            <button :class="['tab', { active: activeTab === 'pickups' }]" @click="activeTab = 'pickups'">Abholungen</button>
            <button :class="['tab', { active: activeTab === 'sites' }]" @click="activeTab = 'sites'">Standorte</button>
          </div>

          <!-- Containers tab -->
          <div v-if="activeTab === 'containers'">
            <div v-if="activeContainers.length === 0" class="empty-state">
              <div class="icon">&#128465;</div>
              <p>Keine aktiven Container.</p>
              <button class="btn-primary mt-2" @click="showOrder = true">Container bestellen</button>
            </div>
            <div v-else class="stack">
              <template v-for="c in activeContainers" :key="c.id">
                <ContainerCard
                  v-if="siteForContainer(c)"
                  :container="c"
                  :site="siteForContainer(c)!"
                  @schedule-pickup="scheduleTarget = { container: c, site: siteForContainer(c)! }"
                  @update-fill="fillTarget = c"
                  @view-detail="fillTarget = c"
                />
              </template>
            </div>
          </div>

          <!-- Pickups tab -->
          <div v-if="activeTab === 'pickups'">
            <div v-if="upcomingPickups.length === 0" class="empty-state">
              <div class="icon">&#128197;</div>
              <p>Keine geplanten Abholungen.</p>
            </div>
            <div v-else class="stack">
              <div
                v-for="p in upcomingPickups"
                :key="p.id"
                class="card"
                :class="{ 'warn-pulse': pickupSoon(p.scheduled_at) }"
              >
                <div class="row-between mb-1">
                  <div>
                    <h3>{{ containerForPickup(p)?.container_type ?? '?' }} Abholung</h3>
                    <p class="text-sm text-muted">
                      {{ siteForContainer(containerForPickup(p) ?? containers[0])?.name ?? '—' }}
                    </p>
                  </div>
                  <span class="badge" :class="PICKUP_STATUS_BADGE[p.status]">
                    {{ PICKUP_STATUS_LABEL[p.status] }}
                  </span>
                </div>
                <p class="text-sm text-muted">{{ formatDateTime(p.scheduled_at) }}</p>
                <div v-if="p.driver_eta" class="alert alert-info" style="margin-top:0.5rem">
                  Fahrer ETA: {{ formatDateTime(p.driver_eta) }}
                </div>
                <div v-if="pickupSoon(p.scheduled_at)" class="alert alert-warning" style="margin-top:0.5rem">
                  Abholung innerhalb von 48 Stunden!
                </div>
                <div v-if="p.notes" class="text-sm text-muted" style="margin-top:0.35rem">
                  Notiz: {{ p.notes }}
                </div>
              </div>
            </div>
          </div>

          <!-- Sites tab -->
          <div v-if="activeTab === 'sites'">
            <div class="row-between mb-2">
              <p class="section-title" style="margin-bottom:0">Alle Standorte</p>
              <button class="btn-primary btn-sm" @click="showCreateSite = true">+ Standort hinzufügen</button>
            </div>

            <div v-if="sites.length === 0" class="empty-state">
              <div class="icon">&#128205;</div>
              <p>Noch keine Standorte. Füge deinen ersten Standort hinzu.</p>
              <button class="btn-primary mt-2" @click="showCreateSite = true">Standort hinzufügen</button>
            </div>

            <div v-else class="stack">
              <div v-for="s in sites" :key="s.id" class="card site-card">
                <div class="row-between mb-1">
                  <div>
                    <h3>{{ s.name }}</h3>
                    <p class="text-sm text-muted">{{ s.address }}</p>
                  </div>
                  <div class="badge badge-gray">{{ containersForSite(s.id).length }} Container</div>
                </div>

                <div v-if="containersForSite(s.id).length" class="site-containers">
                  <div v-for="c in containersForSite(s.id)" :key="c.id" class="site-container-row row-between">
                    <span class="text-sm">{{ c.container_type }}</span>
                    <div class="fill-inline row" style="gap:0.5rem;flex:1;margin:0 0.75rem">
                      <div class="fill-bar-wrap" style="flex:1">
                        <div class="fill-bar" :style="{ width: c.fill_state + '%', background: fillColor(c.fill_state) }"></div>
                      </div>
                      <span class="text-sm text-muted" style="min-width:2.5rem;text-align:right">{{ c.fill_state }}%</span>
                    </div>
                    <button class="btn-primary btn-sm" @click="scheduleTarget = { container: c, site: s }">Abholen</button>
                  </div>
                </div>

                <div class="row" style="gap:0.5rem;margin-top:0.75rem">
                  <button class="btn-ghost btn-sm" @click="showOrder = true">+ Container bestellen</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <nav class="bottom-nav">
      <button class="bottom-nav-item" :class="{ active: activeTab === 'containers' }" @click="activeTab = 'containers'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg>
        Container
      </button>
      <button class="bottom-nav-item" :class="{ active: activeTab === 'pickups' }" @click="activeTab = 'pickups'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        Abholungen
      </button>
      <button class="bottom-nav-item" :class="{ active: activeTab === 'sites' }" @click="activeTab = 'sites'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        Standorte
      </button>
      <button class="bottom-nav-item" @click="showOrder = true">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Bestellen
      </button>
    </nav>

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
    <Transition name="fade">
      <CreateSiteModal
        v-if="showCreateSite"
        @close="showCreateSite = false"
        @created="showCreateSite = false; load()"
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
  padding: 0.45rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
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
.site-containers {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-top: 1px solid var(--border-card);
  padding-top: 0.75rem;
}
.site-container-row { align-items: center; }
.mt-2 { margin-top: 1rem; }
</style>
