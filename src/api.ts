// ---- Token helpers (kept for Firebase auth store compatibility) ----

export function setToken(token: string): void {
  localStorage.setItem('cdm_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('cdm_token')
}

export function hasToken(): boolean {
  return !!localStorage.getItem('cdm_token')
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

// ---- In-memory mock store ----

import { SITES, CONTAINERS, DRIVER_TRIPS, ANFAHRTEN } from './mockData'

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function delay<T>(val: T, ms = 350): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(val), ms))
}

const sites: Site[] = [...SITES]
const containers: CustomerContainerView[] = [...CONTAINERS]
const driverTrips: DriverTrip[] = [...DRIVER_TRIPS]
const anfahrtenMap: Record<string, Anfahrt[]> = Object.fromEntries(
  Object.entries(ANFAHRTEN).map(([k, v]) => [k, [...v]])
)

// ---- Sites API ----

export const sitesApi = {
  list(): Promise<Site[]> {
    return delay([...sites])
  },

  get(siteId: string): Promise<Site> {
    const s = sites.find(x => x.siteId === siteId)
    if (!s) return Promise.reject(new Error('Site not found'))
    return delay({ ...s })
  },

  create(body: { name: string; address: string; lat: number; lon: number; orientationNote?: string }): Promise<Site> {
    const site: Site = {
      siteId: `site-${uid()}`,
      customerId: 'cust-demo',
      name: body.name,
      address: body.address,
      lat: body.lat,
      lon: body.lon,
      orientationNote: body.orientationNote ?? null,
      createdAt: new Date().toISOString(),
      active: true,
    }
    sites.push(site)
    anfahrtenMap[site.siteId] = []
    return delay({ ...site })
  },

  listContainers(siteId: string): Promise<BookingBySite[]> {
    const result: BookingBySite[] = containers
      .filter(c => c.siteId === siteId)
      .map(c => ({
        siteId: c.siteId,
        bookingId: c.bookingId,
        customerId: 'cust-demo',
        wasteType: c.wasteType,
        status: c.status,
        assignedContainerNumber: c.containerNumber,
        requestedAt: new Date().toISOString(),
        scheduledDeliveryAt: null,
        expectedEmptyingAt: c.expectedEmptyingAt,
        currentFillLevel: c.fillLevel,
      }))
    return delay(result)
  },

  createOrder(
    siteId: string,
    body: { wasteTypes: WasteType[]; requestedDeliveryAt?: string; notes?: string }
  ): Promise<Order> {
    const orderId = `ord-${uid()}`
    const site = sites.find(s => s.siteId === siteId)

    const bookingIds: string[] = body.wasteTypes.map(wt => {
      const bkId = `bk-${uid()}`
      containers.push({
        bookingId: bkId,
        siteId,
        containerNumber: null,
        wasteType: wt,
        status: 'Requested',
        fillLevel: 0,
        lat: site?.lat ?? null,
        lon: site?.lon ?? null,
        expectedEmptyingAt: null,
      })
      driverTrips.push({
        dayBucket: new Date().toISOString().slice(0, 10),
        driverUserId: 'driver-demo',
        scheduledAt: body.requestedDeliveryAt ?? new Date(Date.now() + 2 * 86400000).toISOString(),
        bookingId: bkId,
        customerId: 'cust-demo',
        siteId,
        containerNumber: null,
        wasteType: wt,
        tripKind: 'delivery',
        bookingStatus: 'Requested',
        siteName: site?.name ?? null,
        siteAddress: site?.address ?? null,
        siteLat: site?.lat ?? 0,
        siteLon: site?.lon ?? 0,
        createdAt: new Date().toISOString(),
      })
      return bkId
    })

    return delay({
      orderId,
      customerId: 'cust-demo',
      siteId,
      createdAt: new Date().toISOString(),
      requestedDeliveryAt: body.requestedDeliveryAt ?? null,
      notes: body.notes ?? null,
      bookingIds,
      status: 'Requested' as BookingStatus,
    })
  },

  listAnfahrten(siteId: string): Promise<Anfahrt[]> {
    return delay([...(anfahrtenMap[siteId] ?? [])])
  },

  uploadAnfahrt(siteId: string, _form: FormData): Promise<Anfahrt> {
    const site = sites.find(s => s.siteId === siteId)
    const anfahrt: Anfahrt = {
      siteId,
      anfahrtId: `anf-${uid()}`,
      uploadedByUserId: 'cust-demo',
      uploadedAt: new Date().toISOString(),
      lat: site?.lat ?? 0,
      lon: site?.lon ?? 0,
      orientationNote: null,
      videoStorageKey: null,
      videoContentType: null,
      videoSizeBytes: 0,
    }
    if (!anfahrtenMap[siteId]) anfahrtenMap[siteId] = []
    anfahrtenMap[siteId].unshift(anfahrt)
    return delay(anfahrt)
  },

  videoUrl(_siteId: string, _anfahrtId: string): string {
    return ''
  },
}

// ---- Customer containers API ----

function containerToBooking(c: CustomerContainerView): ContainerBooking {
  return {
    bookingId: c.bookingId,
    customerId: 'cust-demo',
    siteId: c.siteId,
    orderId: '',
    wasteType: c.wasteType,
    assignedContainerNumber: c.containerNumber,
    status: c.status,
    requestedAt: new Date().toISOString(),
    scheduledDeliveryAt: null,
    deliveredAt: null,
    emptyRequestedAt: c.status === 'EmptyRequested' ? new Date().toISOString() : null,
    expectedEmptyingAt: c.expectedEmptyingAt,
    retrievedAt: null,
    currentFillLevel: c.fillLevel,
    notes: null,
  }
}

export const containersApi = {
  list(): Promise<CustomerContainerView[]> {
    return delay([...containers])
  },

  requestContainer(body: {
    siteId: string
    wasteType: WasteType
    requestedDeliveryAt?: string
    notes?: string
  }): Promise<ContainerBooking> {
    const bkId = `bk-${uid()}`
    const site = sites.find(s => s.siteId === body.siteId)
    const container: CustomerContainerView = {
      bookingId: bkId,
      siteId: body.siteId,
      containerNumber: null,
      wasteType: body.wasteType,
      status: 'Requested',
      fillLevel: 0,
      lat: site?.lat ?? null,
      lon: site?.lon ?? null,
      expectedEmptyingAt: null,
    }
    containers.push(container)
    return delay(containerToBooking(container))
  },

  updateFill(bookingId: string, fillLevel: number, _note?: string): Promise<ContainerBooking> {
    const c = containers.find(x => x.bookingId === bookingId)
    if (!c) return Promise.reject(new Error('Booking not found'))
    c.fillLevel = fillLevel
    if (c.status === 'Delivered') c.status = 'Filling'
    return delay(containerToBooking(c))
  },

  requestEmptying(bookingId: string, preferredAt?: string): Promise<ContainerBooking> {
    const c = containers.find(x => x.bookingId === bookingId)
    if (!c) return Promise.reject(new Error('Booking not found'))
    c.status = 'EmptyRequested'
    c.expectedEmptyingAt = preferredAt ?? new Date(Date.now() + 2 * 86400000).toISOString()
    const site = sites.find(s => s.siteId === c.siteId)
    driverTrips.push({
      dayBucket: c.expectedEmptyingAt.slice(0, 10),
      driverUserId: 'driver-demo',
      scheduledAt: c.expectedEmptyingAt,
      bookingId: c.bookingId,
      customerId: 'cust-demo',
      siteId: c.siteId,
      containerNumber: c.containerNumber,
      wasteType: c.wasteType,
      tripKind: 'pickup',
      bookingStatus: 'EmptyRequested',
      siteName: site?.name ?? null,
      siteAddress: site?.address ?? null,
      siteLat: site?.lat ?? 0,
      siteLon: site?.lon ?? 0,
      createdAt: new Date().toISOString(),
    })
    return delay(containerToBooking(c))
  },
}

// ---- Driver API ----

export const driverApi = {
  trips(_days = 2): Promise<DriverTrip[]> {
    return delay([...driverTrips])
  },
}
