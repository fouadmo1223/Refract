import { Grid2x2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_PIXELATE } from '@/services/image/effectExtras'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

function PixelateControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <SettingsSection title={t('effects.pixelate')}>
      <Slider label={t('effects.blockSize')} value={settings.amount} min={1} max={100} onChange={(amount) => updateSettings({ amount })} />
      <SegmentedControl
        label={t('effects.pixelStyle')}
        value={settings.style}
        onChange={(style) => updateSettings({ style })}
        options={['square', 'tiles', 'dots'].map((value) => ({ value, label: t(`effects.pixelStyles.${value}`) }))}
      />
      {settings.style !== 'square' && (
        <>
          <Slider label={t('effects.pixelGap')} value={settings.gap} min={2} max={50} onChange={(gap) => updateSettings({ gap })} formatValue={(value) => `${value}%`} />
          <ColorInput label={t('effects.pixelBackground')} value={settings.background} onChange={(background) => updateSettings({ background })} />
        </>
      )}
    </SettingsSection>
  )
}

export default function PixelateImagePage() {
  return <EffectToolPage toolId="image-pixelate" effect="pixelate" defaults={DEFAULT_PIXELATE} icon={Grid2x2} suffix="pixelated" renderControls={(props) => <PixelateControls {...props} />} />
}
