import type { BookingStatus } from './api'

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
