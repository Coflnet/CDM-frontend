import type { BookingStatus, ContainerSize, WasteType, DriverTripKind, DriverReportPhotoSide } from './api'

/**
 * Container catalog – aligned with the Leitl Recycling line-up
 * (https://www.leitl.de/recycling/was-kommt-zum-wertstoffhof/containerservice/).
 *
 * Used by the order flow to let customers pick a concrete container variant
 * (instead of an abstract size enum) and by the public landing page to
 * showcase what is available.
 */
export type ContainerKind = 'Absetz' | 'Abroll'

export interface ContainerVariant {
  /** Stable identifier persisted with the order. */
  id: string
  /** German display label, matches the wording on leitl.de. */
  label: string
  /** Mechanical handling category. */
  kind: ContainerKind
  /** Capacity in cubic metres. */
  volumeM3: number
  /** Whether the container has a closing lid / flap. */
  hasLid: boolean
  /** Coarse size bucket used by the dispatcher / pricing logic. */
  sizeBucket: ContainerSize
  /** Short customer-facing description (use cases). */
  description: string
  /** Waste types that fit best into this container. */
  suitableWasteTypes: WasteType[]
  /** Approximate footprint (LxBxH) in metres for placement planning. */
  footprint: string
}

export const LEITL_CONTAINERS: ContainerVariant[] = [
  {
    id: 'absetz-3-offen',
    label: 'Absetzcontainer 3 m³ offen',
    kind: 'Absetz',
    volumeM3: 3,
    hasLid: false,
    sizeBucket: 'Small',
    description: 'Kompakter Mini-Container für kleine Mengen Bauschutt, Erdaushub oder schweren Schrott. Passt auch in enge Hofeinfahrten.',
    suitableWasteTypes: ['Concrete', 'Metal', 'Mixed'],
    footprint: '2,7 × 1,5 × 0,9 m',
  },
  {
    id: 'absetz-7-offen',
    label: 'Absetzcontainer 7 m³ offen',
    kind: 'Absetz',
    volumeM3: 7,
    hasLid: false,
    sizeBucket: 'Medium',
    description: 'Klassiker für Renovierungs- und Entrümpelungsprojekte. Schnell von oben zu beladen, ideal für sperrige Stücke.',
    suitableWasteTypes: ['Mixed', 'Wood', 'Metal'],
    footprint: '3,5 × 1,8 × 1,3 m',
  },
  {
    id: 'absetz-7-klappe',
    label: 'Absetzcontainer 7 m³ mit Klappe',
    kind: 'Absetz',
    volumeM3: 7,
    hasLid: true,
    sizeBucket: 'Medium',
    description: 'Wie die offene 7 m³-Variante, zusätzlich mit Stirnklappe – Schubkarren und Paletten lassen sich bequem hineinrollen.',
    suitableWasteTypes: ['Mixed', 'Wood', 'Concrete'],
    footprint: '3,5 × 1,8 × 1,3 m',
  },
  {
    id: 'absetz-10-offen',
    label: 'Absetzcontainer 10 m³ offen',
    kind: 'Absetz',
    volumeM3: 10,
    hasLid: false,
    sizeBucket: 'Large',
    description: 'Größerer Absetzcontainer für mittlere Baustellen oder Sperrmüll. Offen, daher nicht für Stoffe geeignet, die nicht regennass werden dürfen.',
    suitableWasteTypes: ['Mixed', 'Wood', 'Metal'],
    footprint: '4,0 × 2,0 × 1,5 m',
  },
  {
    id: 'absetz-10-deckel',
    label: 'Absetzcontainer 10 m³ mit Deckel',
    kind: 'Absetz',
    volumeM3: 10,
    hasLid: true,
    sizeBucket: 'Large',
    description: 'Geschlossene 10 m³-Variante mit Deckel – schützt vor Regen, verhindert Fremdwurf und ist daher die richtige Wahl für Akten, Papier oder Folien.',
    suitableWasteTypes: ['Paper', 'Plastic', 'Mixed', 'Electronics'],
    footprint: '4,0 × 2,0 × 1,5 m',
  },
  {
    id: 'abroll-36-offen',
    label: 'Abrollcontainer 36 m³ offen',
    kind: 'Abroll',
    volumeM3: 36,
    hasLid: false,
    sizeBucket: 'Roll',
    description: 'Großer Abrollcontainer für umfangreiche Bau-, Abriss- oder Räumungsprojekte. Wird per Hakenlift geliefert und abgeholt.',
    suitableWasteTypes: ['Mixed', 'Wood', 'Metal'],
    footprint: '6,5 × 2,4 × 2,5 m',
  },
  {
    id: 'abroll-36-deckel',
    label: 'Abrollcontainer 36 m³ mit Deckel',
    kind: 'Abroll',
    volumeM3: 36,
    hasLid: true,
    sizeBucket: 'Roll',
    description: 'Geschlossener Abrollcontainer – maximales Volumen, gegen Regen und Fremdwurf geschützt. Ideal für Folien, Kartonagen, Sperrmüll.',
    suitableWasteTypes: ['Paper', 'Plastic', 'Mixed', 'Wood'],
    footprint: '6,5 × 2,4 × 2,7 m',
  },
]

export function getContainerVariant(id: string | null | undefined): ContainerVariant | undefined {
  if (!id) return undefined
  return LEITL_CONTAINERS.find(c => c.id === id)
}

export function suggestContainerVariants(wasteType: WasteType): ContainerVariant[] {
  const matches = LEITL_CONTAINERS.filter(c => c.suitableWasteTypes.includes(wasteType))
  return matches.length > 0 ? matches : LEITL_CONTAINERS
}

// Heavy materials: effective fill cap is 25% of physical volume
export const HEAVY_WASTE_TYPES: WasteType[] = ['Metal', 'Concrete', 'Electronics']

export function effectiveMaxFill(wasteType: WasteType): number {
  return HEAVY_WASTE_TYPES.includes(wasteType) ? 25 : 100
}

// Mirror of HazardousWaste.IsHazardous on the backend. Used to decide
// whether a booking is eligible for the Abfallnachweis-Light PDF.
export const HAZARDOUS_WASTE_TYPES: WasteType[] = ['Electronics']
export function isHazardousWasteType(wasteType: WasteType): boolean {
  return HAZARDOUS_WASTE_TYPES.includes(wasteType)
}

export function fillColor(pct: number): string {
  if (pct >= 80) return '#e74c3c'
  if (pct >= 50) return '#e67e22'
  return '#27ae60'
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('de-DE', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  Requested: 'Angefragt',
  Scheduled: 'Geplant',
  Delivered: 'Geliefert',
  Filling: 'In Befüllung',
  EmptyRequested: 'Abholung angefragt',
  Retrieved: 'Abgeholt',
  Closed: 'Abgeschlossen',
  Cancelled: 'Storniert',
}

export const BOOKING_STATUS_BADGE: Record<BookingStatus, string> = {
  Requested: 'badge-orange',
  Scheduled: 'badge-blue',
  Delivered: 'badge-green',
  Filling: 'badge-green',
  EmptyRequested: 'badge-orange',
  Retrieved: 'badge-gray',
  Closed: 'badge-gray',
  Cancelled: 'badge-red',
}

export const WASTE_TYPE_LABEL: Record<string, string> = {
  Mixed: 'Gemischt',
  Wood: 'Holz',
  Metal: 'Metall',
  Concrete: 'Beton',
  Paper: 'Papier',
  Plastic: 'Kunststoff',
  Organic: 'Organisch',
  Electronics: 'Elektronik',
}

export const TRIP_KIND_LABEL: Record<DriverTripKind, string> = {
  delivery: 'Lieferung',
  pickup: 'Abholung',
}

export const REPORT_PHOTO_SIDE_LABEL: Record<DriverReportPhotoSide, string> = {
  front: 'Vorne',
  right: 'Rechts',
  back: 'Hinten',
  left: 'Links',
}
