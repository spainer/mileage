import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useConfirm } from '../composables/useConfirm'
import { setLocale } from '../i18n'

beforeEach(() => {
  setLocale('en')
})

afterEach(() => {
  setLocale('en')
})

describe('useConfirm', () => {
  it('resolves true on confirm and false on cancel', async () => {
    const { confirm, answer } = useConfirm()

    const confirmed = confirm({ title: 'Delete car', message: 'This deletes the car.' })
    answer(true)
    await expect(confirmed).resolves.toBe(true)

    const cancelled = confirm({ title: 'Delete car', message: 'This deletes the car.' })
    answer(false)
    await expect(cancelled).resolves.toBe(false)
  })

  it('defaults the button labels to English in English', async () => {
    const { state, confirm, answer } = useConfirm()

    const promise = confirm({ title: 'Delete car', message: 'This deletes the car.' })
    expect(state.value).toEqual({
      title: 'Delete car',
      message: 'This deletes the car.',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
    })
    answer(false)
    await expect(promise).resolves.toBe(false)
  })

  it('defaults the button labels to German in German', async () => {
    setLocale('de')
    const { state, confirm, answer } = useConfirm()

    const promise = confirm({ title: 'Auto löschen', message: 'Dies löscht das Auto.' })
    expect(state.value).toEqual({
      title: 'Auto löschen',
      message: 'Dies löscht das Auto.',
      confirmLabel: 'Bestätigen',
      cancelLabel: 'Abbrechen',
    })
    answer(true)
    await expect(promise).resolves.toBe(true)
  })

  it('keeps explicitly provided labels', async () => {
    setLocale('de')
    const { state, confirm, answer } = useConfirm()

    const promise = confirm({
      title: 'Auto löschen',
      message: 'Dies löscht das Auto.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    })
    expect(state.value?.confirmLabel).toBe('Delete')
    expect(state.value?.cancelLabel).toBe('Cancel')
    answer(false)
    await expect(promise).resolves.toBe(false)
  })
})
