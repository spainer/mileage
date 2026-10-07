import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../api/client'
import {
  isStaleAssetFailure,
  markRecoveryAttempt,
  recoverFromStaleAsset,
  RECOVERY_WINDOW_MS,
  recoveryAttemptedRecently,
} from '../appRecovery'

describe('isStaleAssetFailure', () => {
  it('recognises a failed dynamic import of a stale chunk', () => {
    const error = new TypeError(
      'Failed to fetch dynamically imported module: http://localhost:8000/assets/GarageView-abc.js',
    )
    expect(isStaleAssetFailure(error)).toBe(true)
  })

  it('recognises the generic network failures engines report for module loads', () => {
    // WebKit reports a failed module load without the dynamic-import wording.
    expect(isStaleAssetFailure(new TypeError('Load failed'))).toBe(true)
    expect(isStaleAssetFailure(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('does not classify ordinary API request failures', () => {
    expect(isStaleAssetFailure(new ApiError('Could not reach the server.', null))).toBe(false)
    expect(isStaleAssetFailure(new ApiError('Request failed with status 500', 500))).toBe(false)
  })

  it('does not classify unrelated values', () => {
    expect(isStaleAssetFailure(new Error('boom'))).toBe(false)
    expect(isStaleAssetFailure(null)).toBe(false)
    expect(isStaleAssetFailure('Load failed')).toBe(false)
  })
})

describe('recovery attempt window', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('allows an attempt when none was made recently', () => {
    expect(recoveryAttemptedRecently()).toBe(false)
  })

  it('treats a mark inside the window as a recent attempt', () => {
    markRecoveryAttempt()

    expect(recoveryAttemptedRecently()).toBe(true)
  })

  it('ignores a mark older than the window', () => {
    markRecoveryAttempt(Date.now() - RECOVERY_WINDOW_MS - 1000)

    expect(recoveryAttemptedRecently()).toBe(false)
  })
})

describe('recoverFromStaleAsset', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    document.getElementById('app-recovery-fallback')?.remove()
    vi.unstubAllGlobals()
  })

  it('marks the attempt and reloads the page', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })

    recoverFromStaleAsset()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(recoveryAttemptedRecently()).toBe(true)
  })

  it('shows a fallback with a reload action instead of reloading again within the window', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    markRecoveryAttempt()

    recoverFromStaleAsset()

    expect(reload).not.toHaveBeenCalled()
    const fallback = document.getElementById('app-recovery-fallback')
    expect(fallback).not.toBeNull()
    expect(fallback?.querySelector('button')?.textContent).toBe('Reload')
  })

  it('shows the fallback only once', () => {
    vi.stubGlobal('location', { reload: vi.fn() })
    markRecoveryAttempt()

    recoverFromStaleAsset()
    recoverFromStaleAsset()

    expect(document.getElementsByClassName('app-recovery-fallback').length).toBe(1)
  })
})
