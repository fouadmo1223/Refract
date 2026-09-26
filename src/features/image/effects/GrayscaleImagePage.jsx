import { Contrast } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/Slider'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

const DEFAULTS = { amount: 100 }

function GrayscaleControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <SettingsSection title={t('effects.grayscale')}>
      <Slider label={t('effects.intensity')} value={settings.amount} min={0} max={100} onChange={(amount) => updateSettings({ amount })} formatValue={(value) => `${value}%`} />
    </SettingsSection>
  )
}

export default function GrayscaleImagePage() {
  return <EffectToolPage toolId="image-grayscale" effect="grayscale" defaults={DEFAULTS} icon={Contrast} suffix="grayscale" renderControls={(props) => <GrayscaleControls {...props} />} />
}
