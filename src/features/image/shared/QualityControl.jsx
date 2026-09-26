import { useTranslation } from 'react-i18next'
import { IMAGE_QUALITY_PRESETS, getQualityPresetId } from '@/constants/presets'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'

/**
 * Quality preset select + fine 1–100 slider, kept in sync:
 * choosing a preset moves the slider; moving the slider selects the matching
 * preset or "Custom".
 */
export function QualityControl({ quality, onChange, error, disabled }) {
  const { t } = useTranslation()
  const presetId = getQualityPresetId(quality)

  return (
    <div className="flex flex-col gap-3">
      <Select
        label={t('settings.qualityPreset')}
        value={presetId}
        disabled={disabled}
        onChange={(id) => {
          const preset = IMAGE_QUALITY_PRESETS.find((item) => item.id === id)
          if (preset?.quality) onChange(preset.quality)
        }}
        options={IMAGE_QUALITY_PRESETS.map((preset) => ({
          value: preset.id,
          label: t(`presets.quality.${preset.id}`),
          description: t(`presets.quality.${preset.id}Description`),
          meta: preset.quality ? `${preset.quality}%` : undefined,
          disabled: preset.id === 'custom',
        }))}
      />
      <Slider label={t('settings.quality')} value={quality} min={1} max={100} onChange={onChange} formatValue={(value) => `${value}%`} disabled={disabled} />
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {t(error)}
        </p>
      )}
    </div>
  )
}
