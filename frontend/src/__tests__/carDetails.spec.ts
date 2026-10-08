import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import CarDetails from '../components/CarDetails.vue'
import { formatDate, formatKm, isoLocalDate } from '../format'
import { setLocale } from '../i18n'
import { insuranceReports, mileageRecords } from '../state'

const CAR = { id: 1, manufacturer: 'Volkswagen', model: 'Golf', license: 'M-AB1234' }

const LATEST_DATE = '2026-08-30'
const MIDDLE_DATE = '2026-08-01'
const REPORT_DATE = isoLocalDate(new Date(Date.now() - 365 * 86_400_000))

const LATEST_READING = 45_678
const MIDDLE_READING = 41_000
const REPORT_READING = 30_000
const CAP_PER_YEAR = 15_000
const OVER_BY = 678

// The real Nuxt UI components are not registered in the unit test
// environment, so the stubs render the same observable structure the app
// relies on: tab labels plus the named tab contents, table headers and
// cell slots, and the button/label text with its accessible name.

interface TabItem {
  label: string
  slot: string
}

interface TableColumn {
  accessorKey?: string
  id?: string
  header: string
}

const UTabsStub = defineComponent({
  name: 'UTabs',
  props: ['items'],
  setup(props, { slots }) {
    return () => {
      const items = props.items as TabItem[]
      return h('div', { class: 'utabs-stub' }, [
        ...items.map((item) =>
          h('button', { type: 'button', class: 'utab', 'data-slot': item.slot }, item.label),
        ),
        ...Object.entries(slots).map(([name, render]) =>
          h('div', { class: 'utab-content', 'data-slot': name }, render ? render() : []),
        ),
      ])
    }
  },
})

const UTableStub = defineComponent({
  name: 'UTable',
  props: ['data', 'columns'],
  setup(props, { slots }) {
    return () => {
      const data = props.data as Record<string, unknown>[]
      const columns = props.columns as TableColumn[]
      return h('table', { class: 'utable-stub' }, [
        h('thead', [h('tr', columns.map((column) => h('th', column.header)))]),
        h(
          'tbody',
          data.map((row) =>
            h(
              'tr',
              columns.map((column) => {
                const key = column.accessorKey ?? column.id ?? ''
                const cell = slots[`${key}-cell`]
                return h('td', cell ? cell({ row: { original: row } }) : String(row[key] ?? ''))
              }),
            ),
          ),
        ),
      ])
    }
  },
})

const UCardStub = defineComponent({
  name: 'UCard',
  setup(_, { slots }) {
    return () => h('div', { class: 'ucard-stub' }, slots.default?.() ?? [])
  },
})

const UBadgeStub = defineComponent({
  name: 'UBadge',
  setup(_, { slots }) {
    return () => h('span', { class: 'ubadge-stub' }, slots.default?.() ?? [])
  },
})

// The app only opens modals through user interaction; closed, like the real
// UModal, the stub renders nothing.
const UModalStub = defineComponent({
  name: 'UModal',
  setup() {
    return () => null
  },
})

// The setup-file UButton stub only renders the `label` prop; CarDetails
// passes its text as slot content, so this override also renders the slot
// and keeps the accessible name for the icon-only buttons.
const UButtonStub = defineComponent({
  name: 'UButton',
  props: { label: String },
  setup(props, { attrs, slots }) {
    return () =>
      h('button', { type: 'button', ...attrs }, [
        ...(props.label ? [props.label] : slots.default?.() ?? []),
      ])
  },
})

function mountDetails(): VueWrapper {
  return mount(CarDetails, {
    props: { car: CAR },
    global: {
      components: {
        UBadge: UBadgeStub,
        UButton: UButtonStub,
        UCard: UCardStub,
        UModal: UModalStub,
        UTabs: UTabsStub,
        UTable: UTableStub,
      },
    },
  })
}

beforeEach(() => {
  setLocale('en')
  mileageRecords.value = [
    {
      id: 11,
      carId: 1,
      date: LATEST_DATE,
      odometerReading: LATEST_READING,
      evaluation: { theoreticalLimit: LATEST_READING - OVER_BY, delta: OVER_BY },
    },
    {
      id: 12,
      carId: 1,
      date: MIDDLE_DATE,
      odometerReading: MIDDLE_READING,
      evaluation: null,
    },
  ]
  insuranceReports.value = [
    {
      id: 21,
      carId: 1,
      date: REPORT_DATE,
      odometerReading: REPORT_READING,
      mileagePerYear: CAP_PER_YEAR,
    },
  ]
})

afterEach(() => {
  mileageRecords.value = []
  insuranceReports.value = []
  setLocale('en')
})

describe('CarDetails in English', () => {
  it('translates the tabs, summary, and actions', () => {
    const wrapper = mountDetails()
    expect(wrapper.findAll('button.utab').map((tab) => tab.text())).toEqual([
      'Mileage',
      'Insurance',
    ])

    const mileage = wrapper.find('[data-slot="mileage"].utab-content')
    expect(mileage.text()).toContain('Latest:')
    expect(mileage.text()).toContain(`${formatKm(LATEST_READING)} km`)
    expect(mileage.text()).toContain(`on ${formatDate(LATEST_DATE)}`)
    expect(mileage.text()).toContain('Add reading')

    const insurance = wrapper.find('[data-slot="insurance"].utab-content')
    expect(insurance.text()).toContain('In force:')
    expect(insurance.text()).toContain(`${formatKm(CAP_PER_YEAR)} km/year`)
    expect(insurance.text()).toContain('Add report')
  })

  it('translates the table headers and renders both rows with formatted values', () => {
    const wrapper = mountDetails()
    const [mileageTable, insuranceTable] = wrapper.findAll('table.utable-stub')

    expect(mileageTable.findAll('th').map((cell) => cell.text())).toEqual([
      'Date',
      'Reading',
      'Since last',
      'Limit',
      '',
    ])
    expect(insuranceTable.findAll('th').map((cell) => cell.text())).toEqual([
      'Date',
      'Reading',
      'Cap / year',
      '',
    ])

    const [latestRow, middleRow, reportRow] = mileageTable.findAll('tbody tr')
    expect(latestRow.text()).toContain(formatDate(LATEST_DATE))
    expect(latestRow.text()).toContain(`${formatKm(LATEST_READING)} km`)
    // The desktop delta cell shows the number only; the mobile card adds "km".
    expect(latestRow.text()).toContain(`+${formatKm(LATEST_READING - MIDDLE_READING)}`)
    expect(latestRow.text()).toContain(`${formatKm(OVER_BY)} km over`)

    expect(middleRow.text()).toContain(formatDate(MIDDLE_DATE))
    expect(middleRow.text()).toContain(`+${formatKm(MIDDLE_READING - REPORT_READING)}`)
    expect(middleRow.text()).toContain('—')

    expect(reportRow.text()).toContain(formatDate(REPORT_DATE))
    expect(reportRow.text()).toContain(`${formatKm(REPORT_READING)} km`)
    expect(reportRow.text()).toContain(`${formatKm(CAP_PER_YEAR)} km/year`)
    expect(reportRow.text()).toContain('—')
    expect(reportRow.text()).toContain('+0 km')
  })

  it('translates the status badge, edit actions, and the mobile presentation', () => {
    const wrapper = mountDetails()
    const mileage = wrapper.find('[data-slot="mileage"].utab-content')
    const insurance = wrapper.find('[data-slot="insurance"].utab-content')

    expect(insurance.find('.ubadge-stub').text()).toBe('In force')

    const pencilLabels = wrapper
      .findAll('button')
      .map((button) => button.attributes('aria-label'))
      .filter((label): label is string => label !== undefined)
    expect(pencilLabels).toContain('Edit reading')
    expect(pencilLabels).toContain('Edit report')

    // Mobile cards: the desktop table is hidden via CSS, but both branches
    // are in the DOM, so the card texts are asserted from the tab content.
    const mobileReading = `${formatKm(LATEST_READING)} km`
    expect(mileage.text()).toContain(mobileReading)
    expect(insurance.text()).toContain(`${formatKm(CAP_PER_YEAR)} km/year`)
    expect(insurance.text()).toContain(
      `${formatDate(REPORT_DATE)} · at ${formatKm(REPORT_READING)} km`,
    )
  })
})

describe('CarDetails after a live switch to German', () => {
  it('re-renders the whole details surface in German, including dates and numbers', async () => {
    const wrapper = mountDetails()
    setLocale('de')
    await nextTick()

    expect(wrapper.findAll('button.utab').map((tab) => tab.text())).toEqual([
      'Erfassungen',
      'Versicherung',
    ])

    const mileage = wrapper.find('[data-slot="mileage"].utab-content')
    expect(mileage.text()).toContain('Letzter Stand:')
    expect(mileage.text()).toContain(`${formatKm(LATEST_READING)} km`)
    expect(mileage.text()).toContain(`am ${formatDate(LATEST_DATE)}`)
    expect(mileage.text()).toContain('Erfassung hinzufügen')

    const [mileageTable, insuranceTable] = wrapper.findAll('table.utable-stub')
    expect(mileageTable.findAll('th').map((cell) => cell.text())).toEqual([
      'Datum',
      'Erfassung',
      'Seit letzter',
      'Limit',
      '',
    ])
    expect(insuranceTable.findAll('th').map((cell) => cell.text())).toEqual([
      'Datum',
      'Erfassung',
      'Limit / Jahr',
      '',
    ])

    const latestRow = mileageTable.find('tbody tr')
    expect(latestRow.text()).toContain(`${formatKm(LATEST_READING)} km`)
    expect(latestRow.text()).toContain(`${formatKm(OVER_BY)} km über`)
    expect(latestRow.text()).toContain(`+${formatKm(LATEST_READING - MIDDLE_READING)}`)

    const insurance = wrapper.find('[data-slot="insurance"].utab-content')
    expect(insurance.text()).toContain('In Kraft:')
    expect(insurance.text()).toContain(`${formatKm(CAP_PER_YEAR)} km/Jahr`)
    expect(insurance.text()).toContain('Bericht hinzufügen')
    expect(insurance.find('.ubadge-stub').text()).toBe('In Kraft')

    const pencilLabels = wrapper
      .findAll('button')
      .map((button) => button.attributes('aria-label'))
      .filter((label): label is string => label !== undefined)
    expect(pencilLabels).toContain('Erfassung bearbeiten')
    expect(pencilLabels).toContain('Bericht bearbeiten')

    expect(insurance.text()).toContain(
      `${formatDate(REPORT_DATE)} · bei ${formatKm(REPORT_READING)} km`,
    )
  })
})

describe('CarDetails empty states', () => {
  beforeEach(() => {
    mileageRecords.value = []
    insuranceReports.value = []
  })

  it('shows the English empty states', () => {
    const wrapper = mountDetails()
    const mileage = wrapper.find('[data-slot="mileage"].utab-content')
    const insurance = wrapper.find('[data-slot="insurance"].utab-content')

    expect(mileage.text()).toContain('No readings yet')
    expect(mileage.text()).toContain('No mileage readings yet.')
    expect(insurance.text()).toContain('no report yet')
    expect(insurance.text()).toContain('No insurance reports yet.')
  })

  it('shows the German empty states after a live locale switch', async () => {
    const wrapper = mountDetails()
    setLocale('de')
    await nextTick()

    const mileage = wrapper.find('[data-slot="mileage"].utab-content')
    const insurance = wrapper.find('[data-slot="insurance"].utab-content')

    expect(mileage.text()).toContain('Noch keine Erfassungen')
    expect(mileage.text()).toContain('Noch keine Erfassungen.')
    expect(insurance.text()).toContain('noch kein Bericht')
    expect(insurance.text()).toContain('Noch keine Berichte.')
  })
})
