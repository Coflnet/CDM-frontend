import { createI18n } from 'vue-i18n'
import de from './de'
import en from './en'

export const SUPPORTED_LOCALES = ['de', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const STORAGE_KEY = 'cdm.locale'

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) return saved as Locale
  } catch {
    /* ignore */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'de').toLowerCase()
  if (nav.startsWith('en')) return 'en'
  return 'de'
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: 'de',
  messages: { de, en },
})

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}
