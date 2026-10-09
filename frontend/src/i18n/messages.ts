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
  form: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
  },
  errors: {
    network: 'Could not reach the server. Please check your connection and try again.',
    generic: 'Something went wrong.',
    duplicateLicense: 'A car with this license already exists.',
  },
  carForm: {
    titleAdd: 'Add car',
    manufacturer: 'Manufacturer',
    model: 'Model',
    license: 'License',
    licenseInvalid: 'License must be a valid German license (e.g. M-AB1234).',
    allRequired: 'All fields are required.',
    deleteTitle: 'Delete car',
    deleteMessage:
      'This deletes {car} together with all of its Mileage Records and Insurance Reports.',
  },
  readingForm: {
    description: 'The odometer reading at a point in time.',
    reading: 'Odometer reading (km)',
    dateRequired: 'A date is required.',
    readingRequired: 'An odometer reading in km (>= 0) is required.',
    deleteTitle: 'Delete reading',
    deleteMessage: 'This deletes the reading of {km} km on {date}.',
  },
  reportForm: {
    description: 'The odometer reading and the annual mileage cap at a point in time.',
    cap: 'Annual mileage cap (km/year)',
    capRequired: 'An annual mileage cap in km/year (>= 0) is required.',
    deleteTitle: 'Delete report',
    deleteMessage: 'This deletes the report of {cap} km/year on {date}.',
  },
  odometer: {
    sameDate: 'Odometer reading must be {km} km.',
    atLeast: 'Odometer reading must be at least {km} km.',
    atMost: 'Odometer reading must be at most {km} km.',
    hintSameDate: 'Must be {km} km.',
    hintBetween: 'Must be between {lower} and {upper} km.',
    hintAtLeast: 'Must be at least {km} km.',
    hintAtMost: 'Must be at most {km} km.',
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
  form: {
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    confirm: 'Bestätigen',
  },
  errors: {
    network: 'Der Server ist nicht erreichbar. Bitte prüfe deine Verbindung und versuche es erneut.',
    generic: 'Etwas ist schiefgelaufen.',
    duplicateLicense: 'Ein Auto mit diesem Kennzeichen existiert bereits.',
  },
  carForm: {
    titleAdd: 'Auto hinzufügen',
    manufacturer: 'Hersteller',
    model: 'Modell',
    license: 'Kennzeichen',
    licenseInvalid: 'Das Kennzeichen muss ein gültiges deutsches Kennzeichen sein (z. B. M-AB1234).',
    allRequired: 'Alle Felder sind erforderlich.',
    deleteTitle: 'Auto löschen',
    deleteMessage: 'Dies löscht {car} zusammen mit allen Erfassungen und Berichten.',
  },
  readingForm: {
    description: 'Der Kilometerstand zu einem Zeitpunkt.',
    reading: 'Erfassung (km)',
    dateRequired: 'Ein Datum ist erforderlich.',
    readingRequired: 'Eine Erfassung in km (>= 0) ist erforderlich.',
    deleteTitle: 'Erfassung löschen',
    deleteMessage: 'Dies löscht die Erfassung von {km} km am {date}.',
  },
  reportForm: {
    description: 'Der Kilometerstand und das jährliche Limit zu einem Zeitpunkt.',
    cap: 'Jährliches Limit (km/Jahr)',
    capRequired: 'Ein jährliches Limit in km/Jahr (>= 0) ist erforderlich.',
    deleteTitle: 'Bericht löschen',
    deleteMessage: 'Dies löscht den Bericht von {cap} km/Jahr am {date}.',
  },
  odometer: {
    sameDate: 'Die Erfassung muss {km} km betragen.',
    atLeast: 'Die Erfassung muss mindestens {km} km betragen.',
    atMost: 'Die Erfassung darf höchstens {km} km betragen.',
    hintSameDate: 'Muss {km} km betragen.',
    hintBetween: 'Muss zwischen {lower} und {upper} km liegen.',
    hintAtLeast: 'Muss mindestens {km} km betragen.',
    hintAtMost: 'Muss höchstens {km} km betragen.',
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
