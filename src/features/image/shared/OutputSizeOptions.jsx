import { useTranslation } from 'react-i18next'
import { NumberInput } from '@/components/ui/NumberInput'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'

/**
 * Shared "make it smaller" options: scale by percentage and/or cap the longest
 * side. Expects settings { scale, limitDimensions, maxDimension }.
 */
export function OutputSizeOptions({ settings, updateSettings, meta, error }) {
  const { t } = useTranslation()
  const scale = settings.scale ?? 100
  const width = meta?.width ? Math.round((meta.width * scale) / 100) : null
  const height = meta?.height ? Math.round((meta.height * scale) / 100) : null
  const capped = settings.limitDimensions && width && height && Math.max(width, height) > settings.maxDimension
  const ratio = capped ? settings.maxDimension / Math.max(width, height) : 1

  return (
    <>
      <Slider
        label={t('settings.scale')}
        value={scale}
        min={5}
        max={100}
        step={5}
        onChange={(value) => updateSettings({ scale: value })}
        onDoubleClick={() => updateSettings({ scale: 100 })}
        formatValue={(value) => `${value}%`}
      />
      <Switch label={t('settings.limitDimensions')} description={t('settings.limitDimensionsHint')} checked={settings.limitDimensions} onChange={(limitDimensions) => updateSettings({ limitDimensions })} />
      {settings.limitDimensions && (
        <NumberInput label={t('settings.maxDimension')} value={settings.maxDimension} onChange={(maxDimension) => updateSettings({ maxDimension })} min={16} step={64} suffix="px" error={error} />
      )}
      {width && height && (scale !== 100 || capped) && (
        <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2" dir="auto">
          {t('settings.outputSize')}: <span className="font-semibold text-text" dir="ltr">{Math.round(width * ratio)} × {Math.round(height * ratio)} px</span>
        </p>
      )}
    </>
  )
}
