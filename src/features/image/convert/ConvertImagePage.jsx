import { Repeat2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { CONVERTIBLE_FORMATS, getImageFormat } from '@/constants/imageFormats'
import { useValidation } from '@/hooks/useValidation'
import { convertImage } from '@/services/image/imageConversionService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { ImageResult } from '../shared/ImageResult'
import { FormatSelect } from '../shared/FormatSelect'
import { qualitySchema } from '../shared/schemas'

const TOOL_ID = 'image-convert'
const DEFAULTS = { format: 'webp', quality: 90, background: '#FFFFFF' }
const schema = z.object({ quality: qualitySchema }).passthrough()

export default function ConvertImagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const { errors, isValid } = useValidation(schema, settings)
  const target = getImageFormat(settings.format)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        actionLabel={t('tools.image-convert.actionTo', { format: target.label })}
        actionIcon={Repeat2}
        processingTitle={t('processing.convertingImage')}
        successMessage="toasts.imageConverted"
        canProcess={isValid}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={({ meta }) => (
          <SettingsSection title={t('settings.conversion')}>
            <div className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-[13px]">
              <span className="font-medium text-text">{meta?.format ? getImageFormat(meta.format).label : '—'}</span>
              <span className="text-muted rtl:-scale-x-100" aria-hidden="true">→</span>
              <span className="font-medium text-primary">{target.label}</span>
            </div>
            <FormatSelect
              label={t('settings.targetFormat')}
              value={settings.format}
              onChange={(format) => updateSettings({ format })}
              formats={CONVERTIBLE_FORMATS}
              includeOriginal={false}
            />
            {target.lossy && settings.format !== 'png' && (
              <Slider label={t('settings.quality')} value={settings.quality} min={1} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />
            )}
            {errors.quality && <p className="text-xs text-danger">{t(errors.quality)}</p>}
            {!target.alpha && (
              <ColorInput label={t('settings.transparentFill')} value={settings.background} onChange={(background) => updateSettings({ background })} />
            )}
            {settings.format === 'gif' && <p className="text-xs text-muted">{t('settings.gifNote')}</p>}
          </SettingsSection>
        )}
        onProcess={({ file, signal, onProgress }) =>
          convertImage(file, { format: settings.format, quality: settings.format === 'png' ? 100 : settings.quality, background: settings.background }, { signal, onProgress })
        }
        renderResult={(context) => <ImageResult {...context} title={t('result.conversionComplete')} suffix="" />}
      />
    </ToolLayout>
  )
}
