import { Minimize2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { COMPRESSIBLE_FORMATS } from '@/constants/imageFormats'
import { formatBytes } from '@/lib/format'
import { useValidation } from '@/hooks/useValidation'
import { TARGET_SIZE_FORMATS, compressImage } from '@/services/image/imageCompressionService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Accordion } from '@/components/ui/Accordion'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { ImageResult } from '../shared/ImageResult'
import { FormatSelect } from '../shared/FormatSelect'
import { OutputSizeOptions } from '../shared/OutputSizeOptions'
import { imageOutputName } from '../shared/batchHelpers'
import { QualityControl } from '../shared/QualityControl'
import { dimensionSchema, qualitySchema, refineWhen } from '../shared/schemas'

const TOOL_ID = 'image-compress'
const DEFAULTS = { mode: 'quality', quality: 75, targetKB: 200, format: 'original', scale: 100, limitDimensions: false, maxDimension: 2560 }
const SIZE_PRESETS = [50, 100, 200, 500, 1000]

const schema = z.object({ quality: qualitySchema }).passthrough().superRefine(refineWhen('limitDimensions', 'maxDimension', dimensionSchema('dimension')))

const isTargetValid = (settings) => settings.mode !== 'size' || (Number.isFinite(settings.targetKB) && settings.targetKB >= 5)
const isSettingsValid = (settings) => schema.safeParse(settings).success && isTargetValid(settings)

/** Settings → compressImage job. */
const toJob = (settings) => ({
  quality: settings.quality,
  format: settings.format,
  scale: settings.scale,
  maxDimension: settings.limitDimensions ? settings.maxDimension : null,
  targetKB: settings.mode === 'size' ? settings.targetKB : null,
})

/** Compression controls for one settings object (single file, shared batch settings or one customized file). */
function CompressSettings({ settings, updateSettings, file, meta }) {
  const { t } = useTranslation()
  const { errors } = useValidation(schema, settings)
  const targetValid = isTargetValid(settings)
  const outputFormat = settings.format === 'original' ? meta?.format : settings.format
  const sizeSupported = !outputFormat || TARGET_SIZE_FORMATS.includes(outputFormat)
  return (
    <>
      <SettingsSection title={t('settings.compression')}>
        <SegmentedControl
          label={t('compress.mode')}
          value={settings.mode}
          onChange={(mode) => updateSettings({ mode })}
          options={[
            { value: 'quality', label: t('compress.modes.quality') },
            { value: 'size', label: t('compress.modes.size') },
          ]}
        />
        {settings.mode === 'quality' ? (
          <QualityControl quality={settings.quality} onChange={(quality) => updateSettings({ quality })} error={errors.quality} />
        ) : (
          <>
            <NumberInput label={t('compress.targetSize')} value={settings.targetKB} min={5} step={10} suffix="KB" onChange={(targetKB) => updateSettings({ targetKB })} error={targetValid ? undefined : 'validation.targetSize'} />
            <div className="flex flex-wrap gap-1.5">
              {SIZE_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.targetKB === value}
                  onClick={() => updateSettings({ targetKB: value })}
                  className="tabular rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-2 outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-fg"
                >
                  {value >= 1000 ? `${value / 1000} MB` : `${value} KB`}
                </button>
              ))}
            </div>
            <p className={sizeSupported ? '-mt-1 text-xs text-muted' : '-mt-1 text-xs font-medium text-warning'}>
              {file ? t(sizeSupported ? 'compress.targetHint' : 'compress.targetUnsupported', { size: formatBytes(file.size) }) : t('compress.targetHintShared')}
            </p>
          </>
        )}
        <FormatSelect value={settings.format} onChange={(format) => updateSettings({ format })} formats={COMPRESSIBLE_FORMATS} sourceFormat={meta?.format} />
      </SettingsSection>
      <Accordion title={t('settings.resizeOptions')} className="-mb-2" defaultOpen={settings.scale !== 100 || settings.limitDimensions}>
        <OutputSizeOptions settings={settings} updateSettings={updateSettings} meta={meta} error={errors.maxDimension} />
      </Accordion>
    </>
  )
}

export default function CompressImagePage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        actionLabel={t('tools.image-compress.action')}
        actionIcon={Minimize2}
        processingTitle={t('processing.compressingImage')}
        successMessage="toasts.imageCompressed"
        canProcess={isSettingsValid(settings)}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={({ file, meta }) => <CompressSettings settings={settings} updateSettings={updateSettings} file={file} meta={meta} />}
        onProcess={({ file, signal, onProgress }) => compressImage(file, toJob(settings), { signal, onProgress })}
        batch={{
          settings,
          updateSettings,
          renderSettings: (context) => <CompressSettings {...context} />,
          process: ({ file, settings: itemSettings, signal, onProgress }) => compressImage(file, toJob(itemSettings), { signal, onProgress }),
          outputName: (file, result) => imageOutputName(file, result, 'compressed'),
          canProcess: isSettingsValid,
        }}
        renderResult={({ result, ...context }) => (
          <ImageResult
            {...context}
            result={result}
            title={t(result.unchanged ? 'result.alreadyOptimized' : 'result.compressionComplete')}
            suffix="compressed"
            notice={
              result.unchanged ? (
                <p className="rounded-md bg-surface-2 px-3 py-2.5 text-[13px] text-text-2">{t('result.alreadyOptimizedHint')}</p>
              ) : result.usedQuality ? (
                <p className={result.targetMissed ? 'rounded-md bg-warning-soft px-3 py-2.5 text-[13px] text-text-2' : 'rounded-md bg-surface-2 px-3 py-2.5 text-[13px] text-text-2'}>
                  {t(result.targetMissed ? 'compress.targetMissed' : 'compress.targetHit', { quality: result.usedQuality })}
                </p>
              ) : null
            }
          />
        )}
      />
    </ToolLayout>
  )
}
