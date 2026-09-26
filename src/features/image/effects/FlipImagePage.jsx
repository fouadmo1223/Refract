import { FlipHorizontal2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_FLIP } from '@/services/image/effectExtras'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

const MIRROR_SIDES = ['mirror-left', 'mirror-right', 'mirror-top', 'mirror-bottom']

function FlipControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  const mirror = settings.mode !== 'flip'
  return (
    <SettingsSection title={t('effects.flip')}>
      <SegmentedControl
        label={t('effects.flipMode')}
        value={mirror ? 'mirror' : 'flip'}
        onChange={(value) => updateSettings({ mode: value === 'flip' ? 'flip' : 'mirror-left' })}
        options={[
          { value: 'flip', label: t('effects.flipModes.flip') },
          { value: 'mirror', label: t('effects.flipModes.mirror') },
        ]}
      />
      {mirror ? (
        <>
          <SegmentedControl
            label={t('effects.keepSide')}
            wrap
            value={settings.mode}
            onChange={(mode) => updateSettings({ mode })}
            options={MIRROR_SIDES.map((value) => ({ value, label: t(`effects.sides.${value.replace('mirror-', '')}`) }))}
          />
          <p className="-mt-1 text-xs text-muted">{t('effects.mirrorHint')}</p>
        </>
      ) : (
        <>
          <Switch label={t('crop.flipHorizontal')} checked={settings.flipH} onChange={(flipH) => updateSettings({ flipH })} />
          <Switch label={t('crop.flipVertical')} checked={settings.flipV} onChange={(flipV) => updateSettings({ flipV })} />
        </>
      )}
    </SettingsSection>
  )
}

export default function FlipImagePage() {
  return <EffectToolPage toolId="image-flip" effect="flip" defaults={DEFAULT_FLIP} icon={FlipHorizontal2} suffix="flipped" renderControls={(props) => <FlipControls {...props} />} />
}
