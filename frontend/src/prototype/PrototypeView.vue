<!-- PROTOTYPE ONLY — throwaway shell around the locked-in design
     (Wall layout, dark style). Everything under /src/prototype is scratch;
     nothing here is meant to survive into the app. -->
<script setup lang="ts">
import WallView from './WallView.vue'
import { resetDemoData } from './store'

const isDev = import.meta.env.DEV
</script>

<template>
  <div class="min-h-screen pb-20">
    <UAlert variant="solid" color="warning" class="mb-8 border-0 text-sm">
      <template #title>UI prototype — nothing here is real</template>
      Throwaway design with in-memory data. Resets on reload.
    </UAlert>

    <WallView />

    <!-- Floating reset control (dev only) -->
    <div v-if="isDev" class="fixed bottom-4 left-1/2 -translate-x-1/2">
      <UBadge
        class="flex items-center gap-3 border-zinc-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
        text="sm"
      >
        <span class="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Prototype</span>
        <UButton variant="ghost" color="error" size="sm" @click="resetDemoData()">
          Reset data
        </UButton>
      </UBadge>
    </div>
  </div>
</template>
