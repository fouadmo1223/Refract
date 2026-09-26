import { Grid2x2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/Slider'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

const DEFAULTS = { amount: 25 }

function PixelateControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <SettingsSection title={t('effects.pixelate')}>
      <Slider label={t('effects.blockSize')} value={settings.amount} min={1} max={100} onChange={(amount) => updateSettings({ amount })} />
    </SettingsSection>
  )
}

export default function PixelateImagePage() {
  return <EffectToolPage toolId="image-pixelate" effect="pixelate" defaults={DEFAULTS} icon={Grid2x2} suffix="pixelated" renderControls={(props) => <PixelateControls {...props} />} />
}
