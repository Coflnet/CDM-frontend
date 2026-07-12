<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import LanguageSwitcher from './LanguageSwitcher.vue'
import { getContainerVariant } from '../utils'

// Bump when the models in /public/models are regenerated (mirrors the nginx
// long-cache on /models/, which is not content-hashed).
const MODEL_VERSION = '1'

// The three sizes shown in AR, mapped to the catalog and the generated meshes.
const AR_MODELS = [
  { variantId: 'absetz-3-offen', model: 'absetz-3' },
  { variantId: 'absetz-10-offen', model: 'absetz-10' },
  { variantId: 'abroll-36-offen', model: 'abroll-36' },
] as const

type ModelViewerEl = HTMLElement & { canActivateAR?: boolean }

const { t, locale } = useI18n()
const router = useRouter()

const selectedIdx = ref(0)
const selected = computed(() => {
  const entry = AR_MODELS[selectedIdx.value]
  return { model: entry.model, variant: getContainerVariant(entry.variantId)! }
})
const modelSrc = computed(() => `/models/${selected.value.model}.glb?v=${MODEL_VERSION}`)
const iosSrc = computed(() => `/models/${selected.value.model}.usdz?v=${MODEL_VERSION}`)

const fmt = (v: number) => new Intl.NumberFormat(locale.value).format(v)
const dimsLabel = computed(() => {
  const d = selected.value.variant.dimensionsM
  if (!d) return ''
  return t('ar.dims', { l: fmt(d.l), w: fmt(d.w), h: fmt(d.h) })
})

// model-viewer is ~220 KB; load it only after the page shell has painted so the
// selector is interactive immediately. `viewerReady` swaps the skeleton for the
// real element once the module is registered.
const viewerReady = ref(false)
const viewerEl = ref<ModelViewerEl | null>(null)
// null = still checking, true/false = whether this device can launch AR.
const arSupported = ref<boolean | null>(null)

onMounted(async () => {
  await import('@google/model-viewer')
  viewerReady.value = true
  await nextTick()
})

function onModelLoad() {
  arSupported.value = viewerEl.value?.canActivateAR ?? false
}

const copied = ref(false)
async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* clipboard unavailable */
  }
}

const canShare = typeof navigator !== 'undefined' && 'share' in navigator
function share() {
  navigator
    .share?.({ title: t('ar.title'), url: window.location.href })
    .catch(() => {})
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="ar-page">
    <header class="ar-header">
      <button class="link-btn" @click="goHome">&larr; {{ t('ar.back') }}</button>
      <LanguageSwitcher />
    </header>

    <main class="ar-content">
      <h1>{{ t('ar.title') }}</h1>
      <p class="lead">{{ t('ar.intro') }}</p>

      <div class="size-chips" role="tablist" :aria-label="t('ar.pickSize')">
        <button
          v-for="(m, i) in AR_MODELS"
          :key="m.variantId"
          class="size-chip"
          :class="{ active: i === selectedIdx }"
          role="tab"
          :aria-selected="i === selectedIdx"
          @click="selectedIdx = i"
        >
          <strong>{{ getContainerVariant(m.variantId)!.volumeM3 }} m³</strong>
          <span>{{ getContainerVariant(m.variantId)!.footprint }}</span>
        </button>
      </div>

      <div class="viewer-wrap">
        <model-viewer
          v-if="viewerReady"
          ref="viewerEl"
          class="viewer"
          :src="modelSrc"
          :ios-src="iosSrc"
          :alt="selected.variant.label"
          ar
          ar-modes="scene-viewer webxr quick-look"
          ar-scale="fixed"
          ar-placement="floor"
          camera-controls
          touch-action="pan-y"
          interaction-prompt="once"
          shadow-intensity="1"
          exposure="1.05"
          environment-image="neutral"
          camera-orbit="35deg 72deg 105%"
          min-field-of-view="25deg"
          loading="eager"
          @load="onModelLoad"
        >
          <button slot="ar-button" class="btn-primary ar-launch">{{ t('ar.view') }}</button>
          <div slot="poster" class="viewer-skeleton">
            <div class="loading-spinner"></div>
            <span>{{ t('ar.loading') }}</span>
          </div>
        </model-viewer>
        <div v-else class="viewer viewer-skeleton">
          <div class="loading-spinner"></div>
          <span>{{ t('ar.loading') }}</span>
        </div>
      </div>

      <p class="dims">
        <span>{{ dimsLabel }}</span>
        <span class="scale-badge">{{ t('ar.fixedScale') }}</span>
      </p>

      <p v-if="arSupported" class="ar-hint">{{ t('ar.arHint') }}</p>
      <div v-else-if="arSupported === false" class="desktop-hint">
        <p>{{ t('ar.desktopHint') }}</p>
        <div class="desktop-actions">
          <button class="btn-ghost" @click="copyLink">
            {{ copied ? t('ar.linkCopied') : t('ar.copyLink') }}
          </button>
          <button v-if="canShare" class="btn-ghost" @click="share">{{ t('ar.share') }}</button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.ar-page {
  min-height: 100vh;
  padding: 1.25rem 0.875rem 3rem;
  background: var(--bg-base);
  color: var(--text-base, #f4f4f4);
}

.ar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}

.ar-content {
  max-width: 760px;
  margin: 0 auto;
  line-height: 1.55;
}

.ar-content h1 {
  font-size: 1.7rem;
  margin-bottom: 0.6rem;
}

.lead {
  font-size: 1.02rem;
  opacity: 0.9;
  margin-bottom: 1.5rem;
}

.link-btn {
  background: transparent;
  border: 0;
  color: var(--accent, #7ed957);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.25rem 0;
}

.size-chips {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  -webkit-overflow-scrolling: touch;
}

.size-chip {
  flex: 1 0 auto;
  min-width: 7.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  align-items: flex-start;
  padding: 0.65rem 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm, 8px);
  color: inherit;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.size-chip strong {
  font-size: 1.05rem;
}

.size-chip span {
  font-size: 0.78rem;
  opacity: 0.7;
  white-space: nowrap;
}

.size-chip.active {
  border-color: var(--accent-blue, #3a8fd4);
  background: rgba(58, 143, 212, 0.14);
}

.viewer-wrap {
  width: 100%;
}

.viewer {
  width: 100%;
  height: min(60vh, 520px);
  min-height: 320px;
  background: #181c20;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius, 12px);
  --poster-color: #181c20;
}

.viewer-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  height: min(60vh, 520px);
  min-height: 320px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

.ar-launch {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  border: 0;
  padding: 0.7rem 1.4rem;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}

.dims {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin: 0.9rem 0 0.25rem;
  font-size: 0.95rem;
}

.scale-badge {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(58, 143, 212, 0.16);
  color: var(--accent-blue-light, #5ba8e8);
}

.ar-hint {
  font-size: 0.92rem;
  opacity: 0.8;
  margin-top: 0.5rem;
}

.desktop-hint {
  margin-top: 1rem;
  padding: 1rem 1.15rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius, 12px);
  font-size: 0.92rem;
}

.desktop-actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.btn-ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: inherit;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-ghost:hover {
  border-color: var(--accent-blue, #3a8fd4);
}
</style>
