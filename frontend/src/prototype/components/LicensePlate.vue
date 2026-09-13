<script setup lang="ts">
// PROTOTYPE ONLY — EU-style license plate (white plate, blue country band)
// reused across the cockpit hero, wall tiles and the slideover header.
defineProps<{
  license: string
  size?: 'sm' | 'md'
}>()
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
    <span :class="size === 'sm' ? 'px-1.5 py-0.5' : 'px-3 py-1.5'">{{ license }}</span>
  </span>
</template>
