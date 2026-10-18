<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { formatDate, formatKm } from '../format'
import { i18n } from '../i18n'
import {
  CHART_FALLBACK_WIDTH,
  computeChartLayout,
  type ChartPoint,
} from '../odometerChart'

const props = defineProps<{
  /**
   * The Car's combined Odometer Reading history, oldest first, with at most
   * one point per date. The caller renders the empty state; the layout
   * needs at least one point, so an empty array here is a bug.
   */
  points: ChartPoint[]
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

const layout = computed(() => computeChartLayout(props.points, width.value))

// The series path. Consolidated points always have distinct dates, but the
// guard stays explicit: line segments only connect distinct dates.
const path = computed(() =>
  props.points
    .map((point, index) => {
      const previous = props.points[index - 1]
      const command = previous === undefined || previous.date === point.date ? 'M' : 'L'
      return `${command} ${layout.value.x(point.date)} ${layout.value.y(point.odometerReading)}`
    })
    .join(' '),
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

      <path
        :d="path"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="stroke-primary"
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
  </div>
</template>
