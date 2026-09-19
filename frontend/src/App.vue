<script setup lang="ts">
import ConfirmDialog from './components/ConfirmDialog.vue'
import { useIosSwipeBackPatch } from './composables/useIosSwipeBackPatch'

useIosSwipeBackPatch()
</script>

<template>
   <UApp>
     <RouterView />
     <ConfirmDialog />
   </UApp>
</template>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100dvh;
  overflow: hidden;
}

#app {
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
</style>
