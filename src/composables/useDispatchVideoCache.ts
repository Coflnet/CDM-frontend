/**
 * Pre-fetches dispatch (Anfahrt) videos into the browser's HTTP cache so the
 * driver can play them offline once they're on the road. Only fires when
 * the device reports a Wi-Fi (or unmetered + 4G+) connection so we never
 * blow through someone's mobile data plan.
 *
 * The Cache Storage API is used so the videos survive page reloads and are
 * available from the service-worker cache layer if one is registered.
 *
 * Usage:
 *   const { preloadNext } = useDispatchVideoCache()
 *   onMounted(() => preloadNext(siteId, anfahrten))
 */
import { sitesApi, type Anfahrt } from '../api'

interface NetworkInformation {
  type?: string
  effectiveType?: string
  downlink?: number
  saveData?: boolean
}

const CACHE_NAME = 'cdm-dispatch-videos-v1'

function getNetwork(): NetworkInformation | undefined {
  // Best-effort. Standard is still in draft; Safari has no support.
  const nav = navigator as unknown as { connection?: NetworkInformation }
  return nav.connection
}

/**
 * @returns true when the browser believes we're on Wi-Fi or an equivalent
 * unmetered + fast connection. Conservatively returns false when the API is
 * not available so we don't accidentally burn through metered data.
 */
export function isOnWifi(): boolean {
  const net = getNetwork()
  if (!net) return false
  if (net.saveData) return false
  if (net.type === 'wifi' || net.type === 'ethernet') return true
  // Some browsers only expose effectiveType. Treat 4g + downlink>=5Mbps as
  // "good enough" for video preload.
  if (net.effectiveType === '4g' && (net.downlink ?? 0) >= 5) return true
  return false
}

/**
 * Returns the storage cache, or null if Cache Storage is not available
 * (e.g. private mode in older Safari).
 */
async function getCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null
  try { return await caches.open(CACHE_NAME) } catch { return null }
}

export function useDispatchVideoCache() {
  /**
   * Pre-fetch up to <count> next dispatch videos. Skips ones already in the
   * cache and is a no-op when the network is metered.
   */
  async function preloadNext(siteId: string, anfahrten: Anfahrt[], count = 2) {
    if (!isOnWifi()) return
    const cache = await getCache()
    if (!cache) return
    const candidates = anfahrten.slice(0, count)
    await Promise.all(candidates.map(async a => {
      const url = sitesApi.videoUrl(siteId, a.anfahrtId)
      try {
        const cached = await cache.match(url)
        if (cached) return
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) return
        await cache.put(url, res.clone())
      } catch {
        // Best-effort; ignore network errors so we never break the UI.
      }
    }))
  }

  /** Free up the cache when it grows too large. */
  async function trimCache(maxEntries = 6) {
    const cache = await getCache()
    if (!cache) return
    const keys = await cache.keys()
    const overflow = keys.length - maxEntries
    if (overflow <= 0) return
    await Promise.all(keys.slice(0, overflow).map(req => cache.delete(req)))
  }

  return { preloadNext, trimCache, isOnWifi }
}
