<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { formatDate, formatKm } from '../format'
import { i18n } from '../i18n'
import {
  CHART_FALLBACK_WIDTH,
  computeChartLayout,
  type ChartPoint,
  type TheoreticalSeries,
} from '../odometerChart'

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

      <!-- Point inspection (hover/tap) is delivered with the comparison
           chart; the markers are presented, not interactive, here. -->
      <circle
        v-for="point in points"
        :key="point.date"
        :cx="layout.x(point.date)"
        :cy="layout.y(point.odometerReading)"
        r="3.5"
        class="fill-primary"
      />
    </svg>
    <!-- Without an Insurance Report no limit exists; the actual history
         stands alone with the guidance to add one. -->
    <p v-if="!theoretical" class="px-2 pt-2 text-sm text-muted">
      {{ t('car.chart.noReportsHint') }}
    </p>
  </div>
</template>
