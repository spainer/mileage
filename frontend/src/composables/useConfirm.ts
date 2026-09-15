import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

export interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}

const state = ref<ConfirmState | null>(null)
let settle: ((confirmed: boolean) => void) | null = null

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    state.value = {
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
    }
    return new Promise<boolean>((resolve) => {
      settle = resolve
    })
  }

  function answer(confirmed: boolean): void {
    state.value = null
    const done = settle
    settle = null
    done?.(confirmed)
  }

  return { state, confirm, answer }
}
