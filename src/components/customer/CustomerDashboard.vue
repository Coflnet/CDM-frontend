<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { sitesApi, containersApi, invoiceApi } from '../../api'
import type { Site, CustomerContainerView, Invoice } from '../../api'
import { fillColor, formatDateTime, formatDate, BOOKING_STATUS_LABEL, BOOKING_STATUS_BADGE, WASTE_TYPE_LABEL } from '../../utils'
import ContainerCard from './ContainerCard.vue'
import ContainerDetailModal from './ContainerDetailModal.vue'
import SchedulePickupModal from './SchedulePickupModal.vue'
import UpdateFillModal from './UpdateFillModal.vue'
import OrderContainerModal from './OrderContainerModal.vue'
import CreateSiteModal from './CreateSiteModal.vue'

const sites = ref<Site[]>([])
const containers = ref<CustomerContainerView[]>([])
const loading = ref(true)
const error = ref('')

const activeTab = ref<'containers' | 'pickups' | 'sites' | 'invoices'>('containers')
const detailTarget = ref<{ container: CustomerContainerView; site: Site } | null>(null)
const scheduleTarget = ref<{ container: CustomerContainerView; site: Site } | null>(null)
const fillTarget = ref<CustomerContainerView | null>(null)
const showOrder = ref(false)
const showCreateSite = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [sitesData, containersData] = await Promise.all([
      sitesApi.list(),
      containersApi.list(),
    ])
    sites.value = sitesData.filter(s => s.active)
    containers.value = containersData

    const active = containersData.filter(c => c.status !== 'Retrieved' && c.status !== 'Closed' && c.status !== 'Cancelled')
    if (active.length > 1) activeTab.value = 'sites'
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Fehler beim Laden'
  } finally {
    loading.value = false
  }
}

onMounted(() => { load(); loadInvoices() })

function siteForContainer(c: CustomerContainerView): Site | undefined {
  return sites.value.find(s => s.siteId === c.siteId)
}

function containersForSite(siteId: string): CustomerContainerView[] {
  return containers.value.filter(c => c.siteId === siteId && c.status !== 'Retrieved' && c.status !== 'Closed' && c.status !== 'Cancelled')
}

function openDetail(container: CustomerContainerView, site: Site) {
  detailTarget.value = { container, site }
}

const activeContainers = computed(() =>
  containers.value.filter(c => c.status !== 'Retrieved' && c.status !== 'Closed' && c.status !== 'Cancelled')
)

const upcomingPickups = computed(() =>
  containers.value.filter(c => c.status === 'EmptyRequested')
)

const fillPct = (c: CustomerContainerView) => Math.round(c.fillLevel * 100)

const invoices = ref<Invoice[]>([])

async function loadInvoices() {
  invoices.value = await invoiceApi.listForCustomer('cust-demo')
}
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
        <div v-else-if="error" class="alert alert-error">{{ error }}</div>

        <div v-else>
          <div class="summary-chips row mb-3">
            <div class="chip">
              <span class="chip-val">{{ activeContainers.length }}</span>
              <span class="chip-label">Aktiv</span>
            </div>
            <div v-if="upcomingPickups.length" class="chip chip-warn">
              <span class="chip-val">{{ upcomingPickups.length }}</span>
              <span class="chip-label">Abholung</span>
            </div>
            <div class="chip">
              <span class="chip-val">{{ sites.length }}</span>
              <span class="chip-label">Standorte</span>
            </div>
          </div>

          <div class="tabs row" style="margin-top:1rem;margin-bottom:1rem">
            <button :class="['tab', { active: activeTab === 'containers' }]" @click="activeTab = 'containers'">Container</button>
            <button :class="['tab', { active: activeTab === 'pickups' }]" @click="activeTab = 'pickups'">Abholungen</button>
            <button :class="['tab', { active: activeTab === 'sites' }]" @click="activeTab = 'sites'">Standorte</button>
            <button :class="['tab', { active: activeTab === 'invoices' }]" @click="activeTab = 'invoices'; loadInvoices()">Rechnungen</button>
          </div>

          <!-- Containers tab -->
          <div v-if="activeTab === 'containers'">
            <div v-if="activeContainers.length === 0" class="empty-state">
              <div class="icon">&#128465;</div>
              <p>Keine aktiven Container.</p>
              <button class="btn-primary mt-2" @click="showOrder = true">Container bestellen</button>
            </div>
            <div v-else class="stack">
              <template v-for="c in activeContainers" :key="c.bookingId">
                <ContainerCard
                  v-if="siteForContainer(c)"
                  :container="c"
                  :site="siteForContainer(c)!"
                  @schedule-pickup="scheduleTarget = { container: c, site: siteForContainer(c)! }"
                  @update-fill="fillTarget = c"
                  @view-detail="openDetail(c, siteForContainer(c)!)"
                />
              </template>
            </div>
          </div>

          <!-- Pickups tab -->
          <div v-if="activeTab === 'pickups'">
            <div v-if="upcomingPickups.length === 0" class="empty-state">
              <div class="icon">&#128197;</div>
              <p>Keine laufenden Abholungsanfragen.</p>
            </div>
            <div v-else class="stack">
              <div v-for="c in upcomingPickups" :key="c.bookingId" class="card">
                <div class="row-between mb-1">
                  <div>
                    <h3>{{ WASTE_TYPE_LABEL[c.wasteType] }} Abholung</h3>
                    <p class="text-sm text-muted">
                      {{ siteForContainer(c)?.name ?? '—' }}
                    </p>
                  </div>
                  <span class="badge" :class="BOOKING_STATUS_BADGE[c.status]">
                    {{ BOOKING_STATUS_LABEL[c.status] }}
                  </span>
                </div>
                <div v-if="c.expectedEmptyingAt" class="text-sm text-muted">
                  Geplante Leerung: {{ formatDateTime(c.expectedEmptyingAt) }}
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
              <div v-for="s in sites" :key="s.siteId" class="card site-card">
                <div class="row-between mb-1">
                  <div>
                    <h3>{{ s.name }}</h3>
                    <p class="text-sm text-muted">{{ s.address }}</p>
                  </div>
                  <div class="badge badge-gray">{{ containersForSite(s.siteId).length }} Container</div>
                </div>

                <div v-if="containersForSite(s.siteId).length" class="site-containers">
                  <div
                    v-for="c in containersForSite(s.siteId)"
                    :key="c.bookingId"
                    class="site-container-row clickable"
                    @click="openDetail(c, s)"
                  >
                    <div class="sc-top row-between">
                      <span class="text-sm font-semibold">{{ WASTE_TYPE_LABEL[c.wasteType] }}</span>
                      <div class="row" style="gap:0.4rem" @click.stop>
                        <button class="btn-primary btn-sm" @click="scheduleTarget = { container: c, site: s }">Abholen</button>
                        <button class="btn-ghost btn-sm icon-btn" @click="openDetail(c, s)" title="Details">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                        </button>
                      </div>
                    </div>
                    <div class="sc-fill row" style="gap:0.5rem;margin-top:0.35rem">
                      <div class="fill-bar-wrap" style="flex:1">
                        <div class="fill-bar" :style="{ width: fillPct(c) + '%', background: fillColor(fillPct(c)) }"></div>
                      </div>
                      <span class="text-sm text-muted" style="min-width:2rem;text-align:right">{{ fillPct(c) }}%</span>
                    </div>
                  </div>
                </div>

                <div class="row" style="gap:0.5rem;margin-top:0.75rem">
                  <button class="btn-ghost btn-sm" @click="showOrder = true">+ Container bestellen</button>
                </div>
              </div>
            </div>
          </div>
          <!-- Invoices tab -->
          <div v-if="activeTab === 'invoices'">
            <div v-if="invoices.length === 0" class="empty-state">
              <div class="icon">&#129534;</div>
              <p>Noch keine Rechnungen vorhanden.</p>
            </div>
            <div v-else class="stack">
              <div v-for="inv in invoices" :key="inv.invoiceId" class="card invoice-card">
                <div class="row-between mb-1">
                  <div class="inv-info">
                    <h3>{{ WASTE_TYPE_LABEL[inv.wasteType] }}</h3>
                    <p class="text-sm text-muted">{{ inv.siteName ?? inv.siteId }}</p>
                  </div>
                  <span class="badge badge-shrink" :class="inv.status === 'paid' ? 'badge-green' : 'badge-orange'">
                    {{ inv.status === 'paid' ? 'Bezahlt' : 'Offen' }}
                  </span>
                </div>
                <div class="invoice-amount">{{ inv.amount.toFixed(2) }} {{ inv.currency }}</div>
                <p class="text-sm text-muted">Ausgestellt: {{ formatDate(inv.issuedAt) }}</p>
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
      <button class="bottom-nav-item" :class="{ active: activeTab === 'invoices' }" @click="activeTab = 'invoices'; loadInvoices()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Rechnungen
      </button>
      <button class="bottom-nav-item" @click="showOrder = true">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Bestellen
      </button>
    </nav>

    <Transition name="fade">
      <ContainerDetailModal
        v-if="detailTarget"
        :container="detailTarget.container"
        :site="detailTarget.site"
        @close="detailTarget = null"
        @schedule-pickup="scheduleTarget = detailTarget; detailTarget = null"
        @update-fill="fillTarget = detailTarget!.container; detailTarget = null"
      />
    </Transition>
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
.dash-greeting { font-size: 1.25rem; }
.summary-chips { gap: 0.6rem; flex-wrap: wrap; }
.chip {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
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
.site-container-row { }
.sc-top { align-items: center; }
.sc-fill { align-items: center; }
.clickable {
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.5rem;
  margin: 0 -0.5rem;
  transition: background 0.12s;
}
.clickable:hover { background: rgba(255,255,255,0.04); }
.font-semibold { font-weight: 600; }
.icon-btn { padding: 0.3rem 0.4rem; }
.mt-2 { margin-top: 1rem; }
.invoice-card .inv-info { min-width: 0; flex: 1; overflow: hidden; }
.invoice-card .inv-info h3 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge-shrink { flex-shrink: 0; }
.invoice-amount { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.15rem; }
</style>
