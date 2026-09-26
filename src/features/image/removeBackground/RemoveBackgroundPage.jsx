import { useEffect, useState } from 'react'
import { Eraser, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { getImageFormat } from '@/constants/imageFormats'
import { buildOutputName } from '@/lib/files'
import { notify } from '@/lib/notify'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { composeBackground, removeBackgroundService } from '@/services/backgroundRemoval'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { BeforeAfterSlider } from '@/components/media/BeforeAfterSlider'
import { FileCard } from '@/components/media/FileCard'
import { FileUploader } from '@/components/media/FileUploader'
import { ImagePreview } from '@/components/media/Previews'
import { ResultView } from '@/components/media/ResultView'

const TOOL_ID = 'image-remove-bg'
const DEFAULTS = { mode: 'transparent', color: '#FFFFFF', format: 'png' }

function BackgroundControls({ settings, updateSettings, backgroundFile, onBackgroundFile }) {
  const { t } = useTranslation()
  return (
    <SettingsSection title={t('removeBg.background')}>
      <SegmentedControl
        value={settings.mode}
        onChange={(mode) => updateSettings({ mode })}
        options={['transparent', 'color', 'image'].map((mode) => ({ value: mode, label: t(`removeBg.modes.${mode}`) }))}
      />
      {settings.mode === 'color' && <ColorInput label={t('removeBg.color')} value={settings.color} onChange={(color) => updateSettings({ color })} />}
      {settings.mode === 'image' &&
        (backgroundFile ? (
          <FileCard file={backgroundFile} onRemove={() => onBackgroundFile(null)} />
        ) : (
          <FileUploader profile={UPLOAD_PROFILES.image} onFiles={([next]) => onBackgroundFile(next)} variant="compact" title={t('removeBg.dropBackground')} pasteEnabled={false} />
        ))}
      <Select
        label={t('settings.outputFormat')}
        value={settings.format}
        onChange={(format) => updateSettings({ format })}
        options={['png', 'webp', 'jpeg'].map((id) => ({
          value: id,
          label: getImageFormat(id).label,
          disabled: id === 'jpeg' && settings.mode === 'transparent',
          description: id === 'jpeg' && settings.mode === 'transparent' ? t('removeBg.jpegNoTransparency') : undefined,
        }))}
      />
    </SettingsSection>
  )
}

/** Result lets users swap backgrounds instantly — the cut-out is reused, not recomputed. */
function BackgroundResult({ file, result, reset, startOver, settings, updateSettings, backgroundFile, onBackgroundFile }) {
  const { t } = useTranslation()
  const [composed, setComposed] = useState(result)
  const [isComposing, setIsComposing] = useState(false)
  const originalUrl = useObjectUrl(file)
  const composedUrl = useObjectUrl(composed.blob)

  useEffect(() => {
    let cancelled = false
    setIsComposing(true)
    composeBackground(result.cutout, { mode: settings.mode, color: settings.color, imageFile: backgroundFile, format: settings.format })
      .then((next) => !cancelled && setComposed(next))
      .catch((error) => notify.error(error))
      .finally(() => !cancelled && setIsComposing(false))
    return () => {
      cancelled = true
    }
  }, [backgroundFile, result.cutout, settings.color, settings.format, settings.mode])

  const format = getImageFormat(composed.format)
  return (
    <ResultView
      title={t('result.backgroundRemoved')}
      onAdjust={reset}
      onProcessAnother={startOver}
      preview={
        <div className="flex flex-col gap-4">
          <div className="relative">
            {originalUrl && composedUrl && (
              <BeforeAfterSlider beforeSrc={originalUrl} afterSrc={composedUrl} beforeLabel={t('result.original')} afterLabel={t('result.result')} className="border border-border" />
            )}
            {isComposing && (
              <div className="absolute end-3 bottom-3 rounded-md bg-surface/90 p-1.5 shadow-sm">
                <Spinner size={14} />
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <BackgroundControls settings={settings} updateSettings={updateSettings} backgroundFile={backgroundFile} onBackgroundFile={onBackgroundFile} />
          </div>
        </div>
      }
      exportProps={{
        blob: composed.blob,
        fileName: buildOutputName(file.name, 'no-bg', format.ext),
        extension: format.ext,
        formatLabel: format.label,
        width: composed.width,
        height: composed.height,
      }}
    />
  )
}

export default function RemoveBackgroundPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [backgroundFile, setBackgroundFile] = useState(null)
  const effectiveSettings = settings.mode === 'transparent' && settings.format === 'jpeg' ? { ...settings, format: 'png' } : settings

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        actionLabel={t('tools.image-remove-bg.action')}
        actionIcon={Eraser}
        processingTitle={t('processing.removingBackground')}
        successMessage="toasts.backgroundRemoved"
        canProcess={settings.mode !== 'image' || Boolean(backgroundFile)}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={() => (
          <>
            <BackgroundControls settings={effectiveSettings} updateSettings={updateSettings} backgroundFile={backgroundFile} onBackgroundFile={setBackgroundFile} />
            <p className="flex gap-2 text-xs leading-relaxed text-muted">
              <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
              {t('removeBg.modelNote')}
            </p>
          </>
        )}
        onProcess={async ({ file, signal, onProgress }) => {
          const cutout = await removeBackgroundService(file, { signal, onProgress })
          onProgress(0.97, 'finalizing')
          const composed = await composeBackground(cutout, { mode: effectiveSettings.mode, color: settings.color, imageFile: backgroundFile, format: effectiveSettings.format })
          return { ...composed, cutout }
        }}
        renderResult={(context) => (
          <BackgroundResult {...context} settings={effectiveSettings} updateSettings={updateSettings} backgroundFile={backgroundFile} onBackgroundFile={setBackgroundFile} />
        )}
      />
    </ToolLayout>
  )
}

