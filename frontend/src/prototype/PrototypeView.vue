<script setup lang="ts">
// PROTOTYPE ONLY — throwaway shell: design-variant switcher
// (?variant=wall|cockpit) x style-draft switcher (?style=dark|midnight),
// prototype banner, and floating bottom bar. Data resets on reload.
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetDemoData } from './store'
import { styleDrafts, type StyleId } from './themes'
import WallView from './WallView.vue'
import CockpitView from './CockpitView.vue'

const route = useRoute()
const router = useRouter()

const isDev = import.meta.env.DEV

const variants = [
  { id: 'wall', label: 'Wall', component: WallView },
  { id: 'cockpit', label: 'Cockpit', component: CockpitView },
] as const
type VariantId = (typeof variants)[number]['id']

const variant = computed<VariantId>(() => {
  const query = route.query.variant
  return variants.some((item) => item.id === query) ? (query as VariantId) : 'wall'
})
const activeVariant = computed(() => variants.find((item) => item.id === variant.value)!)

const style = computed<StyleId>(() => {
  const query = route.query.style
  return styleDrafts.some((item) => item.id === query) ? (query as StyleId) : 'dark'
})

const theme = computed(() => styleDrafts.find((item) => item.id === style.value)!)

function selectVariant(id: VariantId) {
  router.replace({ query: { ...route.query, variant: id } })
}

function selectStyle(id: StyleId) {
  router.replace({ query: { ...route.query, style: id } })
}

function cycleVariant(delta: 1 | -1) {
  const index = variants.findIndex((item) => item.id === variant.value)
  selectVariant(variants[(index + delta + variants.length) % variants.length].id)
}

function cycleStyle(delta: 1 | -1) {
  const index = styleDrafts.findIndex((item) => item.id === style.value)
  selectStyle(styleDrafts[(index + delta + styleDrafts.length) % styleDrafts.length].id)
}

function isEditable(target: EventTarget | null) {
  const element = target as HTMLElement | null
  return (
    element !== null &&
    (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable)
  )
}

function onKeydown(event: KeyboardEvent) {
  if (isEditable(event.target)) return
  if (event.key === 'ArrowLeft') cycleVariant(-1)
  else if (event.key === 'ArrowRight') cycleVariant(1)
  else if (event.key === 'ArrowUp') cycleStyle(-1)
  else if (event.key === 'ArrowDown') cycleStyle(1)
}

function applyTheme() {
  const root = document.documentElement
  root.classList.toggle('dark', theme.value.dark)
  for (const [name, value] of Object.entries(theme.value.vars)) {
    root.style.setProperty(name, value)
  }
}

function clearTheme() {
  const root = document.documentElement
  root.classList.remove('dark')
  for (const [name] of Object.entries(theme.value.vars)) {
    root.style.removeProperty(name)
  }
}

watch(theme, applyTheme, { immediate: true })
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTheme()
})
</script>

<template>
  <div class="min-h-screen pb-28">
    <!-- Prototype banner -->
    <div class="bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950">
      UI prototype — nothing here is real: in-memory data, no backend, resets on reload.
    </div>

    <!-- Active design variant -->
    <component :is="activeVariant.component" :theme="theme" />

    <!-- Floating variant x style switcher (dev only) -->
    <div
      v-if="isDev"
      class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
    >
      <div class="flex items-center gap-1">
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
          v-for="item in styleDrafts"
          :key="item.id"
          type="button"
          class="rounded-full px-3 py-1.5 text-sm transition-colors"
          :class="
            item.id === style
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800'
          "
          @click="selectStyle(item.id)"
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
      <p class="mt-1 px-1 text-center text-xs text-muted">
        ←/→ variant · ↑/↓ style
      </p>
    </div>
  </div>
</template>
