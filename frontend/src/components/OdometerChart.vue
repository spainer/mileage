<script lang="ts">
/**
 * The tooltip size assumed where the DOM cannot be measured (unit tests):
 * the positioning clamps to these instead of the rendered size.
 */
export const TOOLTIP_FALLBACK_WIDTH = 220
export const TOOLTIP_FALLBACK_HEIGHT = 90
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { evaluationLabel, formatDate, formatKm } from '../format'
import { i18n, locale } from '../i18n'
import {
  CHART_FALLBACK_WIDTH,
  computeChartLayout,
  type ChartPoint,
  type ChartSource,
  type TheoreticalSeries,
} from '../odometerChart'
import { evaluationToneClasses } from '../theme'

const props = defineProps<{
  /**
   * The Car's combined Odometer Reading history, oldest first, with at most
   * one point per date. The caller renders the empty state; the layout
   * needs at least one point, so an empty array here is a bug.
   */
  points: ChartPoint[]
  /**
   * The Theoretical Limit series for the same points, or `null` when the
   * Car has no Insurance Report: then the actual history renders alone,
   * with the localized hint to add a report.
   */
  theoretical: TheoreticalSeries | null
}>()

const t = i18n.global.t

// The chart fills its container: the width is measured with a
// ResizeObserver so the x axis stays proportional at any panel width. The
// fallback width applies where the container cannot be measured (unit tests,
// the render before the observer has fired).
const container = useTemplateRef<HTMLDivElement>('container')
const width = ref(CHART_FALLBACK_WIDTH)

function measure(): void {
  const el = container.value
  if (el && el.clientWidth > 0) width.value = el.clientWidth
}

let observer: ResizeObserver | null = null

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && container.value) {
    observer = new ResizeObserver(measure)
    observer.observe(container.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

// The fitted domain also covers the Theoretical Limit values, so the limit
// and the outgoing reset endpoints render inside the plot.
const layout = computed(() =>
  computeChartLayout(props.points, width.value, props.theoretical?.axisValues ?? []),
)

/**
 * The SVG path of a series over the chart's points: a move at the first
 * value, a line segment through the rest. A `null` value breaks the series:
 * the sub-path before it is closed, and the next value starts a new one.
 */
function seriesPath(entries: Array<{ date: string; value: number | null }>): string {
  let open = false
  return entries
    .map((entry) => {
      if (entry.value === null) {
        open = false
        return null
      }
      const command = open ? 'L' : 'M'
      open = true
      return `${command} ${layout.value.x(entry.date)} ${layout.value.y(entry.value)}`
    })
    .filter((segment): segment is string => segment !== null)
    .join(' ')
}

// The actual series connects every reading; consolidated points always have
// distinct dates, so the segments run through all of them.
const path = computed(() =>
  seriesPath(props.points.map((point) => ({ date: point.date, value: point.odometerReading }))),
)

// The theoretical path runs only where a limit exists: the values before the
// first Insurance Report are null, so the path starts at the first report
// date.
const theoreticalPath = computed(() =>
  props.theoretical
    ? seriesPath(
        props.points.map((point, index) => ({
          date: point.date,
          value: props.theoretical!.effective[index] ?? null,
        })),
      )
    : '',
)

// The first and last labelled dates sit on the plot edges, so they are
// anchored outward; interior labels stay centred on their point.
function xAnchor(index: number): 'start' | 'middle' | 'end' {
  if (layout.value.labeled.length === 1) return 'middle'
  if (index === 0) return 'start'
  if (index === layout.value.labeled.length - 1) return 'end'
  return 'middle'
}

// --- Point inspection -----------------------------------------------------
// One transparent, full-column hit band per date, owning the space up to the
// midpoints of its neighbours (the first and last band reach the plot edges),
// receives the pointer events and opens the shared inspection. The inspected
// values are derived from the live point, so a history change updates them,
// and a removed date dismisses them.
const inspectedDate = ref<string | null>(null)

// The date-to-index lookup runs once; the point and limit derive from it. A
// removed date resolves to -1 and dismisses the inspection.
const inspectedIndex = computed(
  () =>
    inspectedDate.value === null
      ? -1
      : props.points.findIndex((point) => point.date === inspectedDate.value),
)

const inspectedPoint = computed(
  () =>
    inspectedIndex.value < 0
      ? null
      : props.points[inspectedIndex.value] ?? null,
)

const inspectedLimit = computed(() => {
  const index = inspectedIndex.value
  const theoretical = props.theoretical
  if (index < 0 || theoretical === null) return null
  return theoretical.effective[index] ?? null
})

const inspectedEvaluation = computed(() => {
  const point = inspectedPoint.value
  const limit = inspectedLimit.value
  if (point === null || limit === null) return null
  return evaluationLabel({ theoreticalLimit: limit, delta: point.odometerReading - limit })
})

// A report date after the first one resets the trajectory: the tooltip
// names the new baseline on that point.
const inspectedReset = computed(() => {
  const point = inspectedPoint.value
  const theoretical = props.theoretical
  if (point === null || theoretical === null) return false
  return theoretical.resets.some((reset) => reset.date === point.date)
})

function sourceLabel(sources: ChartSource[]): string {
  const record = sources.includes('record')
  const report = sources.includes('report')
  if (record && report) return t('car.chart.source.both')
  if (report) return t('car.chart.source.report')
  return t('car.chart.source.record')
}

const hitBands = computed(() => {
  const xs = props.points.map((point) => layout.value.x(point.date))
  return props.points.map((point, index) => {
    const left = index === 0 ? layout.value.plot.left : (xs[index - 1]! + xs[index]!) / 2
    const right =
      index === props.points.length - 1 ? layout.value.plot.right : (xs[index]! + xs[index + 1]!) / 2
    return { date: point.date, x: left, width: right - left }
  })
})

// Hover (mouse) opens on band entry and dismisses on band leave; touch skips
// enter/leave so a tap is never dismissed by its own touch-up, and the
// pointer-down toggle then closes it on the second tap.
function isTouch(event: PointerEvent): boolean {
  return event.pointerType === 'touch'
}

function inspect(event: PointerEvent, date: string): void {
  if (isTouch(event)) return
  inspectedDate.value = date
}

function dismiss(event: PointerEvent, date: string): void {
  if (isTouch(event)) return
  if (inspectedDate.value === date) inspectedDate.value = null
}

function toggle(date: string): void {
  inspectedDate.value = inspectedDate.value === date ? null : date
}

// The tooltip is positioned after the render, so it can measure itself:
// above the point when it fits, flipped below otherwise, clamped inside the
// chart at the plot edges. The fallback size applies where the DOM cannot be
// measured (unit tests).
const tooltip = useTemplateRef<HTMLDivElement>('tooltip')

function positionTooltip(): void {
  const point = inspectedPoint.value
  const element = tooltip.value
  if (point === null || element === null) return

  const tooltipWidth = element.offsetWidth || TOOLTIP_FALLBACK_WIDTH
  const tooltipHeight = element.offsetHeight || TOOLTIP_FALLBACK_HEIGHT
  const x = layout.value.x(point.date)
  const y = layout.value.y(point.odometerReading)

  let top = y - tooltipHeight - 8
  if (top < 0) top = y + 8
  top = Math.min(top, layout.value.height - tooltipHeight)
  const left = Math.min(Math.max(0, x - tooltipWidth / 2), layout.value.width - tooltipWidth)

  element.style.left = `${Math.round(left)}px`
  element.style.top = `${Math.round(top)}px`
}

watch([inspectedPoint, layout, locale], positionTooltip, { flush: 'post' })
</script>

<template>
  <!--
    The chart renders at a fallback width until the observer measures the
    container. overflow-hidden keeps that fallback frame from pinning the
    grid track to the fallback width (a grid item otherwise cannot shrink
    below its content) and clips it to the panel.
  -->
  <div ref="container" class="w-full overflow-hidden">
    <!--
      The legend identifies the two series. Its swatches are spans, not
      svgs, so the chart stays the section's only svg element.
    -->
    <div v-if="theoretical" class="flex items-center gap-4 px-2 pb-2">
      <span class="flex items-center gap-1.5 text-xs text-muted">
        <span class="w-4 rounded-full bg-primary" style="height: 2px"></span>
        {{ t('car.chart.actual') }}
      </span>
      <span class="flex items-center gap-1.5 text-xs text-muted">
        <span class="w-4 border-t-2 border-dashed border-warning"></span>
        {{ t('car.chart.theoretical') }}
      </span>
    </div>
    <div class="relative w-full">
      <svg
        :width="layout.width"
        :height="layout.height"
        :viewBox="`0 0 ${layout.width} ${layout.height}`"
        role="img"
        :aria-label="t('car.chart.aria')"
        class="block"
      >
        <g v-for="tick in layout.yTicks" :key="`y-${tick}`">
          <line
            :x1="layout.plot.left"
            :x2="layout.plot.right"
            :y1="layout.y(tick)"
            :y2="layout.y(tick)"
            class="stroke-default"
          />
          <text
            :x="layout.plot.left - 8"
            :y="layout.y(tick) + 3"
            text-anchor="end"
            class="fill-(--ui-text-muted) text-[10px] tabular-nums"
          >
            {{ formatKm(tick) }}
          </text>
        </g>

        <text
          v-for="(point, index) in layout.labeled"
          :key="`x-${point.date}`"
          :x="layout.x(point.date)"
          :y="layout.plot.bottom + 16"
          :text-anchor="xAnchor(index)"
          class="fill-(--ui-text-muted) text-[10px] tabular-nums"
        >
          {{ formatDate(point.date) }}
        </text>

        <!-- At each Insurance Report date after the first, the outgoing
             trajectory (in force up to the day before, extended to this
             date) drops to the incoming report's reading. -->
        <g v-if="theoretical">
          <line
            v-for="reset in theoretical.resets"
            :key="reset.date"
            :x1="layout.x(reset.date)"
            :x2="layout.x(reset.date)"
            :y1="layout.y(reset.to)"
            :y2="layout.y(reset.from)"
            stroke-width="1"
            stroke-dasharray="3 3"
            class="stroke-warning"
          />
        </g>

        <path
          :d="path"
          fill="none"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="stroke-primary"
        />

        <path
          v-if="theoretical && theoreticalPath"
          :d="theoreticalPath"
          fill="none"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-dasharray="3 3"
          class="stroke-warning"
        />

        <circle
          v-for="point in points"
          :key="point.date"
          :cx="layout.x(point.date)"
          :cy="layout.y(point.odometerReading)"
          r="3.5"
          class="fill-primary"
        />

        <!-- One transparent full-column band per date, after the markers so
             it receives the pointer events; hovering or tapping opens the
             shared point inspection. -->
        <g>
          <rect
            v-for="band in hitBands"
            :key="band.date"
            :x="band.x"
            :y="layout.plot.top"
            :width="band.width"
            :height="layout.plot.bottom - layout.plot.top"
            fill="transparent"
            :data-date="band.date"
            @pointerenter="inspect($event, band.date)"
            @pointerleave="dismiss($event, band.date)"
            @pointerdown="toggle(band.date)"
          />
        </g>
      </svg>

      <!-- The shared point inspection; the inspected values are derived
           from the live history, so a change updates or dismisses them.
           It is read-only: it never opens an edit form. -->
      <div
        v-if="inspectedPoint"
        ref="tooltip"
        role="tooltip"
        class="pointer-events-none absolute z-10 rounded-lg border border-slate-800 bg-slate-900/95 px-3 py-2 text-xs shadow-lg"
      >
        <p class="font-medium text-foreground">{{ formatDate(inspectedPoint.date) }}</p>
        <p class="tabular-nums text-foreground">
          {{ formatKm(inspectedPoint.odometerReading) }} km
        </p>
        <p class="text-muted">{{ sourceLabel(inspectedPoint.sources) }}</p>
        <p v-if="inspectedLimit !== null" class="tabular-nums text-muted">
          {{ t('car.chart.theoretical') }}: {{ formatKm(inspectedLimit) }} km
        </p>
        <p v-if="inspectedEvaluation" :class="evaluationToneClasses[inspectedEvaluation.tone]">
          {{ inspectedEvaluation.text }}
        </p>
        <p v-if="inspectedReset" class="text-warning">
          {{ t('car.chart.newBaseline') }}
        </p>
      </div>
    </div>
    <!-- Without an Insurance Report no limit exists; the actual history
         stands alone with the guidance to add one. -->
    <p v-if="!theoretical" class="px-2 pt-2 text-sm text-muted">
      {{ t('car.chart.noReportsHint') }}
    </p>
  </div>
</template>
