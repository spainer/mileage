import { createI18n } from 'vue-i18n'
import { ref, watch, type Ref } from 'vue'

import {
  LANGUAGE_STORAGE_KEY,
  isLanguage,
  resolveInitialLanguage,
  type Language,
} from './language'
import { de, en } from './messages'

function browserLanguage(): string {
  return typeof navigator !== 'undefined' ? navigator.language : ''
}

function storedChoice(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

/** The explicit language choice saved in this browser, or null. */
export function readStoredChoice(): Language | null {
  const stored = storedChoice()
  return isLanguage(stored) ? stored : null
}

/** Persists an explicit choice for future visits; a no-op outside a browser. */
export function persistLocale(next: Language): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
  } catch {
    // Storage unavailable (private mode, quota): the choice applies for
    // this session only.
  }
}

/**
 * The interface language for this page load: the explicit choice stored in
 * this browser if there is one, otherwise the browser language detected for
 * this visit. The module is re-imported on every load, so detection is
 * re-evaluated on each visit until the user chooses explicitly.
 */
export const locale: Ref<Language> = ref<Language>(
  resolveInitialLanguage(browserLanguage(), storedChoice()),
)

export const i18n = createI18n({
  legacy: false,
  locale: locale.value,
  fallbackLocale: 'en',
  messages: { en, de },
})

/**
 * Switches the interface language immediately (no reload) and remembers the
 * explicit choice in this browser.
 */
export function setLocale(next: Language): void {
  if (!isLanguage(next)) return
  locale.value = next
  i18n.global.locale.value = next
  persistLocale(next)
}

function applyLanguageMetadata(next: Language): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = next
  document.title = i18n.global.t('app.title')
}

// Keep the document language and the browser-tab title in sync with the
// selected interface language, including the initial value.
watch(locale, (next) => applyLanguageMetadata(next), { immediate: true })
