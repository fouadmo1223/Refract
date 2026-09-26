import { useEffect, useState } from 'react'
import { FileImage, ImageIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getImageFormatFromFile, getImageFormat } from '@/constants/imageFormats'
import { normalizeError } from '@/lib/errors'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { base64ToImageBlob } from '@/services/image/imageBase64Service'
import { convertImage } from '@/services/image/imageConversionService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useRecentJobsStore } from '@/store/recentJobsStore'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Textarea } from '@/components/ui/Textarea'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { ExportPanel } from '@/components/media/ExportPanel'
import { EmptyState } from '@/components/feedback/States'

const TOOL_ID = 'base64-to-image'

export default function Base64ToImagePage() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [error, setError] = useState(null)
  const [decoded, setDecoded] = useState(null)
  const addJob = useRecentJobsStore((state) => state.addJob)
  const previewUrl = useObjectUrl(decoded?.blob)
  const [saveAs, setSaveAs] = useState('original')
  const [quality, setQuality] = useState(90)
  const [converted, setConverted] = useState(null)

  // Re-encode the decoded image when a different download format is chosen.
  useEffect(() => {
    if (!decoded || saveAs === 'original' || decoded.blob.type === 'image/svg+xml') {
      setConverted(null)
      return undefined
    }
    let cancelled = false
    convertImage(decoded.blob, { format: saveAs, quality, background: '#FFFFFF' })
      .then((result) => !cancelled && setConverted(result))
      .catch(() => !cancelled && setConverted(null))
    return () => {
      cancelled = true
    }
  }, [decoded, quality, saveAs])

  const handleDecode = async () => {
    try {
      const blob = base64ToImageBlob(input)
      const isSvg = blob.type === 'image/svg+xml'
      const info = isSvg ? { width: null, height: null } : await readImageInfo(blob)
      setDecoded({ blob, ...info })
      setError(null)
      addJob({ toolId: TOOL_ID, fileName: t('base64.decodedImage'), status: 'completed' })
    } catch (caught) {
      setDecoded(null)
      const normalized = normalizeError(caught)
      setError(normalized.code === 'FILE_TOO_LARGE' ? 'validation.base64TooLarge' : 'validation.base64Invalid')
    }
  }

  const formatId = converted ? converted.format : decoded ? getImageFormatFromFile({ type: decoded.blob.type, name: '' }) : null
  const extension = !converted && decoded?.blob.type === 'image/svg+xml' ? 'svg' : formatId ? getImageFormat(formatId).ext : 'png'
  const exportBlob = converted?.blob ?? decoded?.blob

  return (
    <ToolLayout toolId={TOOL_ID}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <Textarea
              label={t('base64.inputLabel')}
              description={t('base64.inputHint')}
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                if (error) setError(null)
              }}
              error={error}
              placeholder="data:image/png;base64,iVBORw0KGgo…"
              textareaClassName="min-h-48 font-mono text-xs"
              spellCheck={false}
              dir="ltr"
            />
            <Button variant="primary" leftIcon={FileImage} onClick={handleDecode} disabled={!input.trim()} className="mt-3">
              {t('tools.base64-to-image.action')}
            </Button>
          </div>
          {decoded && previewUrl ? (
            <MediaStage checkerboard>
              <img src={previewUrl} alt={t('base64.decodedImage')} className="max-h-[50vh] max-w-full object-contain" />
            </MediaStage>
          ) : (
            <MediaStage>
              <EmptyState icon={ImageIcon} title={t('base64.emptyTitle')} description={t('base64.emptyDescription')} />
            </MediaStage>
          )}
        </div>
        {decoded ? (
          <div className="flex flex-col gap-4">
          {decoded.blob.type !== 'image/svg+xml' && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <SettingsSection title={t('base64.saveAs')}>
                <SegmentedControl
                  value={saveAs}
                  onChange={setSaveAs}
                  options={['original', 'png', 'jpeg', 'webp'].map((value) => ({ value, label: value === 'original' ? t('settings.keepOriginal') : value === 'jpeg' ? 'JPG' : value === 'webp' ? 'WebP' : 'PNG' }))}
                />
                {['jpeg', 'webp'].includes(saveAs) && <Slider label={t('settings.quality')} value={quality} min={10} max={100} onChange={setQuality} formatValue={(value) => `${value}%`} />}
              </SettingsSection>
            </div>
          )}
          <ExportPanel
            blob={exportBlob}
            fileName={`decoded-image.${extension}`}
            extension={extension}
            width={decoded.width}
            height={decoded.height}
            onProcessAnother={() => {
              setDecoded(null)
              setInput('')
            }}
          />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-[13px] text-muted">{t('base64.exportPlaceholder')}</div>
        )}
      </div>
    </ToolLayout>
  )
}
