<script setup lang="ts">
// PROTOTYPE ONLY — throwaway shell: style-draft switcher
// (?style=clean|dark|midnight), prototype banner, and floating bottom bar.
// Data resets on reload.
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetDemoData } from './store'
import { styleDrafts, type StyleId } from './themes'
import GarageView from './GarageView.vue'

const route = useRoute()
const router = useRouter()

const isDev = import.meta.env.DEV

const style = computed<StyleId>(() => {
  const query = route.query.style
  return styleDrafts.some((item) => item.id === query) ? (query as StyleId) : 'clean'
})

const theme = computed(() => styleDrafts.find((item) => item.id === style.value)!)

function selectStyle(id: StyleId) {
  router.replace({ query: { ...route.query, style: id } })
}

function cycleStyle(delta: 1 | -1) {
  const index = styleDrafts.findIndex((item) => item.id === style.value)
  selectStyle(styleDrafts[(index + delta + styleDrafts.length) % styleDrafts.length].id)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  const target = event.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  cycleStyle(event.key === 'ArrowRight' ? 1 : -1)
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

    <!-- Current style draft -->
    <GarageView :theme="theme" />

    <!-- Floating style switcher (dev only) -->
    <div
      v-if="isDev"
      class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
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
  </div>
</template>
