import { FlipHorizontal2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/Switch'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

const DEFAULTS = { flipH: true, flipV: false }

function FlipControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <SettingsSection title={t('effects.flip')}>
      <Switch label={t('crop.flipHorizontal')} checked={settings.flipH} onChange={(flipH) => updateSettings({ flipH })} />
      <Switch label={t('crop.flipVertical')} checked={settings.flipV} onChange={(flipV) => updateSettings({ flipV })} />
    </SettingsSection>
  )
}

export default function FlipImagePage() {
  return <EffectToolPage toolId="image-flip" effect="flip" defaults={DEFAULTS} icon={FlipHorizontal2} suffix="flipped" renderControls={(props) => <FlipControls {...props} />} />
}
