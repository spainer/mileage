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
  car: {
    tabs: {
      mileage: 'Mileage',
      insurance: 'Insurance',
    },
    latest: 'Latest',
    latestOn: 'on {date}',
    noReadings: 'No readings yet',
    addReading: 'Add reading',
    date: 'Date',
    reading: 'Reading',
    sinceLast: 'Since last',
    limit: 'Limit',
    noMileage: 'No mileage readings yet.',
    kmPerYear: 'km/year',
    editReading: 'Edit reading',
    inForce: 'In force',
    noReportYet: 'no report yet',
    addReport: 'Add report',
    noReports: 'No insurance reports yet.',
    editReport: 'Edit report',
    atReading: 'at {km} km',
    editCar: 'Edit car',
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
  car: {
    tabs: {
      mileage: 'Erfassungen',
      insurance: 'Versicherung',
    },
    latest: 'Letzter Stand',
    latestOn: 'am {date}',
    noReadings: 'Noch keine Erfassungen',
    addReading: 'Erfassung hinzufügen',
    date: 'Datum',
    reading: 'Erfassung',
    sinceLast: 'Seit letzter',
    limit: 'Limit',
    noMileage: 'Noch keine Erfassungen.',
    kmPerYear: 'km/Jahr',
    editReading: 'Erfassung bearbeiten',
    inForce: 'In Kraft',
    noReportYet: 'noch kein Bericht',
    addReport: 'Bericht hinzufügen',
    noReports: 'Noch keine Berichte.',
    editReport: 'Bericht bearbeiten',
    atReading: 'bei {km} km',
    editCar: 'Auto bearbeiten',
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
