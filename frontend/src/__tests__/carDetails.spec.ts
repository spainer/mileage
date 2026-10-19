import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import CarDetails from '../components/CarDetails.vue'
import { formatDate, formatKm, isoLocalDate } from '../format'
import { setLocale } from '../i18n'
import {
  CHART_FALLBACK_WIDTH,
  buildTheoreticalSeries,
  chartPointsForCar,
  computeChartLayout,
} from '../odometerChart'
import { theoreticalLimit } from '../theoreticalLimit'
import { insuranceReports, mileageRecords, reportsForCar } from '../state'

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

describe('CarDetails odometer chart', () => {
  // Fixed dates so the oldest-first order cannot flip with the test run
  // date; the shared fixture's report date drifts with `Date.now()`.
  const OLD_DATE = '2025-09-01'

  function seedHistory(): void {
    mileageRecords.value = [
      { id: 11, carId: 1, date: LATEST_DATE, odometerReading: LATEST_READING, evaluation: null },
      { id: 12, carId: 1, date: MIDDLE_DATE, odometerReading: MIDDLE_READING, evaluation: null },
    ]
    insuranceReports.value = [
      {
        id: 21,
        carId: 1,
        date: OLD_DATE,
        odometerReading: REPORT_READING,
        mileagePerYear: CAP_PER_YEAR,
      },
    ]
  }

  function chartSection(wrapper: VueWrapper): Element {
    const section = wrapper.element.children[0]
    if (!section) throw new Error('CarDetails renders no chart section')
    return section
  }

  it('renders the chart above the tabs, outside the tab contents', () => {
    seedHistory()
    const wrapper = mountDetails()
    const [section, tabs] = wrapper.element.children

    const svg = section.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-label')).toBe('Odometer readings over time')
    expect(section.querySelector('h2')?.textContent?.trim()).toBe('Odometer history')

    expect(tabs.classList.contains('utabs-stub')).toBe(true)
    expect(tabs.querySelectorAll('svg')).toHaveLength(0)
  })

  it('renders one marker per date, oldest first, with time-proportional spacing', () => {
    seedHistory()
    const wrapper = mountDetails()
    const circles = wrapper.findAll('circle')
    expect(circles).toHaveLength(3)

    const cxs = circles.map((circle) => Number(circle.attributes('cx')))
    const cys = circles.map((circle) => Number(circle.attributes('cy')))

    // Oldest first along the x axis, from the left plot edge to the right one.
    expect(cxs[0]).toBeLessThan(cxs[1])
    expect(cxs[1]).toBeLessThan(cxs[2])

    // Horizontal spacing is proportional to elapsed time, not to the index.
    const t0 = Date.parse(OLD_DATE)
    const t1 = Date.parse(LATEST_DATE)
    expect((cxs[1] - cxs[0]) / (cxs[2] - cxs[0])).toBeCloseTo(
      (Date.parse(MIDDLE_DATE) - t0) / (t1 - t0),
      3,
    )

    // Higher readings sit higher on the chart.
    expect(cys[0]).toBeGreaterThan(cys[1])
    expect(cys[1]).toBeGreaterThan(cys[2])
  })

  it('renders flat readings on one horizontal line inside the plot', () => {
    mileageRecords.value = [
      { id: 11, carId: 1, date: LATEST_DATE, odometerReading: 5_000, evaluation: null },
      { id: 12, carId: 1, date: MIDDLE_DATE, odometerReading: 5_000, evaluation: null },
    ]
    insuranceReports.value = []
    const wrapper = mountDetails()
    const cys = wrapper.findAll('circle').map((circle) => Number(circle.attributes('cy')))
    expect(cys).toHaveLength(2)
    expect(cys[0]).toBeCloseTo(cys[1], 5)
    // A span-less domain is padded around its value, so the line is
    // vertically centred in the plot rather than on its edge.
    expect(cys[0]).toBeCloseTo(112, 5)
  })

  it('collapses a same-date record and report into one marker', () => {
    seedHistory()
    insuranceReports.value.push({
      id: 22,
      carId: 1,
      date: LATEST_DATE,
      odometerReading: LATEST_READING,
      mileagePerYear: CAP_PER_YEAR,
    })
    const wrapper = mountDetails()
    expect(wrapper.findAll('circle')).toHaveLength(3)
  })

  it('renders records-only and reports-only histories', () => {
    seedHistory()
    insuranceReports.value = []
    expect(mountDetails().findAll('circle')).toHaveLength(2)

    mileageRecords.value = []
    insuranceReports.value = [
      {
        id: 21,
        carId: 1,
        date: OLD_DATE,
        odometerReading: REPORT_READING,
        mileagePerYear: CAP_PER_YEAR,
      },
    ]
    expect(mountDetails().findAll('circle')).toHaveLength(1)
  })

  it('centers a single-date history in the middle of the plot', () => {
    mileageRecords.value = [
      { id: 11, carId: 1, date: LATEST_DATE, odometerReading: LATEST_READING, evaluation: null },
    ]
    insuranceReports.value = []
    const circle = mountDetails().find('circle')
    expect(circle.exists()).toBe(true)
    // 640 px fallback width: plot runs from 56 to 624.
    expect(Number(circle.attributes('cx'))).toBeCloseTo(340, 5)
  })

  it('renders all-zero readings inside the plot', () => {
    mileageRecords.value = [
      { id: 11, carId: 1, date: LATEST_DATE, odometerReading: 0, evaluation: null },
      { id: 12, carId: 1, date: MIDDLE_DATE, odometerReading: 0, evaluation: null },
    ]
    insuranceReports.value = []
    const circles = mountDetails().findAll('circle')
    expect(circles).toHaveLength(2)
    const cys = circles.map((circle) => Number(circle.attributes('cy')))
    expect(cys[0]).toBeCloseTo(cys[1], 5)
    expect(cys[0]).toBeCloseTo(112, 5)
    const cxs = circles.map((circle) => Number(circle.attributes('cx')))
    expect(cxs[0]).toBeLessThan(cxs[1])
  })

  it('shows the English empty state when there are no readings of either kind', () => {
    mileageRecords.value = []
    insuranceReports.value = []
    const wrapper = mountDetails()
    const section = chartSection(wrapper)
    expect(section.querySelector('svg')).toBeNull()
    expect(section.querySelector('h2')?.textContent?.trim()).toBe('Odometer history')
    expect(section.textContent).toContain('No odometer readings yet.')
  })

  it('shows the German empty state after a live locale switch', async () => {
    mileageRecords.value = []
    insuranceReports.value = []
    const wrapper = mountDetails()
    setLocale('de')
    await nextTick()
    const section = chartSection(wrapper)
    expect(section.querySelector('svg')).toBeNull()
    expect(section.querySelector('h2')?.textContent?.trim()).toBe('Kilometerstandsverlauf')
    expect(section.textContent).toContain('Noch keine Kilometerstände.')
  })

  it('updates live when the histories change, without remounting', async () => {
    seedHistory()
    const wrapper = mountDetails()
    expect(wrapper.findAll('circle')).toHaveLength(3)

    mileageRecords.value.push({
      id: 13,
      carId: 1,
      date: '2026-08-15',
      odometerReading: 43_000,
      evaluation: null,
    })
    await nextTick()
    expect(wrapper.findAll('circle')).toHaveLength(4)

    insuranceReports.value = []
    await nextTick()
    expect(wrapper.findAll('circle')).toHaveLength(3)
  })

  it('ignores readings of other cars', () => {
    seedHistory()
    mileageRecords.value.push({
      id: 31,
      carId: 2,
      date: '2026-09-15',
      odometerReading: 60_000,
      evaluation: null,
    })
    expect(mountDetails().findAll('circle')).toHaveLength(3)
  })

  it('translates the chart title, aria label, and date labels', async () => {
    seedHistory()
    const wrapper = mountDetails()
    setLocale('de')
    await nextTick()

    const section = chartSection(wrapper)
    const svg = section.querySelector('svg')
    expect(svg?.getAttribute('aria-label')).toBe('Kilometerstandsverlauf')
    expect(section.querySelector('h2')?.textContent?.trim()).toBe('Kilometerstandsverlauf')

    // The legend's series names are localised with the rest.
    expect(section.textContent).toContain('Tatsächlicher Kilometerstand')
    expect(section.textContent).toContain('Theoretisches Limit')

    // The span ends are always labelled; the middle reading sits 29 days
    // from the last one, so its date label may be thinned away at this
    // width. The labelled dates are localised to German.
    const texts = wrapper.findAll('svg text').map((text) => text.text())
    for (const date of [OLD_DATE, LATEST_DATE]) {
      expect(texts).toContain(formatDate(date))
    }
  })

  describe('theoretical limit', () => {
    // The component renders at the fallback width in the unit test
    // environment, so the expected values can be recomputed independently
    // with the shared calculation and layout.
    function expectedEndpointY(): number {
      const points = chartPointsForCar(1)
      const reports = reportsForCar(1)
      const series = buildTheoreticalSeries(points, reports)
      const layout = computeChartLayout(points, CHART_FALLBACK_WIDTH, series.axisValues)
      const latest = points[points.length - 1]!
      return layout.y(theoreticalLimit(reports, latest.date)!)
    }

    function theoreticalEndpointY(wrapper: VueWrapper): number {
      const paths = chartSection(wrapper).querySelectorAll('svg path')
      const tokens = (paths[1]?.getAttribute('d') ?? '').trim().split(' ')
      return Number(tokens[tokens.length - 1])
    }

    function resetLines(wrapper: VueWrapper): Element[] {
      return Array.from(chartSection(wrapper).querySelectorAll('line.stroke-warning'))
    }

    it('plots the limit as a dashed second series with a legend', () => {
      seedHistory()
      const wrapper = mountDetails()
      const section = chartSection(wrapper)

      const paths = section.querySelectorAll('svg path')
      expect(paths).toHaveLength(2)
      expect(paths[0].classList.contains('stroke-primary')).toBe(true)
      const limit = paths[1]!
      expect(limit.classList.contains('stroke-warning')).toBe(true)
      expect(limit.getAttribute('stroke-dasharray')).toBe('3 3')

      // The first report is the oldest point, so the limit runs over every
      // point and stops at the latest reading like the actual series.
      const tokens = limit.getAttribute('d')!.trim().split(' ')
      const circles = wrapper.findAll('circle')
      expect(tokens[0]).toBe('M')
      expect(Number(tokens[1])).toBeCloseTo(Number(circles[0].attributes('cx')), 5)
      expect(Number(tokens[tokens.length - 2])).toBeCloseTo(
        Number(circles[circles.length - 1].attributes('cx')),
        5,
      )
      expect(theoreticalEndpointY(wrapper)).toBeCloseTo(expectedEndpointY(), 5)

      // The legend identifies both series; its swatches are spans, so the
      // chart stays the section's only svg.
      expect(section.textContent).toContain('Actual odometer reading')
      expect(section.textContent).toContain('Theoretical limit')
      expect(section.querySelectorAll('svg')).toHaveLength(1)
    })

    it('draws a dashed vertical reset at each report date after the first', () => {
      seedHistory()
      insuranceReports.value.push({
        id: 22,
        carId: 1,
        date: MIDDLE_DATE,
        odometerReading: MIDDLE_READING,
        mileagePerYear: 8_000,
      })
      const wrapper = mountDetails()

      const lines = resetLines(wrapper)
      expect(lines).toHaveLength(1)
      const line = lines[0]!
      const circles = wrapper.findAll('circle')

      // Vertical at the second report's date, spanning from the incoming
      // reading to the outgoing trajectory.
      expect(Number(line.getAttribute('x1'))).toBeCloseTo(Number(circles[1].attributes('cx')), 5)
      expect(Number(line.getAttribute('x2'))).toBeCloseTo(Number(line.getAttribute('x1')), 5)
      const ys = [Number(line.getAttribute('y1')), Number(line.getAttribute('y2'))]
      expect(Math.max(...ys)).toBeCloseTo(Number(circles[1].attributes('cy')), 5)
      // The top of the line is the first report extended to the second
      // report date, computed without the second report in force.
      const points = chartPointsForCar(1)
      const series = buildTheoreticalSeries(points, reportsForCar(1))
      const layout = computeChartLayout(points, CHART_FALLBACK_WIDTH, series.axisValues)
      const outgoing = theoreticalLimit(
        reportsForCar(1).filter((report) => report.date < MIDDLE_DATE),
        MIDDLE_DATE,
      )!
      expect(Math.min(...ys)).toBeCloseTo(layout.y(outgoing), 5)
    })

    it('resets once for same-date reports, tie-broken by the highest id', () => {
      seedHistory()
      insuranceReports.value.push(
        { id: 22, carId: 1, date: MIDDLE_DATE, odometerReading: MIDDLE_READING, mileagePerYear: 8_000 },
        { id: 23, carId: 1, date: MIDDLE_DATE, odometerReading: MIDDLE_READING, mileagePerYear: 9_000 },
      )
      const wrapper = mountDetails()
      expect(resetLines(wrapper)).toHaveLength(1)
      // After the same-date pair the limit runs from the highest-id report
      // (cap 9000); the other cap would land the endpoint elsewhere.
      expect(theoreticalEndpointY(wrapper)).toBeCloseTo(expectedEndpointY(), 5)
    })

    it('plots no limit before the first report, not even zero', () => {
      mileageRecords.value = [
        { id: 13, carId: 1, date: '2025-06-01', odometerReading: 25_000, evaluation: null },
        { id: 11, carId: 1, date: LATEST_DATE, odometerReading: LATEST_READING, evaluation: null },
      ]
      insuranceReports.value = [
        { id: 21, carId: 1, date: MIDDLE_DATE, odometerReading: MIDDLE_READING, mileagePerYear: CAP_PER_YEAR },
      ]
      const wrapper = mountDetails()

      const paths = chartSection(wrapper).querySelectorAll('svg path')
      expect(paths).toHaveLength(2)
      const tokens = (paths[1]!.getAttribute('d') ?? '').trim().split(' ')
      const circles = wrapper.findAll('circle')

      // The path starts at the first report date, not at the earlier
      // reading, and on the report's own reading.
      expect(tokens[0]).toBe('M')
      expect(Number(tokens[1])).toBeGreaterThan(Number(circles[0].attributes('cx')))
      expect(Number(tokens[1])).toBeCloseTo(Number(circles[1].attributes('cx')), 5)
      expect(Number(tokens[2])).toBeCloseTo(Number(circles[1].attributes('cy')), 5)
    })

    it('shows the localized hint instead of a legend when no report exists', async () => {
      mileageRecords.value = [
        { id: 11, carId: 1, date: LATEST_DATE, odometerReading: LATEST_READING, evaluation: null },
        { id: 12, carId: 1, date: MIDDLE_DATE, odometerReading: MIDDLE_READING, evaluation: null },
      ]
      insuranceReports.value = []
      const wrapper = mountDetails()
      const section = chartSection(wrapper)

      expect(section.querySelectorAll('svg path')).toHaveLength(1)
      expect(resetLines(wrapper)).toHaveLength(0)
      expect(section.textContent).toContain('Add an insurance report to see the theoretical limit.')
      expect(section.textContent).not.toContain('Actual odometer reading')

      setLocale('de')
      await nextTick()
      expect(section.textContent).toContain(
        'Füge einen Bericht hinzu, um das theoretische Limit zu sehen.',
      )
      expect(section.textContent).not.toContain('Tatsächlicher Kilometerstand')
    })

    it('recomputes the limit from the live report state after mutations', async () => {
      seedHistory()
      // Stale cached evaluations on the records: the chart must not read
      // them.
      mileageRecords.value = mileageRecords.value.map((record) => ({
        ...record,
        evaluation: { theoreticalLimit: 123_456, delta: 1 },
      }))
      const wrapper = mountDetails()
      const section = chartSection(wrapper)
      expect(section.querySelectorAll('svg path')).toHaveLength(2)
      expect(theoreticalEndpointY(wrapper)).toBeCloseTo(expectedEndpointY(), 5)

      // Editing the report's cap re-plots the limit.
      const [report] = insuranceReports.value
      const before = theoreticalEndpointY(wrapper)
      insuranceReports.value = [{ ...report!, mileagePerYear: 20_000 }]
      await nextTick()
      expect(theoreticalEndpointY(wrapper)).not.toBeCloseTo(before, 5)
      expect(theoreticalEndpointY(wrapper)).toBeCloseTo(expectedEndpointY(), 5)

      // A new record extends both series to its date.
      mileageRecords.value.push({
        id: 13,
        carId: 1,
        date: '2026-09-15',
        odometerReading: 47_000,
        evaluation: null,
      })
      await nextTick()
      expect(wrapper.findAll('circle')).toHaveLength(4)
      expect(theoreticalEndpointY(wrapper)).toBeCloseTo(expectedEndpointY(), 5)

      // Deleting the report drops the series and brings back the hint.
      insuranceReports.value = []
      await nextTick()
      expect(section.querySelectorAll('svg path')).toHaveLength(1)
      expect(section.textContent).toContain('Add an insurance report to see the theoretical limit.')
    })
  })
})
