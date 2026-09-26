import { useMemo, useState } from 'react'
import { Binary, Copy, Download, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { copyToClipboard, downloadBlob } from '@/lib/download'
import { getBaseName } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { notify } from '@/lib/notify'
import { fileToDataUrl } from '@/services/image/imageBase64Service'
import { readImageInfo } from '@/services/image/imageInfoService'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { ResultStats } from '@/components/media/ResultStats'

const TOOL_ID = 'image-to-base64'
const PREVIEW_CHARS = 4000
const OUTPUT_FORMATS = ['dataUri', 'raw', 'css', 'html']

function buildOutput(dataUrl, format) {
  switch (format) {
    case 'raw':
      return dataUrl.slice(dataUrl.indexOf(',') + 1)
    case 'css':
      return `background-image: url("${dataUrl}");`
    case 'html':
      return `<img src="${dataUrl}" alt="" />`
    default:
      return dataUrl
  }
}

function Base64Result({ file, result, startOver }) {
  const { t } = useTranslation()
  const [format, setFormat] = useState('dataUri')
  const output = useMemo(() => buildOutput(result.dataUrl, format), [format, result.dataUrl])
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
          <SegmentedControl size="sm" fullWidth={false} value={format} onChange={setFormat} options={OUTPUT_FORMATS.map((id) => ({ value: id, label: t(`base64.formats.${id}`) }))} />
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
      </div>
      <Button variant="ghost" leftIcon={RotateCcw} onClick={startOver} className="self-start">
        {t('common.processAnother')}
      </Button>
    </div>
  )
}

export default function ImageToBase64Page() {
  const { t } = useTranslation()
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
        renderSettings={() => (
          <SettingsSection title={t('base64.about')}>
            <p className="text-[13px] leading-relaxed text-text-2">{t('base64.aboutDescription')}</p>
          </SettingsSection>
        )}
        onProcess={async ({ file }) => ({ dataUrl: await fileToDataUrl(file) })}
        renderResult={(context) => <Base64Result {...context} />}
      />
    </ToolLayout>
  )
}
