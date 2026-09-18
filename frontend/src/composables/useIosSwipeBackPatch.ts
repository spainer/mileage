import { onBeforeUnmount } from 'vue'

const EDGE_ZONE_PX = 24
const HORIZONTAL_DOMINANCE = 1.5

interface ActiveSwipe {
  startX: number
  startY: number
}

let installed = false
let teardown: (() => void) | null = null

function install(): void {
  if (installed) return
  installed = true

  if (typeof document === 'undefined') return

  const ua = window.navigator.userAgent
  const isIOS = /iP(?:ad|hone|od)/.test(ua) ||
    (window.navigator.maxTouchPoints > 2 && /iPad|Macintosh/.test(ua))
  if (!isIOS) return

  let active: ActiveSwipe | null = null

  function onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) {
      active = null
      return
    }
    const touch = event.touches[0]
    if (touch.clientX > EDGE_ZONE_PX) {
      active = null
      return
    }
    active = { startX: touch.clientX, startY: touch.clientY }
  }

  function onTouchMove(event: TouchEvent): void {
    if (!active || event.touches.length !== 1) return
    const touch = event.touches[0]
    const dx = touch.clientX - active.startX
    const dy = touch.clientY - active.startY
    if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_DOMINANCE) return
    if (dx <= 0) return
    event.stopPropagation()
  }

  function onTouchEnd(): void {
    active = null
  }

  const capture = { capture: true } as const
  document.addEventListener('touchstart', onTouchStart, { ...capture, passive: true })
  document.addEventListener('touchmove', onTouchMove, { ...capture, passive: true })
  document.addEventListener('touchend', onTouchEnd, { ...capture, passive: true })
  document.addEventListener('touchcancel', onTouchEnd, { ...capture, passive: true })

  teardown = (): void => {
    document.removeEventListener('touchstart', onTouchStart, capture)
    document.removeEventListener('touchmove', onTouchMove, capture)
    document.removeEventListener('touchend', onTouchEnd, capture)
    document.removeEventListener('touchcancel', onTouchEnd, capture)
  }
}

export function useIosSwipeBackPatch(): void {
  install()
  onBeforeUnmount(() => {
    teardown?.()
    installed = false
    teardown = null
  })
}
