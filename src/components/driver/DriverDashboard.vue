<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../supabase'
import type { Pickup, Site, Container, PickupStatus } from '../../supabase'
import { formatDateTime, PICKUP_STATUS_LABEL, PICKUP_STATUS_BADGE, fillColor } from '../../utils'
import DrivewayVideoModal from './DrivewaVideoModal.vue'

interface EnrichedPickup extends Pickup {
  site: Site
  container: Container
  customerName: string
}

const pickups = ref<EnrichedPickup[]>([])
const loading = ref(true)
const activeTab = ref<'queue' | 'all'>('queue')
const videoModal = ref<{ url: string; siteName: string } | null>(null)
const etaPickupId = ref<string | null>(null)
const etaValue = ref('')
const etaLoading = ref(false)

async function load() {
  loading.value = true
  const { data: pickupData } = await supabase
    .from('pickups')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (!pickupData) { loading.value = false; return }

  const siteIds = [...new Set(pickupData.map(p => p.site_id))]
  const containerIds = [...new Set(pickupData.map(p => p.container_id))]
  const customerIds = [...new Set(pickupData.map(p => p.customer_id))]

  const [sitesRes, containersRes, profilesRes] = await Promise.all([
    supabase.from('sites').select('*').in('id', siteIds),
    supabase.from('containers').select('*').in('id', containerIds),
    supabase.from('profiles').select('id, full_name').in('id', customerIds),
  ])

  const sitesMap = Object.fromEntries((sitesRes.data ?? []).map(s => [s.id, s as Site]))
  const containersMap = Object.fromEntries((containersRes.data ?? []).map(c => [c.id, c as Container]))
  const profilesMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p.full_name as string]))

  pickups.value = pickupData
    .map(p => ({
      ...p,
      site: sitesMap[p.site_id],
      container: containersMap[p.container_id],
      customerName: profilesMap[p.customer_id] ?? 'Unbekannt',
    }))
    .filter((p): p is EnrichedPickup => Boolean(p.site && p.container))

  loading.value = false
}

onMounted(load)

const queuePickups = computed(() =>
  pickups.value
    .filter(p => p.status === 'pending' || p.status === 'driver_en_route')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
)

const allPickups = computed(() =>
  [...pickups.value].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
)

function pickupStatusLabel(s: PickupStatus): string {
  return PICKUP_STATUS_LABEL[s] ?? s
}

function pickupStatusBadge(s: PickupStatus): string {
  return PICKUP_STATUS_BADGE[s] ?? 'badge-gray'
}

function openMaps(p: EnrichedPickup): void {
  const query = p.site.address || (p.site.lat && p.site.lng ? `${p.site.lat},${p.site.lng}` : '')
  if (!query) return
  window.open(`https://maps.google.com/?q=${encodeURIComponent(query)}`, '_blank')
}

async function startDriving(p: EnrichedPickup): Promise<void> {
  const now = new Date()
  const eta = new Date(now.getTime() + 30 * 60 * 1000)
  await supabase.from('pickups').update({
    status: 'driver_en_route',
    driver_started_at: now.toISOString(),
    driver_eta: eta.toISOString(),
  }).eq('id', p.id)
  load()
}

async function markComplete(p: EnrichedPickup): Promise<void> {
  await supabase.from('pickups').update({ status: 'completed' }).eq('id', p.id)
  await supabase.from('containers').update({ status: 'picked_up' }).eq('id', p.container_id)
  load()
}

async function saveEta(): Promise<void> {
  if (!etaPickupId.value || !etaValue.value) return
  etaLoading.value = true
  await supabase
    .from('pickups')
    .update({ driver_eta: new Date(etaValue.value).toISOString() })
    .eq('id', etaPickupId.value)
  etaPickupId.value = null
  etaLoading.value = false
  load()
}

function startEditEta(p: EnrichedPickup): void {
  etaPickupId.value = p.id
  etaValue.value = new Date(p.driver_eta!).toISOString().slice(0, 16)
}
</script>

<template>
  <div>
    <div class="content-with-nav">
      <div class="page">
        <div class="row-between mb-3">
          <div>
            <h1>Fahrerwarteschlange</h1>
            <p class="text-sm text-muted">Fahrer</p>
          </div>
          <div class="stat-chip">
            <span class="chip-val">{{ queuePickups.length }}</span>
            <span class="chip-label">Ausstehend</span>
          </div>
        </div>

        <div v-if="loading" class="spinner"></div>

        <div v-else>
          <div class="tabs row mb-3">
            <button :class="['tab', { active: activeTab === 'queue' }]" @click="activeTab = 'queue'">Meine Aufträge</button>
            <button :class="['tab', { active: activeTab === 'all' }]" @click="activeTab = 'all'">Alle Abholungen</button>
          </div>

          <div v-if="activeTab === 'queue'">
            <div v-if="queuePickups.length === 0" class="empty-state">
              <div class="icon">&#10003;</div>
              <p>Warteschlange leer. Keine ausstehenden Abholungen.</p>
            </div>
            <div v-else class="stack">
              <div v-for="p in queuePickups" :key="p.id" class="card pickup-card">
                <div class="row-between mb-1">
                  <div>
                    <h3>{{ p.container.container_type }} — {{ p.site.name }}</h3>
                    <p class="text-sm text-muted">{{ p.customerName }}</p>
                  </div>
                  <span class="badge" :class="pickupStatusBadge(p.status)">{{ pickupStatusLabel(p.status) }}</span>
                </div>

                <p class="text-sm text-muted mb-1">{{ formatDateTime(p.scheduled_at) }}</p>

                <div class="fill-row row mb-2">
                  <span class="text-sm text-muted" style="min-width:32px">{{ p.container.fill_state }}%</span>
                  <div class="fill-bar-wrap">
                    <div class="fill-bar" :style="{ width: p.container.fill_state + '%', background: fillColor(p.container.fill_state) }"></div>
                  </div>
                </div>

                <p class="text-sm text-muted mb-2">{{ p.site.address }}</p>

                <div v-if="p.notes" class="alert alert-info mb-2" style="padding:0.5rem 0.75rem;font-size:0.82rem">
                  {{ p.notes }}
                </div>

                <div v-if="p.driver_eta" class="alert alert-warning mb-2" style="padding:0.5rem 0.75rem;font-size:0.82rem">
                  ETA: {{ formatDateTime(p.driver_eta) }}
                  <a href="#" @click.prevent="startEditEta(p)" style="margin-left:0.5rem">Bearbeiten</a>
                </div>

                <div v-if="etaPickupId === p.id" class="eta-edit mb-2">
                  <input type="datetime-local" v-model="etaValue" />
                  <div class="row mt-1" style="gap:0.5rem">
                    <button class="btn-ghost btn-sm" @click="etaPickupId = null">Abbrechen</button>
                    <button class="btn-primary btn-sm" @click="saveEta" :disabled="etaLoading">ETA speichern</button>
                  </div>
                </div>

                <div class="action-row row" style="gap:0.5rem;flex-wrap:wrap">
                  <button
                    v-if="p.driveway_video_url"
                    class="btn-warning btn-sm"
                    @click="videoModal = { url: p.driveway_video_url!, siteName: p.site.name }"
                  >
                    &#9654; Einfahrtsvideo
                  </button>
                  <button class="btn-ghost btn-sm" @click="openMaps(p)">
                    &#128506; Navigation
                  </button>
                  <button v-if="p.status === 'pending'" class="btn-primary btn-sm" @click="startDriving(p)">
                    Fahrt starten
                  </button>
                  <button v-if="p.status === 'driver_en_route'" class="btn-success btn-sm" @click="markComplete(p)">
                    Abgeschlossen
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'all'">
            <div class="stack">
              <div v-for="p in allPickups" :key="p.id" class="card">
                <div class="row-between">
                  <div>
                    <h3>{{ p.container.container_type }} — {{ p.site.name }}</h3>
                    <p class="text-sm text-muted">{{ formatDateTime(p.scheduled_at) }}</p>
                  </div>
                  <span class="badge" :class="pickupStatusBadge(p.status)">{{ pickupStatusLabel(p.status) }}</span>
                </div>
                <p class="text-sm text-muted mt-1">{{ p.site.address }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <nav class="bottom-nav">
      <button class="bottom-nav-item" :class="{ active: activeTab === 'queue' }" @click="activeTab = 'queue'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        Meine Aufträge
      </button>
      <button class="bottom-nav-item" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
        Alle Abholungen
      </button>
    </nav>

    <Transition name="fade">
      <DrivewayVideoModal
        v-if="videoModal"
        :video-url="videoModal.url"
        :site-name="videoModal.siteName"
        @close="videoModal = null"
      />
    </Transition>
  </div>
</template>

<style scoped>
.stat-chip {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 0.4rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.chip-val { font-size: 1.3rem; font-weight: 700; color: var(--text-primary); line-height: 1.1; }
.chip-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 600; }
.tabs { gap: 0.5rem; background: #181818; border-radius: var(--radius-sm); padding: 0.3rem; }
.tab {
  flex: 1; padding: 0.45rem 0.75rem;
  border-radius: 6px; font-size: 0.85rem; font-weight: 600;
  color: var(--text-muted); background: none; border: none; cursor: pointer; transition: all 0.15s;
}
.tab.active { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-card); }
.fill-row { gap: 0.6rem; }
.eta-edit { background: #181818; border-radius: var(--radius-sm); padding: 0.75rem; }
.mt-1 { margin-top: 0.5rem; }
</style>
