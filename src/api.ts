const BASE = import.meta.env.VITE_API_BASE_URL as string

function getToken(): string {
  return localStorage.getItem('cdm_token') ?? ''
}

export function setToken(token: string): void {
  localStorage.setItem('cdm_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('cdm_token')
}

export function hasToken(): boolean {
  return !!getToken()
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T
  return res.json()
}

async function requestMultipart<T>(method: string, path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ---- API models ----

export type WasteType = 'Mixed' | 'Wood' | 'Metal' | 'Concrete' | 'Paper' | 'Plastic' | 'Organic' | 'Electronics'
export type BookingStatus = 'Requested' | 'Scheduled' | 'Delivered' | 'Filling' | 'EmptyRequested' | 'Retrieved' | 'Closed' | 'Cancelled'
export type ContainerStatus = 'InYard' | 'InTransit' | 'OnSite' | 'ReadyForPickup' | 'AtWeighStation' | 'Decommissioned'
export type ContainerSize = 'Small' | 'Medium' | 'Large' | 'Roll'

export interface Site {
  siteId: string
  customerId: string
  name: string | null
  address: string | null
  lat: number
  lon: number
  orientationNote: string | null
  createdAt: string
  active: boolean
}

export interface CustomerContainerView {
  bookingId: string
  siteId: string
  containerNumber: string | null
  wasteType: WasteType
  status: BookingStatus
  fillLevel: number
  lat: number | null
  lon: number | null
  expectedEmptyingAt: string | null
}

export interface BookingBySite {
  siteId: string
  bookingId: string
  customerId: string
  wasteType: WasteType
  status: BookingStatus
  assignedContainerNumber: string | null
  requestedAt: string
  scheduledDeliveryAt: string | null
  expectedEmptyingAt: string | null
  currentFillLevel: number
}

export interface ContainerBooking {
  bookingId: string
  customerId: string
  siteId: string
  orderId: string
  wasteType: WasteType
  assignedContainerNumber: string | null
  status: BookingStatus
  requestedAt: string
  scheduledDeliveryAt: string | null
  deliveredAt: string | null
  emptyRequestedAt: string | null
  expectedEmptyingAt: string | null
  retrievedAt: string | null
  currentFillLevel: number
  notes: string | null
}

export interface DriverTrip {
  dayBucket: string | null
  driverUserId: string
  scheduledAt: string
  bookingId: string
  customerId: string
  siteId: string
  containerNumber: string | null
  wasteType: WasteType
  tripKind: string | null
  bookingStatus: BookingStatus
  siteName: string | null
  siteAddress: string | null
  siteLat: number
  siteLon: number
  createdAt: string
}

export interface Anfahrt {
  siteId: string
  anfahrtId: string
  uploadedByUserId: string
  uploadedAt: string
  lat: number
  lon: number
  orientationNote: string | null
  videoStorageKey: string | null
  videoContentType: string | null
  videoSizeBytes: number
}

export interface Order {
  orderId: string
  customerId: string
  siteId: string
  createdAt: string
  requestedDeliveryAt: string | null
  notes: string | null
  bookingIds: string[] | null
  status: BookingStatus
}

// ---- Sites ----

export const sitesApi = {
  list: () => request<Site[]>('GET', '/api/my/sites'),
  get: (siteId: string) => request<Site>('GET', `/api/my/sites/${siteId}`),
  create: (body: { name: string; address: string; lat: number; lon: number; orientationNote?: string }) =>
    request<Site>('POST', '/api/my/sites', body),
  listContainers: (siteId: string) => request<BookingBySite[]>('GET', `/api/my/sites/${siteId}/containers`),
  createOrder: (siteId: string, body: { wasteTypes: WasteType[]; requestedDeliveryAt?: string; notes?: string }) =>
    request<Order>('POST', `/api/my/sites/${siteId}/orders`, body),
  listAnfahrten: (siteId: string) => request<Anfahrt[]>('GET', `/api/my/sites/${siteId}/anfahrten`),
  uploadAnfahrt: (siteId: string, form: FormData) =>
    requestMultipart<Anfahrt>('POST', `/api/my/sites/${siteId}/anfahrten`, form),
  videoUrl: (siteId: string, anfahrtId: string) => `${BASE}/api/my/sites/${siteId}/anfahrten/${anfahrtId}/video`,
}

// ---- Customer containers ----

export const containersApi = {
  list: () => request<CustomerContainerView[]>('GET', '/api/my/containers'),
  requestContainer: (body: { siteId: string; wasteType: WasteType; requestedDeliveryAt?: string; notes?: string }) =>
    request<ContainerBooking>('POST', '/api/my/containers', body),
  updateFill: (bookingId: string, fillLevel: number, note?: string) =>
    request<ContainerBooking>('POST', `/api/my/containers/${bookingId}/fill`, { fillLevel, note }),
  requestEmptying: (bookingId: string, preferredAt?: string) => {
    const qs = preferredAt ? `?preferredAt=${encodeURIComponent(preferredAt)}` : ''
    return request<ContainerBooking>('POST', `/api/my/containers/${bookingId}/empty${qs}`)
  },
}

// ---- Driver ----

export const driverApi = {
  trips: (days = 2) => request<DriverTrip[]>('GET', `/api/driver/trips?days=${days}`),
}
