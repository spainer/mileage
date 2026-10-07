import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))

vi.mock('../api/client', () => ({
  api: {
    listCars: vi.fn(),
    listMileageRecords: vi.fn(),
    listInsuranceReports: vi.fn(),
    getEvaluation: vi.fn(),
  },
}))

import GarageView from '../views/GarageView.vue'
import { api } from '../api/client'
import { isoLocalDate } from '../format'
import { setLocale } from '../i18n'
import { LANGUAGE_STORAGE_KEY } from '../i18n/language'

function oneYearAgoIso(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 1)
  return isoLocalDate(date)
}

function seedGarage() {
  vi.mocked(api.listCars).mockResolvedValue([
    { id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' },
  ])
  vi.mocked(api.listMileageRecords).mockResolvedValue([
    { id: 11, carId: 1, date: '2026-08-30', odometerReading: 45678, evaluation: null },
  ])
  vi.mocked(api.listInsuranceReports).mockResolvedValue([
    { id: 21, carId: 1, date: oneYearAgoIso(), odometerReading: 30000, mileagePerYear: 15000 },
  ])
  vi.mocked(api.getEvaluation).mockResolvedValue({ theoreticalLimit: 45000, delta: 678 })
}

async function mountGarage() {
  const wrapper = mount(GarageView)
  await flushPromises()
  return wrapper
}

function languageSelect(wrapper: VueWrapper) {
  return wrapper.get('select[data-testid="language-selector"]')
}

beforeEach(() => {
  localStorage.clear()
  setLocale('en')
  seedGarage()
})

afterEach(() => {
  setLocale('en')
  localStorage.clear()
})

describe('GarageView localization', () => {
  it('renders the garage in English with the language selector visible', async () => {
    const wrapper = await mountGarage()

    expect(wrapper.get('h1').text()).toBe('Garage')
    expect(wrapper.get('header p').text()).toBe('Every car at a glance.')

    const select = languageSelect(wrapper)
    expect(select.attributes('aria-label')).toBe('Language')
    expect((select.element as HTMLSelectElement).value).toBe('en')
    expect(wrapper.findAll('select option').map((option) => option.text())).toEqual([
      'English',
      'Deutsch',
    ])

    expect(wrapper.text()).toContain('Volkswagen Golf')
    expect(wrapper.text()).toContain('45,678 km')
    expect(wrapper.text()).toContain('08/30/2026')
    expect(wrapper.text()).toContain('15,000')
    expect(wrapper.text()).toContain('1 reading · 1 report')
    expect(wrapper.text()).toContain('+ Add car')
  })

  it('switches the rendered garage to German live, without a reload', async () => {
    const wrapper = await mountGarage()

    setLocale('de')
    await nextTick()

    expect(wrapper.get('header p').text()).toBe('Alle Autos auf einen Blick.')
    expect(wrapper.text()).toContain('45.678 km')
    expect(wrapper.text()).toContain('30.08.2026')
    expect(wrapper.text()).toContain('15.000')
    expect(wrapper.text()).toContain('1 Erfassung · 1 Bericht')
    expect(wrapper.text()).toContain('+ Auto hinzufügen')

    const select = languageSelect(wrapper)
    expect(select.attributes('aria-label')).toBe('Sprache')
    expect((select.element as HTMLSelectElement).value).toBe('de')
  })

  it('persists the explicit choice and switches back to English', async () => {
    const wrapper = await mountGarage()

    setLocale('de')
    await nextTick()
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de')

    setLocale('en')
    await nextTick()
    expect(wrapper.get('header p').text()).toBe('Every car at a glance.')
    expect(wrapper.text()).toContain('1 reading · 1 report')
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  it('updates the document language and the tab title with the selected language', async () => {
    await mountGarage()

    setLocale('de')
    await nextTick()
    expect(document.documentElement.lang).toBe('de')
    expect(document.title).toBe('Kilometerstand')

    setLocale('en')
    await nextTick()
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Mileage')
  })

  it('keeps the card content when switching languages', async () => {
    const wrapper = await mountGarage()
    expect(wrapper.find('.group').exists()).toBe(true)

    setLocale('de')
    await nextTick()
    expect(wrapper.find('.group').exists()).toBe(true)
    expect(wrapper.text()).toContain('Volkswagen Golf')
  })
})
