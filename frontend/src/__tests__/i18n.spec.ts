import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { i18n, locale, readStoredChoice, setLocale } from '../i18n'
import {
  LANGUAGE_STORAGE_KEY,
  languages,
  mapBrowserLanguage,
  resolveInitialLanguage,
} from '../i18n/language'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  setLocale('en')
  localStorage.clear()
})

describe('mapBrowserLanguage', () => {
  it.each([
    ['en', 'en'],
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['EN-us', 'en'],
    ['de', 'de'],
    ['de-DE', 'de'],
    ['de-AT', 'de'],
    ['de-CH', 'de'],
    ['deu-DE', 'de'],
    ['eng-US', 'en'],
    ['fr-FR', 'en'],
    ['zh-CN', 'en'],
    ['', 'en'],
    ['  DE-de ', 'de'],
  ])('maps the browser language %j to %j', (tag, expected) => {
    expect(mapBrowserLanguage(tag)).toBe(expected)
  })
})

describe('resolveInitialLanguage', () => {
  it('prefers an explicit stored choice over the browser language', () => {
    expect(resolveInitialLanguage('de-DE', 'en')).toBe('en')
    expect(resolveInitialLanguage('en-US', 'de')).toBe('de')
  })

  it('falls back to the browser language when the stored choice is missing or invalid', () => {
    expect(resolveInitialLanguage('de-DE', null)).toBe('de')
    expect(resolveInitialLanguage('de-DE', undefined)).toBe('de')
    expect(resolveInitialLanguage('de-DE', 'fr')).toBe('de')
    expect(resolveInitialLanguage('en-US', 'fr')).toBe('en')
  })
})

describe('persistence', () => {
  it('persists the explicit choice under the storage key', () => {
    setLocale('de')
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de')
    expect(readStoredChoice()).toBe('de')
  })

  it('returns null for a tampered stored value', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr')
    expect(readStoredChoice()).toBeNull()
  })

  it('lists exactly the supported languages', () => {
    expect([...languages]).toEqual(['en', 'de'])
  })
})

describe('live switching', () => {
  it('updates the active locale and the translations immediately', () => {
    expect(locale.value).toBe('en')
    expect(i18n.global.t('garage.retry')).toBe('Retry')

    setLocale('de')
    expect(locale.value).toBe('de')
    expect(i18n.global.t('garage.retry')).toBe('Erneut versuchen')
    expect(i18n.global.t('garage.subtitle')).toBe('Alle Autos auf einen Blick.')

    setLocale('en')
    expect(i18n.global.t('garage.subtitle')).toBe('Every car at a glance.')
  })

  it('pluralizes counts per language', () => {
    expect(i18n.global.t('garage.readings', 1)).toBe('1 reading')
    expect(i18n.global.t('garage.readings', 3)).toBe('3 readings')
    expect(i18n.global.t('garage.reports', 1)).toBe('1 report')
    expect(i18n.global.t('garage.reports', 2)).toBe('2 reports')

    setLocale('de')
    expect(i18n.global.t('garage.readings', 1)).toBe('1 Erfassung')
    expect(i18n.global.t('garage.readings', 3)).toBe('3 Erfassungen')
    expect(i18n.global.t('garage.reports', 1)).toBe('1 Bericht')
    expect(i18n.global.t('garage.reports', 2)).toBe('2 Berichte')
  })

  it('updates the document language and the tab title', async () => {
    setLocale('de')
    await nextTick()
    expect(document.documentElement.lang).toBe('de')
    expect(document.title).toBe('Kilometerstand')

    setLocale('en')
    await nextTick()
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Mileage')
  })

  it('ignores an unknown language', () => {
    setLocale('fr' as never)
    expect(locale.value).toBe('en')
  })
})
