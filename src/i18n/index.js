import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en/translation.json'
import ar from '@/locales/ar/translation.json'

export const LANGUAGES = [
  { id: 'en', label: 'English', dir: 'ltr' },
  { id: 'ar', label: 'العربية', dir: 'rtl' },
]

export const PREFERENCES_STORAGE_KEY = 'refract:preferences'

function readStoredLanguage() {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    const language = raw ? JSON.parse(raw)?.state?.language : null
    return LANGUAGES.some((lang) => lang.id === language) ? language : 'en'
  } catch {
    return 'en'
  }
}

export function applyDocumentLanguage(language) {
  const config = LANGUAGES.find((lang) => lang.id === language) ?? LANGUAGES[0]
  document.documentElement.lang = config.id
  document.documentElement.dir = config.dir
}

const initialLanguage = readStoredLanguage()
applyDocumentLanguage(initialLanguage)

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

i18n.on('languageChanged', applyDocumentLanguage)

export default i18n
