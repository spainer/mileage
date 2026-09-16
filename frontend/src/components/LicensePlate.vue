<script setup lang="ts">
import { computed } from 'vue'

import { formatPlate } from '../format'

const props = defineProps<{
  license: string
  size?: 'sm' | 'md'
}>()

const display = computed(() => formatPlate(props.license))

const sizeStyles = {
  sm: {
    plate: 'rounded-md border border-zinc-300/80 text-sm',
    strip: 'px-1.5 text-xs',
    body: 'px-1.5 py-0.5',
  },
  md: {
    plate: 'rounded-lg border border-zinc-300 text-xl',
    strip: 'px-2 text-sm',
    body: 'px-3 py-1.5',
  },
} as const

const styles = computed(() => sizeStyles[props.size === 'sm' ? 'sm' : 'md'])
</script>

<template>
  <span
    class="inline-flex items-stretch overflow-hidden bg-white font-mono text-zinc-900"
    :class="styles.plate"
  >
    <span
      class="flex items-center bg-blue-700 font-bold text-white"
      :class="styles.strip"
    >
      D
    </span>
    <span :class="styles.body">{{ display }}</span>
  </span>
</template>
