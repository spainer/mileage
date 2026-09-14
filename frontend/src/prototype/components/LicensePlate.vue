<script setup lang="ts">
import { computed } from 'vue'

// PROTOTYPE ONLY — EU-style license plate (white plate, blue country band)
// reused across the cockpit hero, wall tiles and the slideover header.
const props = defineProps<{
  license: string
  size?: 'sm' | 'md'
}>()

// Spaced plate: dash surrounded by spaces, space between letters and number
// (SL-S6624E -> SL - S 6624E, M-GC 4821 -> M - GC 4821).
const display = computed(
  () => props.license.replace(/-/g, ' - ').replace(/(?<=[A-Za-z])(?=\d)/g, ' '),
)
</script>

<template>
  <span
    class="inline-flex items-stretch overflow-hidden bg-white font-mono text-zinc-900"
    :class="
      size === 'sm'
        ? 'rounded-md border border-zinc-300/80 text-sm'
        : 'rounded-lg border border-zinc-300 text-xl'
    "
  >
    <span
      class="flex items-center bg-blue-700 font-bold text-white"
      :class="size === 'sm' ? 'px-1.5 text-xs' : 'px-2 text-sm'"
    >
      D
    </span>
    <span :class="size === 'sm' ? 'px-1.5 py-0.5' : 'px-3 py-1.5'">{{ display }}</span>
  </span>
</template>
