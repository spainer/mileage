<script setup lang="ts">
import { i18n, locale, setLocale } from '../i18n'
import type { Language } from '../i18n/language'

const t = i18n.global.t

// Language names are shown in their own language: the convention for
// language pickers, so each option reads naturally to its speakers.
const options: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
]

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === 'en' || value === 'de') setLocale(value)
}
</script>

<template>
  <select
    :value="locale"
    data-testid="language-selector"
    :aria-label="t('language.label')"
    class="h-9 rounded-lg border border-slate-800 bg-slate-900 px-2 text-sm text-slate-200"
    @change="onChange"
  >
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
