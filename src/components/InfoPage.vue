<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from './LanguageSwitcher.vue'
import { LEITL_CONTAINERS } from '../utils'

const router = useRouter()
const { t } = useI18n()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="info-page">
    <header class="info-header">
      <button class="link-btn" @click="goHome">&larr; {{ t('info.back') }}</button>
      <LanguageSwitcher />
    </header>

    <main class="info-content">
      <h1>{{ t('info.title') }}</h1>
      <p class="lead">{{ t('info.intro') }}</p>

      <section class="info-section">
        <h2>{{ t('info.sections.customer.title') }}</h2>
        <p>{{ t('info.sections.customer.body') }}</p>
      </section>

      <section class="info-section">
        <h2>{{ t('info.sections.dispatch.title') }}</h2>
        <p>{{ t('info.sections.dispatch.body') }}</p>
      </section>

      <section class="info-section">
        <h2>{{ t('info.sections.driver.title') }}</h2>
        <p>{{ t('info.sections.driver.body') }}</p>
      </section>

      <section class="info-section">
        <h2>{{ t('info.containers.title') }}</h2>
        <p>{{ t('info.containers.body') }}</p>
        <div class="container-catalog">
          <article v-for="c in LEITL_CONTAINERS" :key="c.id" class="catalog-card">
            <header class="catalog-head">
              <h3>{{ c.label }}</h3>
              <span class="catalog-vol">{{ c.volumeM3 }} m³</span>
            </header>
            <p class="catalog-desc">{{ c.description }}</p>
            <dl class="catalog-meta">
              <div>
                <dt>Bauart</dt>
                <dd>{{ c.kind === 'Absetz' ? 'Absetzcontainer' : 'Abrollcontainer' }}{{ c.hasLid ? ', mit Deckel' : ', offen' }}</dd>
              </div>
              <div>
                <dt>Stellfläche</dt>
                <dd>{{ c.footprint }}</dd>
              </div>
            </dl>
          </article>
        </div>
        <p class="text-muted catalog-source">
          Sortiment angelehnt an
          <a href="https://www.leitl.de/recycling/was-kommt-zum-wertstoffhof/containerservice/" target="_blank" rel="noopener noreferrer">
            Leitl Recycling Containerservice
          </a>.
        </p>
      </section>

      <section class="info-section info-cta">
        <h2>{{ t('info.forCompanies.title') }}</h2>
        <p>{{ t('info.forCompanies.body') }}</p>
        <a class="btn-primary" href="mailto:hello@coflnet.com?subject=CDM%20Whitelabel">
          {{ t('info.forCompanies.contact') }}
        </a>
      </section>
    </main>
  </div>
</template>

<style scoped>
.info-page {
  min-height: 100vh;
  padding: 1.25rem 0.875rem 3rem;
  background: var(--bg-base);
  color: var(--text-base, #f4f4f4);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}

.info-content {
  max-width: 760px;
  margin: 0 auto;
  line-height: 1.55;
}

.info-content h1 {
  font-size: 1.85rem;
  margin-bottom: 0.75rem;
}

.lead {
  font-size: 1.05rem;
  opacity: 0.9;
  margin-bottom: 2rem;
}

.info-section {
  margin-bottom: 1.75rem;
}

.info-section h2 {
  font-size: 1.15rem;
  margin-bottom: 0.4rem;
}

.info-cta {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
}

.info-cta .btn-primary {
  display: inline-block;
  margin-top: 0.75rem;
  text-decoration: none;
}

.link-btn {
  background: transparent;
  border: 0;
  color: var(--accent, #7ed957);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.25rem 0;
}

.container-catalog {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;
  margin: 0.75rem 0 0.5rem;
}
.catalog-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.85rem 0.95rem;
}
.catalog-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
.catalog-head h3 {
  font-size: 0.98rem;
  margin: 0;
  line-height: 1.2;
}
.catalog-vol {
  font-weight: 700;
  color: var(--accent, #7ed957);
  white-space: nowrap;
}
.catalog-desc {
  font-size: 0.88rem;
  margin: 0 0 0.5rem;
  opacity: 0.85;
}
.catalog-meta {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.25rem;
  font-size: 0.8rem;
  margin: 0;
}
.catalog-meta div { display: flex; gap: 0.4rem; }
.catalog-meta dt { font-weight: 600; opacity: 0.7; min-width: 5.5rem; }
.catalog-meta dd { margin: 0; }
.catalog-source { font-size: 0.8rem; margin-top: 0.5rem; }
.catalog-source a { color: var(--accent, #7ed957); }
</style>
