/**
 * Recovery from stale frontend assets.
 *
 * After a deployment, an app session that is still running the old build can
 * request a chunk that no longer exists on the origin. The failure reaches
 * this module through two seams, both wired from the app entry: a failed
 * lazy route component load is reported through the router's error handler
 * (the router swallows the navigation failure itself), while any other
 * uncaught dynamic-import failure surfaces as an unhandled rejection. In
 * both cases the rejected value is the engine's `TypeError` for the failed
 * module load.
 *
 * This module recognises those failures and reloads the page so the browser
 * fetches the current app shell — at most once per recovery window, so a
 * broken deployment or a dead network cannot produce an endless reload
 * loop. When a reload is not allowed, it shows a full-screen fallback with
 * a manual reload action instead.
 *
 * Ordinary API request failures are not stale-asset failures: the API
 * client surfaces them as `ApiError`s, which the app reports with its usual
 * error UI, and this module leaves them alone.
 */

/** How long after a recovery attempt no further automatic reload is allowed. */
export const RECOVERY_WINDOW_MS = 5 * 60 * 1000

const RECOVERY_MARK_KEY = 'mileage.recovery.lastAttempt'
const FALLBACK_ID = 'app-recovery-fallback'

/**
 * A triggered reload gets this much time to unload the page before the
 * fallback appears. If the reload never happens, the user still gets an
 * action; if it does, the timer dies with the old document.
 */
const FALLBACK_DELAY_MS = 1000

/** The messages each engine reports when a module or its load fails. */
const STALE_ASSET_FAILURE_MESSAGES = [
  // Chromium's wording for a failed dynamic import.
  /failed to fetch dynamically imported module/i,
  // Firefox's wording for a failed module script load.
  /failed to load module script/i,
  // WebKit's generic wording for a failed module or fetch load.
  /load failed/i,
  /failed to fetch/i,
]

/**
 * Whether a rejected value is a failed load of a stale frontend asset, as
 * opposed to an ordinary request failure (an `ApiError`) or anything else.
 */
export function isStaleAssetFailure(value: unknown): boolean {
  if (!(value instanceof TypeError)) return false
  return STALE_ASSET_FAILURE_MESSAGES.some((pattern) => pattern.test(value.message))
}

function readRecoveryMark(): number | null {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(RECOVERY_MARK_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  const mark = Number(raw)
  return Number.isFinite(mark) ? mark : null
}

/** Records that automatic recovery was attempted at `at` (now by default). */
export function markRecoveryAttempt(at: number = Date.now()): void {
  try {
    sessionStorage.setItem(RECOVERY_MARK_KEY, String(at))
  } catch {
    // Storage unavailable: recovery stays unbounded for this tab.
  }
}

/** Whether a recovery attempt was made within the recovery window. */
export function recoveryAttemptedRecently(now: number = Date.now()): boolean {
  const mark = readRecoveryMark()
  return mark !== null && 0 <= now - mark && now - mark < RECOVERY_WINDOW_MS
}

/**
 * Attempts to recover from a stale-asset failure: reloads the page, or shows
 * the manual fallback when a reload was already attempted within the window.
 */
export function recoverFromStaleAsset(): void {
  if (recoveryAttemptedRecently()) {
    showRecoveryFallback()
    return
  }
  markRecoveryAttempt()
  location.reload()
  // If the reload navigation never completes, the page stays broken, so
  // surface the manual fallback shortly afterwards.
  window.setTimeout(showRecoveryFallback, FALLBACK_DELAY_MS)
}

/**
 * Recovers from a stale-asset failure. Returns whether the value was
 * recognised as one, so the unhandled-rejection seam can suppress the
 * rejection; ordinary failures (including `ApiError`s) are left alone.
 */
export function handleStaleAssetError(value: unknown): boolean {
  if (!isStaleAssetFailure(value)) return false
  recoverFromStaleAsset()
  return true
}

function showRecoveryFallback(): void {
  if (document.getElementById(FALLBACK_ID) !== null || document.body === null) return
  const fallback = document.createElement('div')
  fallback.id = FALLBACK_ID
  fallback.className = 'app-recovery-fallback'
  fallback.setAttribute('role', 'alert')
  fallback.style.cssText = [
    'position: fixed',
    'inset: 0',
    'z-index: 100',
    'display: flex',
    'flex-direction: column',
    'align-items: center',
    'justify-content: center',
    'gap: 12px',
    'background: #020617',
    'color: #f8fafc',
    'text-align: center',
    'padding: 24px',
    'font-family: inherit',
  ].join('; ')

  const message = document.createElement('p')
  message.textContent = 'The latest version of Mileage could not be loaded.'

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Reload'
  button.style.cssText = [
    'padding: 8px 20px',
    'border: none',
    'border-radius: 8px',
    'background: #3b82f6',
    'color: #ffffff',
    'font-size: 14px',
    'font-weight: 600',
    'cursor: pointer',
  ].join('; ')
  button.addEventListener('click', () => {
    location.reload()
  })

  fallback.append(message, button)
  document.body.append(fallback)
}

let installed = false

/**
 * Installs the unhandled-rejection listener that recovers from stale
 * asset failures. Safe to call more than once.
 */
export function installStaleAssetRecovery(): void {
  if (installed) return
  installed = true
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (handleStaleAssetError(event.reason)) {
      event.preventDefault()
    }
  })
}
