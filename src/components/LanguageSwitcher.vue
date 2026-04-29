<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale, SUPPORTED_LOCALES, type Locale } from '../i18n'

const { locale, t } = useI18n()

const current = computed<Locale>(() => locale.value as Locale)

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  setLocale(target.value as Locale)
}
</script>

<template>
  <label class="lang-switch">
    <span class="lang-label">{{ t('language.label') }}</span>
    <select :value="current" @change="onChange">
      <option v-for="lang in SUPPORTED_LOCALES" :key="lang" :value="lang">
        {{ t(`language.${lang}`) }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.lang-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  opacity: 0.85;
}

.lang-label {
  display: none;
}

@media (min-width: 480px) {
  .lang-label {
    display: inline;
  }
}

select {
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 0.2rem 0.4rem;
  font-size: 0.85rem;
}
</style>
