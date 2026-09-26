import { RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

const DEFAULTS = { rotation: 90 }

function RotateControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <SettingsSection title={t('effects.rotation')}>
      <SegmentedControl
        value={[90, 180, 270].includes(settings.rotation) ? settings.rotation : null}
        onChange={(rotation) => updateSettings({ rotation })}
        options={[90, 180, 270].map((value) => ({ value, label: `${value}°` }))}
      />
      <Slider label={t('effects.customAngle')} value={settings.rotation} min={-180} max={270} origin={0} onChange={(rotation) => updateSettings({ rotation })} formatValue={(value) => `${value}°`} />
      <p className="text-xs text-muted">{t('effects.rotateHint')}</p>
    </SettingsSection>
  )
}

export default function RotateImagePage() {
  return <EffectToolPage toolId="image-rotate" effect="rotate" defaults={DEFAULTS} icon={RotateCw} suffix="rotated" renderControls={(props) => <RotateControls {...props} />} />
}
