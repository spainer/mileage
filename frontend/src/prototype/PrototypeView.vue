<script setup lang="ts">
// PROTOTYPE ONLY — throwaway shell: variant switcher (?variant=v1|v2|v3),
// prototype banner, and floating bottom bar. Data resets on reload.
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetDemoData } from './store'
import V1MasterDetail from './variants/V1MasterDetail.vue'
import V2Timeline from './variants/V2Timeline.vue'
import V3Garage from './variants/V3Garage.vue'

const route = useRoute()
const router = useRouter()

const variants = [
  { id: 'v1', label: 'Master–Detail' },
  { id: 'v2', label: 'Timeline' },
  { id: 'v3', label: 'Garage' },
] as const

type VariantId = (typeof variants)[number]['id']

const isDev = import.meta.env.DEV

const variant = computed<VariantId>(() => {
  const query = route.query.variant
  return variants.some((item) => item.id === query) ? (query as VariantId) : 'v1'
})

function selectVariant(id: VariantId) {
  router.replace({ query: { ...route.query, variant: id } })
}

function cycleVariant(delta: 1 | -1) {
  const index = variants.findIndex((item) => item.id === variant.value)
  selectVariant(variants[(index + delta + variants.length) % variants.length].id)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  const target = event.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  cycleVariant(event.key === 'ArrowRight' ? 1 : -1)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="min-h-screen pb-28">
    <!-- Prototype banner -->
    <div class="bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950">
      UI prototype — nothing here is real: in-memory data, no backend, resets on reload.
    </div>

    <!-- Current variant -->
    <component :is="variant === 'v1' ? V1MasterDetail : variant === 'v2' ? V2Timeline : V3Garage" />

    <!-- Floating variant switcher (dev only) -->
    <div
      v-if="isDev"
      class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <button
        v-for="item in variants"
        :key="item.id"
        type="button"
        class="rounded-full px-3 py-1.5 text-sm transition-colors"
        :class="
          item.id === variant
            ? 'bg-primary text-primary-foreground'
            : 'text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800'
        "
        @click="selectVariant(item.id)"
      >
        {{ item.label }}
      </button>
      <span class="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden="true" />
      <button
        type="button"
        class="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="Reset demo data"
        @click="resetDemoData()"
      >
        Reset data
      </button>
    </div>
  </div>
</template>
