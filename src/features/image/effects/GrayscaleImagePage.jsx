import { Contrast } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { DEFAULT_MONO, MONO_TONES } from '@/services/image/effectExtras'
import { Slider } from '@/components/ui/Slider'
import { SettingsSection } from '@/components/layout/Panels'
import { EffectToolPage } from './EffectToolPage'

const swatch = (tone) => (MONO_TONES[tone] ? `linear-gradient(135deg, rgb(${MONO_TONES[tone][0].join(',')}), rgb(${MONO_TONES[tone][1].join(',')}))` : 'linear-gradient(135deg, #111, #eee)')

function GrayscaleControls({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <>
      <SettingsSection title={t('effects.grayscale')}>
        <Slider label={t('effects.intensity')} value={settings.amount} min={0} max={100} onChange={(amount) => updateSettings({ amount })} formatValue={(value) => `${value}%`} />
        <Slider label={t('editor.adjustments.contrast')} value={settings.contrast} min={-100} max={100} origin={0} onChange={(contrast) => updateSettings({ contrast })} onDoubleClick={() => updateSettings({ contrast: 0 })} />
        <Slider label={t('editor.adjustments.brightness')} value={settings.brightness} min={-100} max={100} origin={0} onChange={(brightness) => updateSettings({ brightness })} onDoubleClick={() => updateSettings({ brightness: 0 })} />
      </SettingsSection>
      <SettingsSection title={t('effects.tone')}>
        <div role="radiogroup" aria-label={t('effects.tone')} className="grid grid-cols-5 gap-1.5">
          {Object.keys(MONO_TONES).map((tone) => {
            const checked = settings.tone === tone
            return (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => updateSettings({ tone })}
                className={cn('flex flex-col items-center gap-1 rounded-md p-1 text-2xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', checked ? 'bg-primary-soft text-primary-soft-fg ring-1 ring-primary' : 'text-text-2 hover:bg-surface-2')}
              >
                <span className="h-7 w-full rounded-sm ring-1 ring-inset ring-black/10" style={{ background: swatch(tone) }} />
                {t(`effects.tones.${tone}`)}
              </button>
            )
          })}
        </div>
        {settings.tone !== 'neutral' && <Slider label={t('effects.toneStrength')} value={settings.toneStrength} min={0} max={100} onChange={(toneStrength) => updateSettings({ toneStrength })} formatValue={(value) => `${value}%`} />}
      </SettingsSection>
    </>
  )
}

export default function GrayscaleImagePage() {
  return <EffectToolPage toolId="image-grayscale" effect="grayscale" defaults={DEFAULT_MONO} icon={Contrast} suffix="grayscale" renderControls={(props) => <GrayscaleControls {...props} />} />
}
