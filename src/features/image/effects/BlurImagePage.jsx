import { Droplets } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/Slider'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

const DEFAULTS = { amount: 30 }

function BlurControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <SettingsSection title={t('effects.blur')}>
      <Slider label={t('effects.strength')} value={settings.amount} min={1} max={100} onChange={(amount) => updateSettings({ amount })} />
    </SettingsSection>
  )
}

export default function BlurImagePage() {
  return <EffectToolPage toolId="image-blur" effect="blur" defaults={DEFAULTS} icon={Droplets} suffix="blurred" renderControls={(props) => <BlurControls {...props} />} />
}
