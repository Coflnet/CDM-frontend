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
  assignedDriverId: string | null
}

export interface Invoice {
  invoiceId: string
  customerId: string
  bookingId: string
  siteId: string
  wasteType: WasteType
  siteName: string | null
  issuedAt: string
  amount: number
  currency: string
  status: 'unpaid' | 'paid'
}

export interface ErrorLog {
  logId: string
  occurredAt: string
  level: 'error' | 'warn' | 'info'
  message: string
  context: string | null
}

export interface Driver {
  driverId: string
  name: string
}

// ---- In-memory mock store ----

import { SITES, CONTAINERS, DRIVER_TRIPS, ANFAHRTEN, MOCK_ORDERS, MOCK_INVOICES, MOCK_ERROR_LOGS, MOCK_DRIVERS } from './mockData'

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
const orders: Order[] = [...MOCK_ORDERS]
const invoices: Invoice[] = [...MOCK_INVOICES]
const errorLogs: ErrorLog[] = [...MOCK_ERROR_LOGS]
const drivers: Driver[] = [...MOCK_DRIVERS]

// in-memory video URLs keyed by anfahrtId
const videoUrls: Record<string, string> = {}

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

    const order: Order = {
      orderId,
      customerId: 'cust-demo',
      siteId,
      createdAt: new Date().toISOString(),
      requestedDeliveryAt: body.requestedDeliveryAt ?? null,
      notes: body.notes ?? null,
      bookingIds,
      status: 'Requested' as BookingStatus,
      assignedDriverId: null,
    }
    orders.push(order)
    return delay(order)
  },

  listAnfahrten(siteId: string): Promise<Anfahrt[]> {
    return delay([...(anfahrtenMap[siteId] ?? [])])
  },

  uploadAnfahrt(siteId: string, form: FormData): Promise<Anfahrt> {
    const site = sites.find(s => s.siteId === siteId)
    const anfahrtId = `anf-${uid()}`
    const anfahrt: Anfahrt = {
      siteId,
      anfahrtId,
      uploadedByUserId: 'cust-demo',
      uploadedAt: new Date().toISOString(),
      lat: site?.lat ?? 0,
      lon: site?.lon ?? 0,
      orientationNote: null,
      videoStorageKey: anfahrtId,
      videoContentType: 'video/webm',
      videoSizeBytes: 0,
    }
    // Store an object URL so the video can be played back in-session
    const blob = form.get('video')
    if (blob instanceof Blob) {
      videoUrls[anfahrtId] = URL.createObjectURL(blob)
    }
    if (!anfahrtenMap[siteId]) anfahrtenMap[siteId] = []
    anfahrtenMap[siteId].unshift(anfahrt)
    return delay(anfahrt)
  },

  videoUrl(_siteId: string, anfahrtId: string): string {
    return videoUrls[anfahrtId] ?? ''
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

// ---- Admin API ----

export const adminApi = {
  listOrders(): Promise<Order[]> {
    return delay([...orders].reverse())
  },

  assignDriver(orderId: string, driverId: string): Promise<Order> {
    const o = orders.find(x => x.orderId === orderId)
    if (!o) return Promise.reject(new Error('Order not found'))
    o.assignedDriverId = driverId
    o.status = 'Scheduled'
    // update the linked driver trips
    if (o.bookingIds) {
      o.bookingIds.forEach(bkId => {
        driverTrips
          .filter(t => t.bookingId === bkId)
          .forEach(t => { t.driverUserId = driverId; t.bookingStatus = 'Scheduled' })
        const c = containers.find(x => x.bookingId === bkId)
        if (c) c.status = 'Scheduled'
      })
    }
    return delay({ ...o })
  },

  listSites(): Promise<Site[]> {
    return delay([...sites])
  },

  listContainers(): Promise<CustomerContainerView[]> {
    return delay([...containers])
  },

  listErrorLogs(): Promise<ErrorLog[]> {
    return delay([...errorLogs].reverse())
  },

  addErrorLog(level: ErrorLog['level'], message: string, context?: string): void {
    errorLogs.push({
      logId: `log-${uid()}`,
      occurredAt: new Date().toISOString(),
      level,
      message,
      context: context ?? null,
    })
  },

  listDrivers(): Promise<Driver[]> {
    return delay([...drivers])
  },
}

// ---- Invoice API ----

export const invoiceApi = {
  listForCustomer(customerId: string): Promise<Invoice[]> {
    return delay(invoices.filter(i => i.customerId === customerId).reverse())
  },

  listAll(): Promise<Invoice[]> {
    return delay([...invoices].reverse())
  },

  markPaid(invoiceId: string): Promise<Invoice> {
    const inv = invoices.find(i => i.invoiceId === invoiceId)
    if (!inv) return Promise.reject(new Error('Invoice not found'))
    inv.status = 'paid'
    return delay({ ...inv })
  },
}

// Create an invoice when a container is retrieved
export function markContainerRetrieved(bookingId: string): void {
  const c = containers.find(x => x.bookingId === bookingId)
  if (!c) return
  c.status = 'Retrieved'
  const site = sites.find(s => s.siteId === c.siteId)
  // Simple flat-rate pricing per waste type
  const rates: Record<string, number> = {
    Mixed: 320, Wood: 280, Metal: 450, Concrete: 550,
    Paper: 180, Plastic: 220, Organic: 200, Electronics: 480,
  }
  const inv: Invoice = {
    invoiceId: `inv-${uid()}`,
    customerId: 'cust-demo',
    bookingId,
    siteId: c.siteId,
    wasteType: c.wasteType,
    siteName: site?.name ?? null,
    issuedAt: new Date().toISOString(),
    amount: rates[c.wasteType] ?? 300,
    currency: 'EUR',
    status: 'unpaid',
  }
  invoices.push(inv)
}
