<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { driverApi, sitesApi } from '../../api'
import type { DriverTrip, Anfahrt } from '../../api'
import { formatDateTime, BOOKING_STATUS_LABEL, BOOKING_STATUS_BADGE, WASTE_TYPE_LABEL } from '../../utils'
import DrivewayVideoModal from './DrivewaVideoModal.vue'

const trips = ref<DriverTrip[]>([])
const loading = ref(true)
const activeTab = ref<'queue' | 'all'>('queue')
const videoModal = ref<{ url: string; siteName: string } | null>(null)
const anfahrtenMap = ref<Record<string, Anfahrt[]>>({})
const notificationBanner = ref<{ tone: 'info' | 'error'; message: string } | null>(null)

async function load() {
  loading.value = true
  try {
    trips.value = await driverApi.trips(2)

    // Load anfahrten for all unique sites
    const siteIds = [...new Set(trips.value.map(t => t.siteId))]
    const results = await Promise.allSettled(siteIds.map(id => sitesApi.listAnfahrten(id)))
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') anfahrtenMap.value[siteIds[i]] = r.value
    })
  } finally {
    loading.value = false
  }
}

onMounted(load)

const queueTrips = computed(() =>
  Array.from(
    trips.value
    .filter(t => t.bookingStatus === 'Delivered' || t.bookingStatus === 'Filling' || t.bookingStatus === 'EmptyRequested' || t.bookingStatus === 'Scheduled')
    .reduce((activeTrips, trip) => {
      const current = activeTrips.get(trip.bookingId)
      if (!current) {
        activeTrips.set(trip.bookingId, trip)
        return activeTrips
      }

      const currentAt = new Date(current.scheduledAt).getTime()
      const nextAt = new Date(trip.scheduledAt).getTime()
      if (nextAt > currentAt || (nextAt === currentAt && trip.tripKind === 'pickup')) {
        activeTrips.set(trip.bookingId, trip)
      }

      return activeTrips
    }, new Map<string, DriverTrip>())
    .values()
  )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
)

const allTrips = computed(() =>
  [...trips.value].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
)

function latestAnfahrt(siteId: string): Anfahrt | null {
  return anfahrtenMap.value[siteId]?.[0] ?? null
}

async function sendNavigationNotification(t: DriverTrip): Promise<void> {
  if (typeof Notification === 'undefined') {
    notificationBanner.value = {
      tone: 'error',
      message: 'Browser notifications are not supported in this environment.',
    }
    return
  }

  try {
    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    if (permission !== 'granted') {
      notificationBanner.value = {
        tone: 'error',
        message: 'Notification permission was not granted, so the demo notification was skipped.',
      }
      return
    }

    const destination = t.siteName ?? t.siteAddress ?? 'the destination'
    const notification = new Notification('CDM demo notification', {
      body: `${t.tripKind === 'pickup' ? 'Pickup' : 'Delivery'} navigation started for ${destination}.`,
      tag: `cdm-navigation-${t.bookingId}`,
    })
    notification.onclick = () => window.focus()

    notificationBanner.value = {
      tone: 'info',
      message: `Demo notification sent for ${destination}.`,
    }
  } catch (error) {
    notificationBanner.value = {
      tone: 'error',
      message: error instanceof Error ? error.message : 'The demo notification could not be created.',
    }
  }
}

async function openMaps(t: DriverTrip): Promise<void> {
  const query = t.siteAddress || (t.siteLat && t.siteLon ? `${t.siteLat},${t.siteLon}` : '')
  if (query) {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(query)}`, '_blank')
  }
  await sendNavigationNotification(t)
}

function openVideo(t: DriverTrip): void {
  const anfahrt = latestAnfahrt(t.siteId)
  if (!anfahrt) return
  videoModal.value = {
    url: sitesApi.videoUrl(t.siteId, anfahrt.anfahrtId),
    siteName: t.siteName ?? t.siteAddress ?? '—',
  }
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
            <span class="chip-val">{{ queueTrips.length }}</span>
            <span class="chip-label">Aufträge</span>
          </div>
        </div>

        <div v-if="loading" class="spinner"></div>

        <div v-else>
          <div v-if="notificationBanner" class="alert mb-3" :class="notificationBanner.tone === 'error' ? 'alert-error' : 'alert-info'">
            {{ notificationBanner.message }}
          </div>

          <div class="tabs row mb-3">
            <button :class="['tab', { active: activeTab === 'queue' }]" @click="activeTab = 'queue'">Meine Aufträge</button>
            <button :class="['tab', { active: activeTab === 'all' }]" @click="activeTab = 'all'">Alle Trips</button>
          </div>

          <div v-if="activeTab === 'queue'">
            <div v-if="queueTrips.length === 0" class="empty-state">
              <div class="icon">&#10003;</div>
              <p>Keine aktiven Aufträge für heute / morgen.</p>
            </div>
            <div v-else class="stack">
              <div v-for="t in queueTrips" :key="t.bookingId + t.scheduledAt" class="card pickup-card">
                <div class="row-between mb-1">
                  <div class="card-title-wrap">
                    <h3 class="card-h3">{{ WASTE_TYPE_LABEL[t.wasteType] }} — {{ t.siteName ?? '—' }}</h3>
                    <p class="text-sm text-muted">{{ t.tripKind === 'delivery' ? 'Lieferung' : 'Abholung' }}</p>
                  </div>
                  <span class="badge badge-shrink" :class="BOOKING_STATUS_BADGE[t.bookingStatus]">
                    {{ BOOKING_STATUS_LABEL[t.bookingStatus] }}
                  </span>
                </div>

                <p class="text-sm text-muted mb-1">{{ formatDateTime(t.scheduledAt) }}</p>
                <p class="text-sm text-muted mb-2">{{ t.siteAddress }}</p>

                <div v-if="t.containerNumber" class="text-sm text-muted mb-2">
                  Container: {{ t.containerNumber }}
                </div>

                <div class="action-row" style="display:flex;gap:0.5rem;flex-wrap:wrap">
                  <button
                    v-if="latestAnfahrt(t.siteId)"
                    class="btn-warning btn-sm"
                    @click="openVideo(t)"
                  >
                    &#9654; Einfahrtsvideo
                  </button>
                  <button class="btn-ghost btn-sm" @click="openMaps(t)">
                    &#128506; Navigation
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'all'">
            <div v-if="allTrips.length === 0" class="empty-state">
              <div class="icon">&#128203;</div>
              <p>Keine Trips für heute / morgen.</p>
            </div>
            <div v-else class="stack">
              <div v-for="t in allTrips" :key="t.bookingId + t.scheduledAt" class="card">
                <div class="row-between">
                  <div class="card-title-wrap">
                    <h3 class="card-h3">{{ WASTE_TYPE_LABEL[t.wasteType] }} — {{ t.siteName ?? '—' }}</h3>
                    <p class="text-sm text-muted">{{ formatDateTime(t.scheduledAt) }}</p>
                  </div>
                  <span class="badge badge-shrink" :class="BOOKING_STATUS_BADGE[t.bookingStatus]">
                    {{ BOOKING_STATUS_LABEL[t.bookingStatus] }}
                  </span>
                </div>
                <p class="text-sm text-muted mt-1">{{ t.siteAddress }}</p>
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
        Alle Trips
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
.mt-1 { margin-top: 0.5rem; }
.action-row button { flex: 1; min-width: 100px; justify-content: center; }
.card-title-wrap { min-width: 0; flex: 1; overflow: hidden; }
.card-h3 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge-shrink { flex-shrink: 0; }
</style>
