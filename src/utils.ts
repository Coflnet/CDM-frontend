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

export const PICKUP_STATUS_LABEL: Record<string, string> = {
  pending: 'Ausstehend',
  driver_en_route: 'Fahrer unterwegs',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
}

export const PICKUP_STATUS_BADGE: Record<string, string> = {
  pending: 'badge-gray',
  driver_en_route: 'badge-blue',
  completed: 'badge-green',
  cancelled: 'badge-red',
}

export const CONTAINER_STATUS_LABEL: Record<string, string> = {
  active: 'Aktiv',
  scheduled_pickup: 'Abholung geplant',
  picked_up: 'Abgeholt',
  ordered: 'Bestellt',
}

export const CONTAINER_STATUS_BADGE: Record<string, string> = {
  active: 'badge-green',
  scheduled_pickup: 'badge-blue',
  picked_up: 'badge-gray',
  ordered: 'badge-orange',
}
