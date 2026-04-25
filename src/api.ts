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
export type DriverTripKind = 'delivery' | 'pickup'
export type DriverReportPhotoSide = 'front' | 'right' | 'back' | 'left'

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
  tripKind: DriverTripKind | null
  bookingStatus: BookingStatus
  siteName: string | null
  siteAddress: string | null
  siteLat: number
  siteLon: number
  createdAt: string
  reportCompletedAt: string | null
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

export interface DriverReportPhoto {
  side: DriverReportPhotoSide
  imageUrl: string
  capturedAt: string
}

export interface DriverReport {
  reportId: string
  bookingId: string
  tripKind: DriverTripKind
  createdAt: string
  createdByDriverId: string
  signerName: string
  signatureDataUrl: string
  damageNotes: string | null
  damageCharge: number
  photos: DriverReportPhoto[]
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
  reports: DriverReport[]
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
  weightKg: number | null
  pricePerKg: number | null
  damageCharge: number | null
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

const BILLING_RATES: Record<WasteType, number> = {
  Mixed: 320,
  Wood: 280,
  Metal: 450,
  Concrete: 550,
  Paper: 180,
  Plastic: 220,
  Organic: 200,
  Electronics: 480,
}

const REQUIRED_REPORT_SIDES: DriverReportPhotoSide[] = ['front', 'right', 'back', 'left']

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function cloneOrder(order: Order): Order {
  return {
    ...order,
    bookingIds: order.bookingIds ? [...order.bookingIds] : null,
    reports: order.reports.map(report => ({
      ...report,
      photos: report.photos.map(photo => ({ ...photo })),
    })),
  }
}

function cloneTrip(trip: DriverTrip): DriverTrip {
  return { ...trip }
}

function findSite(siteId: string): Site | undefined {
  return sites.find(site => site.siteId === siteId)
}

function findContainer(bookingId: string): CustomerContainerView | undefined {
  return containers.find(container => container.bookingId === bookingId)
}

function findOrderByBookingId(bookingId: string): Order | undefined {
  return orders.find(order => order.bookingIds?.includes(bookingId))
}

function listTripsForBooking(bookingId: string): DriverTrip[] {
  return driverTrips.filter(trip => trip.bookingId === bookingId)
}

function reportForTrip(bookingId: string, tripKind: DriverTripKind): DriverReport | undefined {
  return findOrderByBookingId(bookingId)?.reports.find(report => report.bookingId === bookingId && report.tripKind === tripKind)
}

function reportCompletedAt(bookingId: string, tripKind: DriverTripKind): string | null {
  return reportForTrip(bookingId, tripKind)?.createdAt ?? null
}

function latestTripForBooking(bookingId: string, tripKind?: DriverTripKind): DriverTrip | undefined {
  const trips = listTripsForBooking(bookingId)
    .filter(trip => !tripKind || trip.tripKind === tripKind)
    .sort((left, right) => {
      const createdDelta = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      if (createdDelta !== 0) return createdDelta
      return new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime()
    })

  return trips[0]
}

function requestedAtForBooking(bookingId: string): string {
  const order = findOrderByBookingId(bookingId)
  const trip = latestTripForBooking(bookingId, 'delivery') ?? latestTripForBooking(bookingId)
  return order?.createdAt ?? trip?.createdAt ?? new Date().toISOString()
}

function deliveryScheduledAtForBooking(bookingId: string): string | null {
  const order = findOrderByBookingId(bookingId)
  const trip = latestTripForBooking(bookingId, 'delivery')
  return trip?.scheduledAt ?? order?.requestedDeliveryAt ?? null
}

function pickupTripForBooking(bookingId: string): DriverTrip | undefined {
  return latestTripForBooking(bookingId, 'pickup')
}

function nextContainerNumber(): string {
  return `C-${Math.floor(1000 + Math.random() * 9000)}`
}

function transportAmount(invoice: Invoice): number {
  if (invoice.weightKg !== null && invoice.pricePerKg !== null) {
    return roundCurrency(invoice.weightKg * invoice.pricePerKg)
  }
  return BILLING_RATES[invoice.wasteType]
}

function recalculateInvoiceAmount(invoice: Invoice): void {
  invoice.amount = roundCurrency(transportAmount(invoice) + (invoice.damageCharge ?? 0))
}

function syncInvoiceForRetrievedBooking(bookingId: string): Invoice {
  const container = findContainer(bookingId)
  if (!container) {
    throw new Error('Booking not found')
  }

  const site = findSite(container.siteId)
  const order = findOrderByBookingId(bookingId)
  const pickupReport = reportForTrip(bookingId, 'pickup')
  const damageCharge = pickupReport && pickupReport.damageCharge > 0 ? roundCurrency(pickupReport.damageCharge) : null
  let invoice = invoices.find(item => item.bookingId === bookingId)

  if (!invoice) {
    invoice = {
      invoiceId: `inv-${uid()}`,
      customerId: order?.customerId ?? 'cust-demo',
      bookingId,
      siteId: container.siteId,
      wasteType: container.wasteType,
      siteName: site?.name ?? null,
      issuedAt: new Date().toISOString(),
      amount: BILLING_RATES[container.wasteType],
      currency: 'EUR',
      status: 'unpaid',
      weightKg: null,
      pricePerKg: null,
      damageCharge,
    }
    invoices.push(invoice)
  } else {
    invoice.siteId = container.siteId
    invoice.wasteType = container.wasteType
    invoice.siteName = site?.name ?? null
    invoice.damageCharge = damageCharge
  }

  recalculateInvoiceAmount(invoice)
  return invoice
}

function deriveOrderStatus(order: Order): BookingStatus {
  const bookingStates = (order.bookingIds ?? [])
    .map(bookingId => findContainer(bookingId)?.status)
    .filter((status): status is BookingStatus => Boolean(status))

  if (bookingStates.length === 0) return order.status
  if (bookingStates.every(status => status === 'Cancelled')) return 'Cancelled'
  if (bookingStates.every(status => status === 'Closed')) return 'Closed'
  if (bookingStates.every(status => status === 'Retrieved' || status === 'Closed')) {
    return bookingStates.some(status => status === 'Retrieved') ? 'Retrieved' : 'Closed'
  }
  if (bookingStates.some(status => status === 'EmptyRequested')) return 'EmptyRequested'
  if (bookingStates.some(status => status === 'Filling')) return 'Filling'
  if (bookingStates.some(status => status === 'Delivered')) return 'Delivered'
  if (bookingStates.some(status => status === 'Scheduled')) return 'Scheduled'
  if (bookingStates.some(status => status === 'Requested')) return 'Requested'
  return order.status
}

function syncOrderState(order: Order | undefined): void {
  if (!order) return
  order.status = deriveOrderStatus(order)
}

function syncTripsForBooking(bookingId: string): void {
  const container = findContainer(bookingId)
  if (!container) return

  const site = findSite(container.siteId)
  const order = findOrderByBookingId(bookingId)

  listTripsForBooking(bookingId).forEach(trip => {
    trip.siteId = container.siteId
    trip.containerNumber = container.containerNumber
    trip.wasteType = container.wasteType
    trip.bookingStatus = container.status
    trip.siteName = site?.name ?? null
    trip.siteAddress = site?.address ?? null
    trip.siteLat = site?.lat ?? 0
    trip.siteLon = site?.lon ?? 0

    if (order?.assignedDriverId) {
      trip.driverUserId = order.assignedDriverId
    }

    if (trip.tripKind) {
      trip.reportCompletedAt = reportCompletedAt(bookingId, trip.tripKind)
    }

    if (trip.tripKind === 'pickup' && container.expectedEmptyingAt) {
      trip.scheduledAt = container.expectedEmptyingAt
      trip.dayBucket = container.expectedEmptyingAt.slice(0, 10)
    }

    if (
      trip.tripKind === 'delivery' &&
      order?.requestedDeliveryAt &&
      (container.status === 'Requested' || container.status === 'Scheduled')
    ) {
      trip.scheduledAt = order.requestedDeliveryAt
      trip.dayBucket = order.requestedDeliveryAt.slice(0, 10)
    }
  })
}

function syncLinkedState(bookingId: string): void {
  syncTripsForBooking(bookingId)
  syncOrderState(findOrderByBookingId(bookingId))
}

function ensureDeliveryTrip(bookingId: string, scheduledAt?: string | null): void {
  const container = findContainer(bookingId)
  if (!container) return

  const site = findSite(container.siteId)
  const order = findOrderByBookingId(bookingId)
  const deliveryAt = scheduledAt ?? order?.requestedDeliveryAt ?? new Date(Date.now() + 2 * 86400000).toISOString()
  const existingTrip = latestTripForBooking(bookingId, 'delivery')

  if (existingTrip) {
    if (container.status === 'Requested' || container.status === 'Scheduled') {
      existingTrip.scheduledAt = deliveryAt
      existingTrip.dayBucket = deliveryAt.slice(0, 10)
    }
    return
  }

  driverTrips.push({
    dayBucket: deliveryAt.slice(0, 10),
    driverUserId: order?.assignedDriverId ?? 'driver-demo',
    scheduledAt: deliveryAt,
    bookingId,
    customerId: order?.customerId ?? 'cust-demo',
    siteId: container.siteId,
    containerNumber: container.containerNumber,
    wasteType: container.wasteType,
    tripKind: 'delivery',
    bookingStatus: container.status,
    siteName: site?.name ?? null,
    siteAddress: site?.address ?? null,
    siteLat: site?.lat ?? 0,
    siteLon: site?.lon ?? 0,
    createdAt: new Date().toISOString(),
    reportCompletedAt: reportCompletedAt(bookingId, 'delivery'),
  })
}

function ensurePickupTrip(bookingId: string): void {
  const container = findContainer(bookingId)
  if (!container?.expectedEmptyingAt) return

  const site = findSite(container.siteId)
  const order = findOrderByBookingId(bookingId)
  const existingTrip = pickupTripForBooking(bookingId)

  if (existingTrip) {
    existingTrip.scheduledAt = container.expectedEmptyingAt
    existingTrip.dayBucket = container.expectedEmptyingAt.slice(0, 10)
    existingTrip.driverUserId = order?.assignedDriverId ?? existingTrip.driverUserId
    return
  }

  driverTrips.push({
    dayBucket: container.expectedEmptyingAt.slice(0, 10),
    driverUserId: order?.assignedDriverId ?? 'driver-demo',
    scheduledAt: container.expectedEmptyingAt,
    bookingId,
    customerId: order?.customerId ?? 'cust-demo',
    siteId: container.siteId,
    containerNumber: container.containerNumber,
    wasteType: container.wasteType,
    tripKind: 'pickup',
    bookingStatus: container.status,
    siteName: site?.name ?? null,
    siteAddress: site?.address ?? null,
    siteLat: site?.lat ?? 0,
    siteLon: site?.lon ?? 0,
    createdAt: new Date().toISOString(),
    reportCompletedAt: reportCompletedAt(bookingId, 'pickup'),
  })
}

function createOrderInStore(
  siteId: string,
  body: { wasteTypes: WasteType[]; requestedDeliveryAt?: string; notes?: string }
): Order {
  const site = findSite(siteId)
  if (!site) throw new Error('Site not found')
  if (body.wasteTypes.length === 0) throw new Error('At least one waste type is required')

  const orderId = `ord-${uid()}`
  const defaultDeliveryAt = body.requestedDeliveryAt ?? new Date(Date.now() + 2 * 86400000).toISOString()

  const bookingIds = body.wasteTypes.map(wasteType => {
    const bookingId = `bk-${uid()}`
    containers.push({
      bookingId,
      siteId,
      containerNumber: null,
      wasteType,
      status: 'Requested',
      fillLevel: 0,
      lat: site.lat,
      lon: site.lon,
      expectedEmptyingAt: null,
    })
    return bookingId
  })

  const order: Order = {
    orderId,
    customerId: site.customerId,
    siteId,
    createdAt: new Date().toISOString(),
    requestedDeliveryAt: body.requestedDeliveryAt ?? null,
    notes: body.notes ?? null,
    bookingIds,
    status: 'Requested',
    assignedDriverId: null,
    reports: [],
  }

  orders.push(order)

  bookingIds.forEach(bookingId => {
    ensureDeliveryTrip(bookingId, defaultDeliveryAt)
    syncLinkedState(bookingId)
  })

  return order
}

function normalizeMockState(): void {
  invoices.forEach(invoice => {
    recalculateInvoiceAmount(invoice)
    const container = findContainer(invoice.bookingId)
    if (!container) return
    if (invoice.status === 'paid' && (container.status === 'Retrieved' || container.status === 'Closed')) {
      container.status = 'Closed'
    }
  })

  containers.forEach(container => syncTripsForBooking(container.bookingId))
  orders.forEach(order => syncOrderState(order))
}

normalizeMockState()

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
        customerId: findOrderByBookingId(c.bookingId)?.customerId ?? 'cust-demo',
        wasteType: c.wasteType,
        status: c.status,
        assignedContainerNumber: c.containerNumber,
        requestedAt: requestedAtForBooking(c.bookingId),
        scheduledDeliveryAt: deliveryScheduledAtForBooking(c.bookingId),
        expectedEmptyingAt: c.expectedEmptyingAt,
        currentFillLevel: c.fillLevel,
      }))
    return delay(result)
  },

  createOrder(
    siteId: string,
    body: { wasteTypes: WasteType[]; requestedDeliveryAt?: string; notes?: string }
  ): Promise<Order> {
    try {
      const order = createOrderInStore(siteId, body)
      return delay(cloneOrder(order))
    } catch (error) {
      return Promise.reject(error)
    }
  },

  listAnfahrten(siteId: string): Promise<Anfahrt[]> {
    return delay([...(anfahrtenMap[siteId] ?? [])])
  },

  uploadAnfahrt(siteId: string, form: FormData): Promise<Anfahrt> {
    const site = findSite(siteId)
    if (!site) return Promise.reject(new Error('Site not found'))

    const video = form.get('video')
    if (!(video instanceof Blob)) {
      return Promise.reject(new Error('No anfahrt video uploaded'))
    }

    const parsedLat = Number(form.get('lat'))
    const parsedLon = Number(form.get('lon'))
    const orientationNoteValue = form.get('orientationNote')
    const orientationNote = typeof orientationNoteValue === 'string'
      ? orientationNoteValue
      : site.orientationNote
    const anfahrtId = `anf-${uid()}`
    const anfahrt: Anfahrt = {
      siteId,
      anfahrtId,
      uploadedByUserId: 'cust-demo',
      uploadedAt: new Date().toISOString(),
      lat: Number.isFinite(parsedLat) ? parsedLat : site.lat,
      lon: Number.isFinite(parsedLon) ? parsedLon : site.lon,
      orientationNote: orientationNote ?? null,
      videoStorageKey: anfahrtId,
      videoContentType: video.type || 'video/webm',
      videoSizeBytes: video.size,
    }
    // Store an object URL so the video can be played back in-session
    videoUrls[anfahrtId] = URL.createObjectURL(video)
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
  const order = findOrderByBookingId(c.bookingId)
  const pickupTrip = pickupTripForBooking(c.bookingId)
  const deliveryAt = deliveryScheduledAtForBooking(c.bookingId)
  const invoice = invoices.find(item => item.bookingId === c.bookingId)

  return {
    bookingId: c.bookingId,
    customerId: order?.customerId ?? 'cust-demo',
    siteId: c.siteId,
    orderId: order?.orderId ?? '',
    wasteType: c.wasteType,
    assignedContainerNumber: c.containerNumber,
    status: c.status,
    requestedAt: order?.createdAt ?? requestedAtForBooking(c.bookingId),
    scheduledDeliveryAt: deliveryAt,
    deliveredAt: c.status === 'Delivered' || c.status === 'Filling' || c.status === 'EmptyRequested' || c.status === 'Retrieved' || c.status === 'Closed'
      ? deliveryAt
      : null,
    emptyRequestedAt: c.status === 'EmptyRequested' || c.status === 'Retrieved' || c.status === 'Closed'
      ? pickupTrip?.createdAt ?? pickupTrip?.scheduledAt ?? c.expectedEmptyingAt
      : null,
    expectedEmptyingAt: c.expectedEmptyingAt,
    retrievedAt: c.status === 'Retrieved' || c.status === 'Closed'
      ? invoice?.issuedAt ?? pickupTrip?.scheduledAt ?? null
      : null,
    currentFillLevel: c.fillLevel,
    notes: order?.notes ?? null,
  }
}

export const containersApi = {
  list(): Promise<CustomerContainerView[]> {
    normalizeMockState()
    return delay([...containers])
  },

  requestContainer(body: {
    siteId: string
    wasteType: WasteType
    requestedDeliveryAt?: string
    notes?: string
  }): Promise<ContainerBooking> {
    try {
      const order = createOrderInStore(body.siteId, {
        wasteTypes: [body.wasteType],
        requestedDeliveryAt: body.requestedDeliveryAt,
        notes: body.notes,
      })
      const bookingId = order.bookingIds?.[0]
      const container = bookingId ? findContainer(bookingId) : undefined
      if (!container) return Promise.reject(new Error('Booking not found'))
      return delay(containerToBooking(container))
    } catch (error) {
      return Promise.reject(error)
    }
  },

  updateFill(bookingId: string, fillLevel: number, _note?: string): Promise<ContainerBooking> {
    const c = containers.find(x => x.bookingId === bookingId)
    if (!c) return Promise.reject(new Error('Booking not found'))
    c.fillLevel = Math.max(0, Math.min(1, fillLevel))
    if (c.status === 'Delivered') c.status = 'Filling'
    syncLinkedState(bookingId)
    return delay(containerToBooking(c))
  },

  requestEmptying(bookingId: string, preferredAt?: string): Promise<ContainerBooking> {
    const c = containers.find(x => x.bookingId === bookingId)
    if (!c) return Promise.reject(new Error('Booking not found'))
    c.status = 'EmptyRequested'
    c.expectedEmptyingAt = preferredAt ?? new Date(Date.now() + 2 * 86400000).toISOString()
    ensurePickupTrip(bookingId)
    syncLinkedState(bookingId)
    return delay(containerToBooking(c))
  },
}

// ---- Driver API ----

export const driverApi = {
  trips(_days = 2): Promise<DriverTrip[]> {
    normalizeMockState()
    return delay([...driverTrips].sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()).map(cloneTrip))
  },

  submitTripReport(
    bookingId: string,
    tripKind: DriverTripKind,
    body: {
      driverId: string
      signerName: string
      signatureDataUrl: string
      damageNotes?: string
      damageCharge?: number
      photos: Array<{ side: DriverReportPhotoSide; imageUrl: string }>
    }
  ): Promise<Order> {
    const order = findOrderByBookingId(bookingId)
    const container = findContainer(bookingId)

    if (!order || !container) return Promise.reject(new Error('Booking not found'))
    if (reportForTrip(bookingId, tripKind)) return Promise.reject(new Error('A report for this trip already exists'))

    const signerName = body.signerName.trim()
    if (!signerName) return Promise.reject(new Error('Signer name is required'))
    if (!body.signatureDataUrl.trim()) return Promise.reject(new Error('Customer signature is required'))

    const uniqueSides = new Set(body.photos.map(photo => photo.side))
    const hasAllRequiredPhotos = REQUIRED_REPORT_SIDES.every(side => uniqueSides.has(side))
    if (body.photos.length !== REQUIRED_REPORT_SIDES.length || !hasAllRequiredPhotos) {
      return Promise.reject(new Error('Exactly four side photos are required'))
    }

    const normalizedDamageCharge = tripKind === 'pickup'
      ? roundCurrency(Math.max(0, body.damageCharge ?? 0))
      : 0
    const damageNotes = body.damageNotes?.trim() ?? ''
    if (tripKind === 'pickup' && normalizedDamageCharge > 0 && !damageNotes) {
      return Promise.reject(new Error('Damage notes are required when charging for damages'))
    }

    const createdAt = new Date().toISOString()
    const photos = REQUIRED_REPORT_SIDES.map(side => {
      const photo = body.photos.find(item => item.side === side)
      return {
        side,
        imageUrl: photo?.imageUrl ?? '',
        capturedAt: createdAt,
      }
    })

    order.reports.push({
      reportId: `rpt-${uid()}`,
      bookingId,
      tripKind,
      createdAt,
      createdByDriverId: body.driverId,
      signerName,
      signatureDataUrl: body.signatureDataUrl,
      damageNotes: damageNotes || null,
      damageCharge: normalizedDamageCharge,
      photos,
    })

    if (tripKind === 'delivery') {
      if (container.status === 'Requested' || container.status === 'Scheduled') {
        container.status = 'Delivered'
        container.fillLevel = 0
      }
      if (!container.containerNumber) {
        container.containerNumber = nextContainerNumber()
      }

      const site = findSite(container.siteId)
      container.lat = site?.lat ?? container.lat
      container.lon = site?.lon ?? container.lon
      syncLinkedState(bookingId)
      return delay(cloneOrder(order))
    }

    markContainerRetrieved(bookingId)
    return delay(cloneOrder(order))
  },
}

// ---- Admin API ----

export const adminApi = {
  listOrders(): Promise<Order[]> {
    normalizeMockState()
    return delay([...orders].reverse().map(cloneOrder))
  },

  assignDriver(orderId: string, driverId: string): Promise<Order> {
    const o = orders.find(x => x.orderId === orderId)
    if (!o) return Promise.reject(new Error('Order not found'))
    o.assignedDriverId = driverId
    // update the linked driver trips
    if (o.bookingIds) {
      o.bookingIds.forEach(bkId => {
        const c = containers.find(x => x.bookingId === bkId)
        if (c && (c.status === 'Requested' || c.status === 'Scheduled')) {
          c.status = 'Scheduled'
        }
        ensureDeliveryTrip(bkId)
        syncLinkedState(bkId)
      })
    }
    syncOrderState(o)
    return delay(cloneOrder(o))
  },

  listSites(): Promise<Site[]> {
    return delay([...sites])
  },

  listContainers(): Promise<CustomerContainerView[]> {
    normalizeMockState()
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

export const ordersApi = {
  listForCustomer(customerId: string): Promise<Order[]> {
    normalizeMockState()
    return delay(orders.filter(order => order.customerId === customerId).reverse().map(cloneOrder))
  },
}

// ---- Invoice API ----

export const invoiceApi = {
  listForCustomer(customerId: string): Promise<Invoice[]> {
    normalizeMockState()
    return delay(invoices.filter(i => i.customerId === customerId).reverse())
  },

  listAll(): Promise<Invoice[]> {
    normalizeMockState()
    return delay([...invoices].reverse())
  },

  applyTransportWeight(invoiceId: string, weightKg: number, pricePerKg: number): Promise<Invoice> {
    const inv = invoices.find(i => i.invoiceId === invoiceId)
    if (!inv) return Promise.reject(new Error('Invoice not found'))
    inv.weightKg = weightKg
    inv.pricePerKg = pricePerKg
    recalculateInvoiceAmount(inv)
    return delay({ ...inv })
  },

  markPaid(invoiceId: string): Promise<Invoice> {
    const inv = invoices.find(i => i.invoiceId === invoiceId)
    if (!inv) return Promise.reject(new Error('Invoice not found'))
    inv.status = 'paid'
    const container = findContainer(inv.bookingId)
    if (container && (container.status === 'Retrieved' || container.status === 'Closed')) {
      container.status = 'Closed'
      syncLinkedState(inv.bookingId)
    }
    return delay({ ...inv })
  },
}

// Create an invoice when a container is retrieved
export function markContainerRetrieved(bookingId: string): void {
  const c = containers.find(x => x.bookingId === bookingId)
  if (!c) return
  c.status = 'Retrieved'
  c.fillLevel = 1
  c.lat = null
  c.lon = null

  syncInvoiceForRetrievedBooking(bookingId)

  syncLinkedState(bookingId)
}
