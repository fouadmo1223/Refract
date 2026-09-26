import { useMemo, useState } from 'react'
import { Binary, Copy, Download, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { copyToClipboard, downloadBlob } from '@/lib/download'
import { getBaseName } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { notify } from '@/lib/notify'
import { fileToDataUrl } from '@/services/image/imageBase64Service'
import { convertImage } from '@/services/image/imageConversionService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { ResultStats } from '@/components/media/ResultStats'
import { OutputSizeOptions } from '../shared/OutputSizeOptions'

const TOOL_ID = 'image-to-base64'
const PREVIEW_CHARS = 4000
const OUTPUT_FORMATS = ['dataUri', 'raw', 'css', 'html', 'markdown', 'json']
const DEFAULTS = { format: 'original', quality: 85, scale: 100, limitDimensions: false, maxDimension: 1024 }
const ENCODE_FORMATS = ['original', 'webp', 'jpeg', 'png']

function buildOutput(dataUrl, format) {
  switch (format) {
    case 'raw':
      return dataUrl.slice(dataUrl.indexOf(',') + 1)
    case 'css':
      return `background-image: url("${dataUrl}");`
    case 'html':
      return `<img src="${dataUrl}" alt="" />`
    case 'markdown':
      return `![image](${dataUrl})`
    case 'json':
      return JSON.stringify({ image: dataUrl })
    default:
      return dataUrl
  }
}

function Base64Result({ file, result, startOver }) {
  const { t } = useTranslation()
  const [format, setFormat] = useState('dataUri')
  const [wrap, setWrap] = useState(false)
  const output = useMemo(() => {
    const text = buildOutput(result.dataUrl, format)
    // Line-wrap raw Base64 at 76 characters (MIME style) when asked.
    return wrap && format === 'raw' ? text.replace(/(.{76})/g, '$1\n') : text
  }, [format, result.dataUrl, wrap])
  const truncated = output.length > PREVIEW_CHARS

  const handleCopy = async () => {
    await copyToClipboard(output)
    notify.success('toasts.copied')
  }

  return (
    <div className="flex flex-col gap-4">
      <ResultStats
        stats={[
          { label: t('result.before'), value: formatBytes(file.size) },
          { label: t('base64.encodedSize'), value: formatBytes(output.length) },
          { label: t('base64.characters'), value: output.length.toLocaleString() },
        ]}
      />
      <div className="rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <SegmentedControl size="sm" fullWidth={false} wrap value={format} onChange={setFormat} options={OUTPUT_FORMATS.map((id) => ({ value: id, label: t(`base64.formats.${id}`) }))} />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" leftIcon={Copy} onClick={handleCopy}>
              {t('common.copy')}
            </Button>
            <Button variant="secondary" size="sm" leftIcon={Download} onClick={() => downloadBlob(new Blob([output], { type: 'text/plain' }), `${getBaseName(file.name)}-base64.txt`)}>
              {t('base64.downloadTxt')}
            </Button>
          </div>
        </div>
        <pre className="scrollbar-thin max-h-80 overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-xs leading-relaxed text-text-2" dir="ltr">
          {truncated ? `${output.slice(0, PREVIEW_CHARS)}…` : output}
        </pre>
        {truncated && <p className="border-t border-border px-3 py-2 text-xs text-muted">{t('base64.truncated', { count: PREVIEW_CHARS })}</p>}
        {format === 'raw' && (
          <div className="border-t border-border px-3 py-2">
            <Switch size="sm" label={t('base64.wrapLines')} checked={wrap} onChange={setWrap} />
          </div>
        )}
      </div>
      <Button variant="ghost" leftIcon={RotateCcw} onClick={startOver} className="self-start">
        {t('common.processAnother')}
      </Button>
    </div>
  )
}

export default function ImageToBase64Page() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const reencode = settings.format !== 'original' || settings.scale !== 100 || settings.limitDimensions
  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={{ ...UPLOAD_PROFILES.image, maxSize: 10 * 1024 * 1024 }}
        loadMeta={readImageInfo}
        actionLabel={t('tools.image-to-base64.action')}
        actionIcon={Binary}
        processingTitle={t('processing.encoding')}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={({ meta }) => (
          <>
            <SettingsSection title={t('base64.about')}>
              <p className="text-[13px] leading-relaxed text-text-2">{t('base64.aboutDescription')}</p>
            </SettingsSection>
            <SettingsSection title={t('base64.optimize')} description={t('base64.optimizeHint')}>
              <SegmentedControl
                label={t('settings.outputFormat')}
                value={settings.format}
                onChange={(format) => updateSettings({ format })}
                options={ENCODE_FORMATS.map((value) => ({ value, label: value === 'original' ? t('settings.keepOriginal') : value === 'jpeg' ? 'JPG' : value === 'webp' ? 'WebP' : 'PNG' }))}
              />
              {['webp', 'jpeg'].includes(settings.format) && (
                <Slider label={t('settings.quality')} value={settings.quality} min={10} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />
              )}
              <OutputSizeOptions settings={settings} updateSettings={updateSettings} meta={meta} />
            </SettingsSection>
          </>
        )}
        onProcess={async ({ file, signal, onProgress }) => {
          if (!reencode) return { dataUrl: await fileToDataUrl(file) }
          const converted = await convertImage(
            file,
            { format: settings.format === 'original' ? 'original' : settings.format, quality: settings.quality, scale: settings.scale, maxDimension: settings.limitDimensions ? settings.maxDimension : null, background: '#FFFFFF' },
            { signal, onProgress },
          )
          return { dataUrl: await fileToDataUrl(converted.blob) }
        }}
        renderResult={(context) => <Base64Result {...context} />}
      />
    </ToolLayout>
  )
}
