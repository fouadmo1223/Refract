import { FileCode2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { formatDimensions } from '@/lib/format'
import { useValidation } from '@/hooks/useValidation'
import { rasterizeSvg, readSvgSize } from '@/services/image/svgService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { ImageResult } from '../shared/ImageResult'
import { dimensionSchema } from '../shared/schemas'

const TOOL_ID = 'svg-to-png'
const DEFAULTS = { scale: 2, width: null, format: 'png', withBackground: false, background: '#FFFFFF' }
const schema = z.object({ width: dimensionSchema('width') })

async function loadSvgMeta(file) {
  const { width, height } = await readSvgSize(file)
  return { width: Math.round(width), height: Math.round(height) }
}

export default function SvgToPngPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const resolveWidth = (meta) => settings.width ?? Math.round(meta.width * settings.scale)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.svg}
        loadMeta={loadSvgMeta}
        onFileChange={() => updateSettings({ width: null })}
        actionLabel={t('tools.svg-to-png.action')}
        actionIcon={FileCode2}
        processingTitle={t('processing.rasterizing')}
        successMessage="toasts.imageConverted"
        canProcess={({ meta }) => schema.safeParse({ width: resolveWidth(meta) }).success}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={({ meta }) => <SvgSettings meta={meta} settings={settings} updateSettings={updateSettings} width={resolveWidth(meta)} />}
        onProcess={({ file, meta, onProgress }) =>
          rasterizeSvg(file, { width: resolveWidth(meta), format: settings.format, background: settings.withBackground || settings.format === 'jpeg' ? settings.background : null }, { onProgress })
        }
        renderResult={(context) => <ImageResult {...context} title={t('result.conversionComplete')} suffix="" compare={false} />}
      />
    </ToolLayout>
  )
}

function SvgSettings({ meta, settings, updateSettings, width }) {
  const { t } = useTranslation()
  const { errors } = useValidation(schema, { width })
  const height = Math.round((meta.height / meta.width) * (width || 0))
  return (
    <>
      <SettingsSection title={t('settings.size')}>
        <SegmentedControl
          label={t('settings.scale')}
          value={settings.width == null ? settings.scale : null}
          onChange={(scale) => updateSettings({ scale, width: null })}
          options={[1, 2, 4, 8].map((scale) => ({ value: scale, label: `${scale}×` }))}
        />
        <NumberInput label={t('settings.width')} value={width} onChange={(value) => updateSettings({ width: value })} min={1} suffix="px" error={errors.width} stepper={false} />
        <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
          {t('settings.outputSize')}: <span className="font-semibold text-text">{formatDimensions(width, height)}</span>
        </p>
      </SettingsSection>
      <SettingsSection title={t('settings.output')}>
        <SegmentedControl
          value={settings.format}
          onChange={(format) => updateSettings({ format })}
          options={[
            { value: 'png', label: 'PNG' },
            { value: 'webp', label: 'WebP' },
            { value: 'jpeg', label: 'JPG' },
          ]}
        />
        {settings.format !== 'jpeg' && <Switch label={t('settings.addBackground')} checked={settings.withBackground} onChange={(withBackground) => updateSettings({ withBackground })} />}
        {(settings.withBackground || settings.format === 'jpeg') && <ColorInput label={t('settings.backgroundColor')} value={settings.background} onChange={(background) => updateSettings({ background })} />}
      </SettingsSection>
    </>
  )
}
