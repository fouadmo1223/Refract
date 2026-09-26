import { RotateCcw, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_ROTATE } from '@/services/image/effectExtras'
import { Button } from '@/components/ui/Button'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

const normalize = (angle) => ((((angle + 180) % 360) + 360) % 360) - 180

function RotateControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  const rightAngle = settings.rotation % 90 === 0
  const nudge = (delta) => updateSettings({ rotation: normalize(settings.rotation + delta) })
  return (
    <>
      <SettingsSection title={t('effects.rotation')}>
        <SegmentedControl
          value={[90, 180, -90].includes(settings.rotation) ? settings.rotation : null}
          onChange={(rotation) => updateSettings({ rotation })}
          options={[
            { value: -90, label: '90° ↺' },
            { value: 90, label: '90° ↻' },
            { value: 180, label: '180°' },
          ]}
        />
        <Slider
          label={t('effects.customAngle')}
          value={settings.rotation}
          min={-180}
          max={180}
          step={0.5}
          origin={0}
          onChange={(rotation) => updateSettings({ rotation })}
          onDoubleClick={() => updateSettings({ rotation: 0 })}
          formatValue={(value) => `${value}°`}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="secondary" size="xs" leftIcon={RotateCcw} onClick={() => nudge(-1)}>
            −1°
          </Button>
          <Button variant="secondary" size="xs" leftIcon={RotateCw} onClick={() => nudge(1)}>
            +1°
          </Button>
        </div>
      </SettingsSection>
      {!rightAngle && (
        <SettingsSection title={t('effects.corners')}>
          <Switch label={t('effects.autoCrop')} description={t('effects.autoCropHint')} checked={settings.autoCrop} onChange={(autoCrop) => updateSettings({ autoCrop })} />
          {!settings.autoCrop && (
            <>
              <SegmentedControl
                label={t('effects.cornerFill')}
                value={settings.fill}
                onChange={(fill) => updateSettings({ fill })}
                options={[
                  { value: 'transparent', label: t('effects.fills.transparent') },
                  { value: 'color', label: t('effects.fills.color') },
                ]}
              />
              {settings.fill === 'color' && <ColorInput label={t('settings.backgroundColor')} value={settings.fillColor} onChange={(fillColor) => updateSettings({ fillColor })} />}
              {settings.fill === 'transparent' && <p className="-mt-1 text-xs text-muted">{t('effects.rotateHint')}</p>}
            </>
          )}
        </SettingsSection>
      )}
    </>
  )
}

export default function RotateImagePage() {
  return <EffectToolPage toolId="image-rotate" effect="rotate" defaults={DEFAULT_ROTATE} icon={RotateCw} suffix="rotated" renderControls={(props) => <RotateControls {...props} />} />
}
