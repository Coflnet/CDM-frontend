export function setToken(token: string): void {
  localStorage.setItem('cdm_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('cdm_token')
}

export function hasToken(): boolean {
  return !!localStorage.getItem('cdm_token')
}

export type WasteType = 'Mixed' | 'Wood' | 'Metal' | 'Concrete' | 'Paper' | 'Plastic' | 'Organic' | 'Electronics'
export type BookingStatus = 'Requested' | 'Scheduled' | 'Delivered' | 'Filling' | 'EmptyRequested' | 'Retrieved' | 'Closed' | 'Cancelled'
export type ContainerStatus = 'InYard' | 'InTransit' | 'OnSite' | 'ReadyForPickup' | 'AtWeighStation' | 'Decommissioned'
export type ContainerSize = 'Small' | 'Medium' | 'Large' | 'Roll'
export type DriverTripKind = 'delivery' | 'pickup'
export type DriverReportPhotoSide = 'front' | 'right' | 'back' | 'left'
export type UserRole = 'customer' | 'driver' | 'admin' | 'superadmin'

export interface CompanyRole {
  userId: string
  companyId: string
  role: UserRole
  email: string
  assignedAt: string
  assignedBy: string
}

export interface CustomerProfile {
  userId: string
  companyName: string
  contactName: string
  email: string
  phone: string
  billingAddress: string
  vatId: string
  createdAt: string
}

export interface MeProfile {
  userId: string
  roles: UserRole[]
  companyRoles: CompanyRole[]
  profile: CustomerProfile | null
}

export interface ContainerCompany {
  companyId: string
  name: string
  slug: string
  contactEmail: string
  baseZipCode: string
  baseLat: number | null
  baseLon: number | null
  active: boolean
  createdAt: string
}

export interface ApiTokenInfo {
  tokenId: string
  name: string
  createdAt: string
  expiresAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export interface CreatedApiToken extends ApiTokenInfo {
  token: string
}

export interface Site {
  siteId: string
  customerId: string
  companyId: string | null
  name: string | null
  address: string | null
  zipCode: string
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
  companyId?: string
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
  companyId?: string
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
  companyId?: string
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
  companyId?: string
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

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api').replace(/\/+$/, '')

function apiPath(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = localStorage.getItem('cdm_token')
  if (token) {
    // CDM API tokens use a custom header; Firebase ID tokens go through Authorization.
    if (token.startsWith('cdm_')) headers.set('X-CDM-API-Token', token)
    else headers.set('Authorization', `Bearer ${token}`)
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiPath(path), { ...init, headers })
  if (!response.ok) {
    const text = await response.text()
    let message = text || response.statusText
    try {
      const parsed = JSON.parse(text)
      message = parsed.title || parsed.message || parsed.detail || message
    } catch {
      // Keep raw server text.
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function iso(value: unknown): string {
  return typeof value === 'string' ? value : new Date().toISOString()
}

function maybeIso(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function normalizeSite(row: any): Site {
  return {
    siteId: String(row.siteId ?? row.SiteId ?? ''),
    customerId: String(row.customerId ?? row.CustomerId ?? ''),
    companyId: row.companyId ?? row.CompanyId ?? null,
    name: row.name ?? row.Name ?? null,
    address: row.address ?? row.Address ?? null,
    zipCode: row.zipCode ?? row.ZipCode ?? '',
    lat: Number(row.lat ?? row.Lat ?? 0),
    lon: Number(row.lon ?? row.Lon ?? 0),
    orientationNote: row.orientationNote ?? row.OrientationNote ?? null,
    createdAt: iso(row.createdAt ?? row.CreatedAt),
    active: Boolean(row.active ?? row.Active ?? true),
  }
}

function normalizeContainer(row: any): CustomerContainerView {
  return {
    bookingId: String(row.bookingId ?? row.BookingId ?? ''),
    siteId: String(row.siteId ?? row.SiteId ?? ''),
    containerNumber: row.containerNumber ?? row.ContainerNumber ?? row.assignedContainerNumber ?? null,
    wasteType: row.wasteType ?? row.WasteType ?? 'Mixed',
    status: row.status ?? row.Status ?? row.bookingStatus ?? 'Requested',
    fillLevel: Number(row.fillLevel ?? row.FillLevel ?? row.currentFillLevel ?? row.CurrentFillLevel ?? 0),
    lat: row.lat ?? row.Lat ?? null,
    lon: row.lon ?? row.Lon ?? null,
    expectedEmptyingAt: maybeIso(row.expectedEmptyingAt ?? row.ExpectedEmptyingAt),
  }
}

function normalizeBooking(row: any): ContainerBooking {
  return {
    bookingId: String(row.bookingId ?? row.BookingId ?? ''),
    customerId: String(row.customerId ?? row.CustomerId ?? ''),
    companyId: row.companyId ?? row.CompanyId,
    siteId: String(row.siteId ?? row.SiteId ?? ''),
    orderId: String(row.orderId ?? row.OrderId ?? ''),
    wasteType: row.wasteType ?? row.WasteType ?? 'Mixed',
    assignedContainerNumber: row.assignedContainerNumber ?? row.AssignedContainerNumber ?? null,
    status: row.status ?? row.Status ?? 'Requested',
    requestedAt: iso(row.requestedAt ?? row.RequestedAt),
    scheduledDeliveryAt: maybeIso(row.scheduledDeliveryAt ?? row.ScheduledDeliveryAt),
    deliveredAt: maybeIso(row.deliveredAt ?? row.DeliveredAt),
    emptyRequestedAt: maybeIso(row.emptyRequestedAt ?? row.EmptyRequestedAt),
    expectedEmptyingAt: maybeIso(row.expectedEmptyingAt ?? row.ExpectedEmptyingAt),
    retrievedAt: maybeIso(row.retrievedAt ?? row.RetrievedAt),
    currentFillLevel: Number(row.currentFillLevel ?? row.CurrentFillLevel ?? 0),
    notes: row.notes ?? row.Notes ?? null,
  }
}

function normalizeOrder(row: any): Order {
  return {
    orderId: String(row.orderId ?? row.OrderId ?? ''),
    customerId: String(row.customerId ?? row.CustomerId ?? ''),
    companyId: row.companyId ?? row.CompanyId,
    siteId: String(row.siteId ?? row.SiteId ?? ''),
    createdAt: iso(row.createdAt ?? row.CreatedAt),
    requestedDeliveryAt: maybeIso(row.requestedDeliveryAt ?? row.RequestedDeliveryAt),
    notes: row.notes ?? row.Notes ?? null,
    bookingIds: normalizeArray<string>(row.bookingIds ?? row.BookingIds).map(String),
    status: row.status ?? row.Status ?? 'Requested',
    assignedDriverId: row.assignedDriverId ?? row.AssignedDriverId ?? null,
    reports: normalizeArray<DriverReport>(row.reports ?? row.Reports),
  }
}

function normalizeTrip(row: any): DriverTrip {
  return {
    dayBucket: row.dayBucket ?? row.DayBucket ?? null,
    driverUserId: String(row.driverUserId ?? row.DriverUserId ?? ''),
    scheduledAt: iso(row.scheduledAt ?? row.ScheduledAt),
    bookingId: String(row.bookingId ?? row.BookingId ?? ''),
    customerId: String(row.customerId ?? row.CustomerId ?? ''),
    companyId: row.companyId ?? row.CompanyId,
    siteId: String(row.siteId ?? row.SiteId ?? ''),
    containerNumber: row.containerNumber ?? row.ContainerNumber ?? null,
    wasteType: row.wasteType ?? row.WasteType ?? 'Mixed',
    tripKind: row.tripKind ?? row.TripKind ?? null,
    bookingStatus: row.bookingStatus ?? row.BookingStatus ?? 'Requested',
    siteName: row.siteName ?? row.SiteName ?? null,
    siteAddress: row.siteAddress ?? row.SiteAddress ?? null,
    siteLat: Number(row.siteLat ?? row.SiteLat ?? 0),
    siteLon: Number(row.siteLon ?? row.SiteLon ?? 0),
    createdAt: iso(row.createdAt ?? row.CreatedAt),
    reportCompletedAt: maybeIso(row.reportCompletedAt ?? row.ReportCompletedAt),
  }
}

function normalizeAnfahrt(row: any): Anfahrt {
  return {
    siteId: String(row.siteId ?? row.SiteId ?? ''),
    anfahrtId: String(row.anfahrtId ?? row.AnfahrtId ?? ''),
    uploadedByUserId: String(row.uploadedByUserId ?? row.UploadedByUserId ?? ''),
    uploadedAt: iso(row.uploadedAt ?? row.UploadedAt),
    lat: Number(row.lat ?? row.Lat ?? 0),
    lon: Number(row.lon ?? row.Lon ?? 0),
    orientationNote: row.orientationNote ?? row.OrientationNote ?? null,
    videoStorageKey: row.videoStorageKey ?? row.VideoStorageKey ?? null,
    videoContentType: row.videoContentType ?? row.VideoContentType ?? null,
    videoSizeBytes: Number(row.videoSizeBytes ?? row.VideoSizeBytes ?? 0),
  }
}

function normalizeInvoice(row: any): Invoice {
  return {
    invoiceId: String(row.invoiceId ?? row.InvoiceId ?? ''),
    customerId: String(row.customerId ?? row.CustomerId ?? ''),
    bookingId: String(row.bookingId ?? row.BookingId ?? ''),
    siteId: String(row.siteId ?? row.SiteId ?? ''),
    wasteType: row.wasteType ?? row.WasteType ?? 'Mixed',
    siteName: row.siteName ?? row.SiteName ?? null,
    issuedAt: iso(row.issuedAt ?? row.IssuedAt),
    amount: Number(row.amount ?? row.Amount ?? row.totalGross ?? row.TotalGross ?? 0),
    currency: row.currency ?? row.Currency ?? 'EUR',
    status: (row.status ?? row.Status ?? (row.paid ?? row.Paid ? 'paid' : 'unpaid')) as 'paid' | 'unpaid',
    weightKg: row.weightKg ?? row.WeightKg ?? null,
    pricePerKg: row.pricePerKg ?? row.PricePerKg ?? null,
    damageCharge: row.damageCharge ?? row.DamageCharge ?? null,
  }
}

function normalizeIssue(row: any): ErrorLog {
  const severity = row.severity ?? row.Severity ?? 'info'
  const level = severity === 2 || severity === 3 || String(severity).toLowerCase() === 'error' || String(severity).toLowerCase() === 'critical'
    ? 'error'
    : severity === 1 || String(severity).toLowerCase() === 'warning'
      ? 'warn'
      : 'info'
  return {
    logId: String(row.logId ?? row.issueId ?? row.IssueId ?? ''),
    occurredAt: iso(row.occurredAt ?? row.createdAt ?? row.CreatedAt),
    level,
    message: row.message ?? row.title ?? row.Title ?? '',
    context: row.context ?? row.relatedEntity ?? row.RelatedEntity ?? null,
  }
}

export const meApi = {
  get(): Promise<MeProfile> {
    return request<MeProfile>('/me')
  },

  register(email: string, contactName?: string): Promise<MeProfile> {
    return request<MeProfile>('/me/register', {
      method: 'POST',
      body: JSON.stringify({ email, contactName }),
    })
  },

  listApiTokens(): Promise<ApiTokenInfo[]> {
    return request<ApiTokenInfo[]>('/me/api-tokens')
  },

  createApiToken(name?: string): Promise<CreatedApiToken> {
    return request<CreatedApiToken>('/me/api-tokens', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  revokeApiToken(tokenId: string): Promise<void> {
    return request<void>(`/me/api-tokens/${tokenId}`, { method: 'DELETE' })
  },
}

export interface TestLoginResponse {
  token: string
  userId: string
  role: UserRole
  companyId: string
  email: string
}

export const testAuthApi = {
  /** Test-only login; backend must have CDM_TESTING_ENABLED=true. */
  login(role: UserRole): Promise<TestLoginResponse> {
    return request<TestLoginResponse>(`/test/login?role=${encodeURIComponent(role)}`, {
      method: 'POST',
    })
  },
}

export const sitesApi = {
  async list(): Promise<Site[]> {
    return (await request<any[]>('/my/sites')).map(normalizeSite)
  },

  async get(siteId: string): Promise<Site> {
    return normalizeSite(await request<any>(`/my/sites/${siteId}`))
  },

  async create(body: { name: string; address: string; zipCode?: string; lat: number; lon: number; orientationNote?: string }): Promise<Site> {
    return normalizeSite(await request<any>('/my/sites', {
      method: 'POST',
      body: JSON.stringify(body),
    }))
  },

  async listContainers(siteId: string): Promise<BookingBySite[]> {
    return request<BookingBySite[]>(`/my/sites/${siteId}/containers`)
  },

  async createOrder(
    siteId: string,
    body: {
      wasteTypes: WasteType[]
      requestedDeliveryAt?: string
      notes?: string
      containerVariantId?: string
      placementPhotoKey?: string
      permitNumber?: string
      permitExpiresAt?: string
      permitPhotoKey?: string
    }
  ): Promise<Order> {
    return normalizeOrder(await request<any>(`/my/sites/${siteId}/orders`, {
      method: 'POST',
      body: JSON.stringify(body),
    }))
  },

  async listAnfahrten(siteId: string): Promise<Anfahrt[]> {
    return (await request<any[]>(`/my/sites/${siteId}/anfahrten`)).map(normalizeAnfahrt)
  },

  uploadAnfahrt(siteId: string, form: FormData): Promise<Anfahrt> {
    return request<any>(`/my/sites/${siteId}/anfahrten`, { method: 'POST', body: form }).then(normalizeAnfahrt)
  },

  videoUrl(siteId: string, anfahrtId: string): string {
    return apiPath(`/my/sites/${siteId}/anfahrten/${anfahrtId}/video`)
  },
}

export const containersApi = {
  async list(): Promise<CustomerContainerView[]> {
    return (await request<any[]>('/my/containers')).map(normalizeContainer)
  },

  async requestContainer(body: { siteId: string; wasteType: WasteType; requestedDeliveryAt?: string; notes?: string }): Promise<ContainerBooking> {
    return normalizeBooking(await request<any>('/my/containers', {
      method: 'POST',
      body: JSON.stringify(body),
    }))
  },

  async updateFill(bookingId: string, fillLevel: number, note?: string): Promise<ContainerBooking> {
    return normalizeBooking(await request<any>(`/my/containers/${bookingId}/fill`, {
      method: 'POST',
      body: JSON.stringify({ fillLevel, note }),
    }))
  },

  async requestEmptying(bookingId: string, preferredAt?: string): Promise<ContainerBooking> {
    const query = preferredAt ? `?preferredAt=${encodeURIComponent(preferredAt)}` : ''
    return normalizeBooking(await request<any>(`/my/containers/${bookingId}/empty${query}`, { method: 'POST' }))
  },
}

export const driverApi = {
  async trips(days = 2): Promise<DriverTrip[]> {
    return (await request<any[]>(`/driver/trips?days=${days}`)).map(normalizeTrip)
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
    return request<any>(`/driver/trips/${bookingId}/report`, {
      method: 'POST',
      body: JSON.stringify({ ...body, tripKind }),
    }).then(normalizeOrder)
  },
}

export const adminApi = {
  async listOrders(): Promise<Order[]> {
    return (await request<any[]>('/admin/orders')).map(normalizeOrder)
  },

  assignDriver(orderId: string, driverId: string): Promise<Order> {
    return request<any>(`/admin/orders/${orderId}/assign-driver`, {
      method: 'POST',
      body: JSON.stringify({ driverId }),
    }).then(normalizeOrder)
  },

  async listSites(): Promise<Site[]> {
    return (await request<any[]>('/admin/sites')).map(normalizeSite)
  },

  async listContainers(): Promise<CustomerContainerView[]> {
    return (await request<any[]>('/admin/containers')).map(normalizeContainer)
  },

  async listErrorLogs(): Promise<ErrorLog[]> {
    return (await request<any[]>('/admin/issues')).map(normalizeIssue)
  },

  addErrorLog(_level: ErrorLog['level'], _message: string, _context?: string): void {
    // Operational issues are backend-generated in the real API.
  },

  async listDrivers(): Promise<Driver[]> {
    return (await request<any[]>('/admin/drivers')).map(row => ({
      driverId: String(row.driverId ?? row.DriverId ?? ''),
      name: String(row.name ?? row.Name ?? row.email ?? row.Email ?? ''),
    }))
  },

  listCompanies(): Promise<ContainerCompany[]> {
    return request<ContainerCompany[]>('/admin/companies')
  },

  createCompany(body: { name: string; slug?: string; contactEmail?: string; baseZipCode?: string; baseLat?: number; baseLon?: number }): Promise<ContainerCompany> {
    return request<ContainerCompany>('/admin/companies', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  assignCompanyUser(companyId: string, email: string, role: 'admin' | 'driver'): Promise<void> {
    return request<void>(`/admin/companies/${companyId}/users`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    })
  },
}

export const ordersApi = {
  async listForCustomer(_customerId?: string): Promise<Order[]> {
    return (await request<any[]>('/my/orders')).map(normalizeOrder)
  },
}

export const invoiceApi = {
  async listForCustomer(_customerId?: string): Promise<Invoice[]> {
    const sites = await sitesApi.list()
    const nested = await Promise.all(sites.map(async site => {
      const rows = await request<any[]>(`/my/sites/${site.siteId}/invoices`)
      return rows.map(row => normalizeInvoice({ ...row, siteName: site.name }))
    }))
    return nested.flat().sort((left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime())
  },

  async listAll(): Promise<Invoice[]> {
    return (await request<any[]>('/admin/invoices')).map(normalizeInvoice)
  },

  applyTransportWeight(_invoiceId: string, _weightKg: number, _pricePerKg: number): Promise<Invoice> {
    return Promise.reject(new Error('Weight assignment is handled by the backend import flow.'))
  },

  markPaid(_invoiceId: string): Promise<Invoice> {
    return Promise.reject(new Error('Invoice payment marking is not available yet.'))
  },
}

export function markContainerRetrieved(bookingId: string): Promise<void> {
  return request<void>(`/admin/bookings/${bookingId}/retrieved`, { method: 'POST' })
}

export interface PriceQuote {
  variantId: string
  wasteType: WasteType
  priceCents: number
  currency: string
}

export const customerExtrasApi = {
  async getPrice(variantId: string, wasteType: WasteType): Promise<PriceQuote> {
    return request<PriceQuote>(`/my/pricing?variantId=${encodeURIComponent(variantId)}&wasteType=${encodeURIComponent(wasteType)}`)
  },

  async uploadPlacementPhoto(file: File): Promise<{ storageKey: string }> {
    const fd = new FormData()
    fd.append('photo', file)
    return request<{ storageKey: string }>('/my/uploads/placement-photo', { method: 'POST', body: fd })
  },

  async uploadPermitPhoto(orderId: string, file: File): Promise<{ storageKey: string; orderId: string }> {
    const fd = new FormData()
    fd.append('photo', file)
    return request<any>(`/my/orders/${orderId}/permit-photo`, { method: 'POST', body: fd })
  },

  async updatePermit(orderId: string, body: { permitNumber?: string; permitExpiresAt?: string; permitPhotoKey?: string }): Promise<Order> {
    return normalizeOrder(await request<any>(`/my/orders/${orderId}/permit`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }))
  },

  async swapBooking(bookingId: string, body: { containerVariantId?: string; requestedDeliveryAt?: string; notes?: string }): Promise<{ pickupBookingId: string; deliveryOrderId: string; deliveryBookingIds: string[] }> {
    return request<any>(`/my/bookings/${bookingId}/swap`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  async signDelivery(bookingId: string, signatureBlob: Blob, signerPrintedName: string, geo?: { lat: number; lon: number }): Promise<void> {
    const fd = new FormData()
    fd.append('signature', signatureBlob, 'signature.png')
    fd.append('signerPrintedName', signerPrintedName)
    if (geo) { fd.append('geoLat', String(geo.lat)); fd.append('geoLon', String(geo.lon)) }
    await request<any>(`/my/bookings/${bookingId}/delivery-signature`, { method: 'POST', body: fd })
  },

  co2CertificateUrl(bookingId: string, weightKg?: number): string {
    const q = weightKg ? `?weightKg=${weightKg}` : ''
    return apiPath(`/my/bookings/${bookingId}/co2-certificate${q}`)
  },

  abfallnachweisUrl(bookingId: string, weightKg?: number): string {
    const q = weightKg ? `?weightKg=${weightKg}` : ''
    return apiPath(`/my/bookings/${bookingId}/abfallnachweis${q}`)
  },
}
