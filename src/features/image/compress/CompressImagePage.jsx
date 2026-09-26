import { Minimize2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { COMPRESSIBLE_FORMATS } from '@/constants/imageFormats'
import { useValidation } from '@/hooks/useValidation'
import { compressImage } from '@/services/image/imageCompressionService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Accordion } from '@/components/ui/Accordion'
import { NumberInput } from '@/components/ui/NumberInput'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { ImageResult } from '../shared/ImageResult'
import { FormatSelect } from '../shared/FormatSelect'
import { QualityControl } from '../shared/QualityControl'
import { dimensionSchema, qualitySchema, refineWhen } from '../shared/schemas'

const TOOL_ID = 'image-compress'
const DEFAULTS = { quality: 75, format: 'original', limitDimensions: false, maxDimension: 2560 }

const schema = z.object({ quality: qualitySchema }).passthrough().superRefine(refineWhen('limitDimensions', 'maxDimension', dimensionSchema('dimension')))

export default function CompressImagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const { errors, isValid } = useValidation(schema, settings)

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
        canProcess={isValid}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={({ meta }) => (
          <>
            <SettingsSection title={t('settings.compression')}>
              <QualityControl quality={settings.quality} onChange={(quality) => updateSettings({ quality })} error={errors.quality} />
              <FormatSelect value={settings.format} onChange={(format) => updateSettings({ format })} formats={COMPRESSIBLE_FORMATS} sourceFormat={meta?.format} />
            </SettingsSection>
            <Accordion title={t('settings.advanced')} className="-mb-2">
              <Switch
                label={t('settings.limitDimensions')}
                description={t('settings.limitDimensionsHint')}
                checked={settings.limitDimensions}
                onChange={(limitDimensions) => updateSettings({ limitDimensions })}
              />
              {settings.limitDimensions && (
                <NumberInput
                  label={t('settings.maxDimension')}
                  value={settings.maxDimension}
                  onChange={(maxDimension) => updateSettings({ maxDimension })}
                  min={16}
                  step={64}
                  suffix="px"
                  error={errors.maxDimension}
                />
              )}
            </Accordion>
          </>
        )}
        onProcess={({ file, signal, onProgress }) =>
          compressImage(file, { quality: settings.quality, format: settings.format, maxDimension: settings.limitDimensions ? settings.maxDimension : null }, { signal, onProgress })
        }
        renderResult={({ result, ...context }) => (
          <ImageResult
            {...context}
            result={result}
            title={t(result.unchanged ? 'result.alreadyOptimized' : 'result.compressionComplete')}
            suffix="compressed"
            notice={
              result.unchanged ? <p className="rounded-md bg-surface-2 px-3 py-2.5 text-[13px] text-text-2">{t('result.alreadyOptimizedHint')}</p> : null
            }
          />
        )}
      />
    </ToolLayout>
  )
}
