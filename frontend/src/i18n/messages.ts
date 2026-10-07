/**
 * The generic English catalog. The German catalog below must carry the same
 * keys; the shared `Messages` type keeps them in lockstep at compile time.
 *
 * Only presentation-level, app-owned strings live here: user content and
 * domain data (license plates, manufacturer/model names, dates, numbers)
 * are never translated, and storage/API representations stay
 * locale-independent.
 */
export const en = {
  app: {
    title: 'Mileage',
  },
  garage: {
    heading: 'Garage',
    subtitle: 'Every car at a glance.',
    addCar: '+ Add car',
    latest: 'Latest',
    capPerYear: 'Cap / year',
    capReset: 'Cap reset',
    readings: '{count} reading | {count} readings',
    reports: '{count} report | {count} reports',
    loadFailedTitle: 'Could not load the garage',
    retry: 'Retry',
  },
  evaluation: {
    over: '{km} km over',
    under: '{km} km under',
    onLimit: 'On limit',
  },
  language: {
    label: 'Language',
  },
} as const

/** Maps a catalog's literal types onto plain string values, keeping the keys. */
type AsStrings<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends readonly unknown[] ? T[K] : AsStrings<T[K]>
}

export type Messages = AsStrings<typeof en>

export const de: Messages = {
  app: {
    title: 'Kilometerstand',
  },
  garage: {
    heading: 'Garage',
    subtitle: 'Alle Autos auf einen Blick.',
    addCar: '+ Auto hinzufügen',
    latest: 'Letzter Stand',
    capPerYear: 'Limit / Jahr',
    capReset: 'Limit-Reset',
    readings: '{count} Erfassung | {count} Erfassungen',
    reports: '{count} Bericht | {count} Berichte',
    loadFailedTitle: 'Die Garage konnte nicht geladen werden',
    retry: 'Erneut versuchen',
  },
  evaluation: {
    over: '{km} km über',
    under: '{km} km unter',
    onLimit: 'Am Limit',
  },
  language: {
    label: 'Sprache',
  },
}
