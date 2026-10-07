/**
 * The two generic interface languages the app supports. Regional browser
 * languages map onto these; any other language falls back to English.
 */
export type Language = 'en' | 'de'

/** Browser storage key for the user's explicit language choice. */
export const LANGUAGE_STORAGE_KEY = 'mileage.language'

export const languages: readonly Language[] = ['en', 'de']

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'de'
}

/**
 * Maps a browser language tag (e.g. "de-DE", "en-GB") onto a generic
 * language. Unsupported primary languages and empty tags fall back to
 * English, so the app is always usable.
 */
export function mapBrowserLanguage(tag: string): Language {
  const primary = tag.trim().toLowerCase().split('-')[0]
  return primary === 'de' ? 'de' : 'en'
}

/**
 * Resolves the language for a fresh visit: an explicit choice stored in this
 * browser takes precedence over the detected browser language. A missing or
 * invalid stored value falls back to browser-language detection.
 */
export function resolveInitialLanguage(browserTag: string, stored: unknown): Language {
  return isLanguage(stored) ? stored : mapBrowserLanguage(browserTag)
}
