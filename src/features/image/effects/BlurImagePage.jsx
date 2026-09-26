import { Droplets } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_BLUR } from '@/services/image/effectExtras'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

const percent = (value) => `${Math.round(value)}%`

function BlurControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <>
      <SettingsSection title={t('effects.blur')}>
        <Slider label={t('effects.strength')} value={settings.amount} min={1} max={100} onChange={(amount) => updateSettings({ amount })} />
      </SettingsSection>
      <SettingsSection title={t('effects.focusTitle')} description={t(`effects.focusHints.${settings.focus}`)}>
        <SegmentedControl
          label={t('effects.focusArea')}
          value={settings.focus}
          onChange={(focus) => updateSettings({ focus })}
          options={['none', 'radial', 'band'].map((value) => ({ value, label: t(`effects.focusModes.${value}`) }))}
        />
        {settings.focus !== 'none' && (
          <>
            {settings.focus === 'radial' && (
              <Slider label={t('effects.focusX')} value={settings.focusX * 100} min={0} max={100} onChange={(value) => updateSettings({ focusX: value / 100 })} formatValue={percent} />
            )}
            <Slider label={t('effects.focusY')} value={settings.focusY * 100} min={0} max={100} onChange={(value) => updateSettings({ focusY: value / 100 })} formatValue={percent} />
            <Slider label={t('effects.focusSize')} value={settings.focusSize} min={5} max={100} onChange={(focusSize) => updateSettings({ focusSize })} formatValue={percent} />
            <Slider label={t('effects.feather')} value={settings.feather} min={0} max={100} onChange={(feather) => updateSettings({ feather })} formatValue={percent} />
          </>
        )}
      </SettingsSection>
    </>
  )
}

export default function BlurImagePage() {
  return (
    <EffectToolPage
      toolId="image-blur"
      effect="blur"
      defaults={DEFAULT_BLUR}
      icon={Droplets}
      suffix="blurred"
      renderControls={(props) => <BlurControls {...props} />}
      onPreviewPoint={(settings) => (settings.focus === 'none' ? null : ({ x, y }) => (settings.focus === 'radial' ? { focusX: x, focusY: y } : { focusY: y }))}
    />
  )
}
