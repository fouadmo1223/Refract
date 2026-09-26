import { Languages, Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '@/i18n'
import { usePreferencesStore } from '@/store/preferencesStore'
import { useResolvedTheme } from '@/hooks/useTheme'
import { Dropdown } from '@/components/ui/Dropdown'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor }

export function LanguageMenu() {
  const { t } = useTranslation()
  const language = usePreferencesStore((state) => state.language)
  const setLanguage = usePreferencesStore((state) => state.setLanguage)
  return (
    <Dropdown
      label={t('preferences.language')}
      trigger={<IconButton icon={Languages} label={t('preferences.language')} />}
      items={LANGUAGES.map((lang) => ({ id: lang.id, label: lang.label, checked: language === lang.id, onSelect: () => setLanguage(lang.id) }))}
    />
  )
}

export function ThemeMenu() {
  const { t } = useTranslation()
  const theme = usePreferencesStore((state) => state.theme)
  const setTheme = usePreferencesStore((state) => state.setTheme)
  const resolved = useResolvedTheme()
  return (
    <Dropdown
      label={t('preferences.theme')}
      trigger={<IconButton icon={resolved === 'dark' ? Moon : Sun} label={t('preferences.theme')} />}
      items={['light', 'dark', 'system'].map((id) => ({ id, label: t(`preferences.themes.${id}`), icon: THEME_ICONS[id], checked: theme === id, onSelect: () => setTheme(id) }))}
    />
  )
}

/** Inline versions for the mobile drawer. */
export function PreferenceFields() {
  const { t } = useTranslation()
  const { theme, setTheme, language, setLanguage } = usePreferencesStore()
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label={t('preferences.language')}
        value={language}
        onChange={setLanguage}
        options={LANGUAGES.map((lang) => ({ value: lang.id, label: lang.label }))}
      />
      <SegmentedControl
        label={t('preferences.theme')}
        value={theme}
        onChange={setTheme}
        options={['light', 'dark', 'system'].map((id) => ({ value: id, label: t(`preferences.themes.${id}`), icon: THEME_ICONS[id] }))}
      />
    </div>
  )
}
