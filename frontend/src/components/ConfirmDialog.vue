<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'

const { state, answer } = useConfirm()

function onOpenChange(value: boolean) {
  if (!value) {
    answer(false)
  }
}
</script>

<template>
  <UModal
    :open="state !== null"
    :title="state?.title"
    :ui="{ overlay: 'z-50', content: 'z-50' }"
    @update:open="onOpenChange"
  >
    <template v-if="state" #body>
      <p class="text-sm text-muted">{{ state.message }}</p>
    </template>
    <template v-if="state" #footer>
      <div class="flex w-full items-center gap-2">
        <span class="grow" />
        <UButton color="neutral" variant="ghost" @click="answer(false)">
          {{ state.cancelLabel }}
        </UButton>
        <UButton color="error" variant="solid" @click="answer(true)">
          {{ state.confirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
