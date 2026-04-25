<script setup lang="ts">
import type { BookingStatus, DriverReport, WasteType } from '../../api'
import {
  BOOKING_STATUS_BADGE,
  BOOKING_STATUS_LABEL,
  formatDateTime,
  REPORT_PHOTO_SIDE_LABEL,
  TRIP_KIND_LABEL,
  WASTE_TYPE_LABEL,
} from '../../utils'

const props = defineProps<{
  report: DriverReport
  wasteType: WasteType
  containerNumber: string | null
  siteName?: string | null
  bookingStatus?: BookingStatus | null
}>()
</script>

<template>
  <div class="report-card">
    <div class="row-between report-header">
      <div>
        <p class="report-title">{{ TRIP_KIND_LABEL[report.tripKind] }}bericht</p>
        <p v-if="siteName" class="text-sm text-muted">{{ siteName }}</p>
      </div>
      <span v-if="bookingStatus" class="badge badge-shrink" :class="BOOKING_STATUS_BADGE[bookingStatus]">
        {{ BOOKING_STATUS_LABEL[bookingStatus] }}
      </span>
    </div>

    <div class="report-meta">
      <span class="meta-pill">{{ WASTE_TYPE_LABEL[wasteType] }}</span>
      <span class="meta-pill">Container {{ containerNumber ?? '—' }}</span>
      <span class="meta-pill">{{ formatDateTime(report.createdAt) }}</span>
    </div>

    <div class="report-copy text-sm text-muted">
      Unterschrieben von <strong>{{ report.signerName }}</strong>
    </div>

    <div class="report-grid">
      <div class="report-section">
        <p class="section-label">Fotodokumentation</p>
        <div class="photo-grid">
          <figure v-for="photo in report.photos" :key="photo.side" class="photo-card">
            <img :src="photo.imageUrl" :alt="REPORT_PHOTO_SIDE_LABEL[photo.side]" class="report-photo" />
            <figcaption>{{ REPORT_PHOTO_SIDE_LABEL[photo.side] }}</figcaption>
          </figure>
        </div>
      </div>

      <div class="report-section">
        <p class="section-label">Kundenunterschrift</p>
        <div class="signature-wrap">
          <img :src="report.signatureDataUrl" alt="Kundenunterschrift" class="signature-image" />
        </div>
      </div>
    </div>

    <div class="report-note" :class="report.damageCharge > 0 || report.damageNotes ? 'report-note-warn' : 'report-note-ok'">
      <p class="section-label">Schäden / Notizen</p>
      <p class="report-note-copy">{{ report.damageNotes ?? 'Keine Schäden dokumentiert.' }}</p>
      <p v-if="report.damageCharge > 0" class="report-charge">
        Belastung: {{ report.damageCharge.toFixed(2) }} EUR
      </p>
    </div>
  </div>
</template>

<style scoped>
.report-card {
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.02);
  padding: 0.9rem;
}
.report-header {
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 0.6rem;
}
.report-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}
.report-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.55rem;
}
.meta-pill {
  border-radius: 999px;
  padding: 0.16rem 0.55rem;
  border: 1px solid var(--border-card);
  background: rgba(255,255,255,0.04);
  font-size: 0.72rem;
  color: var(--text-muted);
}
.report-copy {
  margin-bottom: 0.75rem;
}
.report-grid {
  display: grid;
  gap: 0.75rem;
}
.report-section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}
.photo-card {
  margin: 0;
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #121212;
}
.report-photo {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.photo-card figcaption {
  padding: 0.45rem 0.55rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}
.signature-wrap {
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  background: #fff;
  padding: 0.4rem;
}
.signature-image {
  display: block;
  width: 100%;
  max-height: 120px;
  object-fit: contain;
}
.report-note {
  margin-top: 0.75rem;
  border-radius: var(--radius-sm);
  padding: 0.7rem 0.8rem;
}
.report-note-warn {
  background: rgba(230,126,34,0.12);
  border: 1px solid rgba(230,126,34,0.3);
}
.report-note-ok {
  background: rgba(39,174,96,0.1);
  border: 1px solid rgba(39,174,96,0.25);
}
.report-note-copy {
  margin-top: 0.15rem;
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.report-charge {
  margin-top: 0.45rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
}
.badge-shrink {
  flex-shrink: 0;
}
</style>