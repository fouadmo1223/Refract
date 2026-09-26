import { useCallback, useEffect, useState } from 'react'
import { Clapperboard, Film, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { validateFile } from '@/lib/files'
import { notify } from '@/lib/notify'
import { useProcessingJob } from '@/hooks/useProcessingJob'
import { generateVideo, getAiProvider } from '@/services/ai'
import { MOTION_EFFECTS, createMotionVideo } from '@/services/video/motionVideoService'
import { preloadFFmpeg } from '@/services/video/ffmpeg/ffmpegClient'
import { useAiKeysStore } from '@/store/aiKeysStore'
import { usePendingFileStore } from '@/store/pendingFileStore'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Tabs } from '@/components/ui/Tabs'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsPanel, SettingsSection } from '@/components/layout/Panels'
import { FileCard } from '@/components/media/FileCard'
import { FileUploader } from '@/components/media/FileUploader'
import { ImagePreview } from '@/components/media/Previews'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ProcessingState } from '@/components/media/ProcessingState'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { GeneratedCard } from '../shared/GeneratedCard'
import { PromptBox } from '../shared/PromptBox'
import { ProviderSettings } from '../shared/ProviderSettings'
import { VIDEO_FOLLOW_UP_TOOLS } from '../shared/aiHandoff'

const TOOL_ID = 'ai-video'
const DEFAULTS = {
  mode: 'animate',
  effect: 'zoom-in',
  motionDuration: 6,
  motionAspect: '16:9',
  providerId: 'pollinations',
  model: null,
  duration: 5,
  aspect: '16:9',
}
const EXAMPLES = [
  'Slow aerial shot over misty pine forest at sunrise',
  'Close-up of coffee being poured into a glass cup, slow motion',
  'Paper boats floating down a rainy city street, cinematic',
]

function AnimateSettings({ settings, updateSettings }) {
  const { t } = useTranslation()
  return (
    <SettingsSection title={t('ai.motion')}>
      <Select
        label={t('ai.motionEffect')}
        value={settings.effect}
        onChange={(effect) => updateSettings({ effect })}
        options={MOTION_EFFECTS.map((effect) => ({ value: effect, label: t(`ai.effects.${effect}`) }))}
      />
      <Slider label={t('result.duration')} value={settings.motionDuration} min={2} max={15} onChange={(motionDuration) => updateSettings({ motionDuration })} formatValue={(value) => `${value}s`} />
      <SegmentedControl label={t('crop.aspectRatio')} value={settings.motionAspect} onChange={(motionAspect) => updateSettings({ motionAspect })} options={['16:9', '9:16', '1:1', '4:5'].map((value) => ({ value, label: value }))} />
    </SettingsSection>
  )
}

function TextVideoSettings({ settings, updateSettings, model }) {
  const { t } = useTranslation()
  return (
    <>
      <ProviderSettings kind="video" providerId={settings.providerId} onProviderChange={(providerId) => updateSettings({ providerId, model: null })} model={model} onModelChange={(next) => updateSettings({ model: next })} />
      <SettingsSection title={t('settings.output')}>
        <SegmentedControl label={t('result.duration')} value={settings.duration} onChange={(duration) => updateSettings({ duration })} options={[4, 5, 6, 8, 10].map((value) => ({ value, label: `${value}s` }))} />
        <SegmentedControl label={t('crop.aspectRatio')} value={settings.aspect} onChange={(aspect) => updateSettings({ aspect })} options={['16:9', '9:16', '1:1'].map((value) => ({ value, label: value }))} />
        <p className="flex gap-2 text-xs leading-relaxed text-muted">
          <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
          {t('ai.videoCostNote')}
        </p>
      </SettingsSection>
    </>
  )
}

export default function AiVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [sourceImage, setSourceImage] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [promptError, setPromptError] = useState(null)
  const [gallery, setGallery] = useState([])
  const apiKey = useAiKeysStore((state) => state.keys[settings.providerId] ?? '')
  const takePendingFile = usePendingFileStore((state) => state.takePendingFile)
  const job = useProcessingJob({ toolId: TOOL_ID, successMessage: 'toasts.videoGenerated' })
  const provider = getAiProvider(settings.providerId)
  const model = settings.model ?? provider.defaultModels.video
  const isAnimate = settings.mode === 'animate'

  // Accept an image handed over from AI Image (or the home page).
  useEffect(() => {
    const pending = takePendingFile()
    if (!pending) return
    try {
      setSourceImage(validateFile(pending, UPLOAD_PROFILES.image))
      updateSettings({ mode: 'animate' })
      preloadFFmpeg()
    } catch (error) {
      notify.error(error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addResult = (result, label) => setGallery((current) => [{ ...result, id: crypto.randomUUID(), prompt: label, model: result.model }, ...current].slice(0, 12))

  const handleAnimate = async () => {
    if (!sourceImage) return
    const result = await job.run(
      ({ signal, onProgress }) => createMotionVideo(sourceImage, { effect: settings.effect, duration: settings.motionDuration, aspect: settings.motionAspect }, { signal, onProgress }),
      { fileName: sourceImage.name },
    )
    if (result) addResult({ ...result, model: t(`ai.effects.${settings.effect}`) }, sourceImage.name)
  }

  const handleTextToVideo = async () => {
    if (!prompt.trim()) return setPromptError('validation.promptRequired')
    setPromptError(null)
    const result = await job.run(
      ({ signal, onProgress }) => generateVideo({ providerId: settings.providerId, apiKey, prompt: prompt.trim(), model, duration: settings.duration, aspect: settings.aspect }, { signal, onProgress }),
      { fileName: prompt.trim().slice(0, 60), initialStage: 'generatingVideo' },
    )
    if (result) addResult({ ...result, model }, prompt.trim())
  }

  const removeItem = useCallback((id) => setGallery((current) => current.filter((item) => item.id !== id)), [])

  return (
    <ToolLayout toolId={TOOL_ID}>
      <Tabs
        variant="segmented"
        className="mb-5"
        aria-label={t('ai.videoMode')}
        value={settings.mode}
        onChange={(mode) => {
          job.reset()
          updateSettings({ mode })
        }}
        tabs={[
          { value: 'animate', label: t('ai.modes.animate'), icon: Film },
          { value: 'text', label: t('ai.modes.text'), icon: Clapperboard },
        ]}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          {isAnimate ? (
            sourceImage ? (
              <ImagePreview file={sourceImage} imgClassName="max-h-[44vh]" />
            ) : (
              <FileUploader
                profile={UPLOAD_PROFILES.image}
                onFiles={([next]) => {
                  setSourceImage(next)
                  preloadFFmpeg()
                }}
                title={t('ai.dropImageToAnimate')}
              />
            )
          ) : (
            <PromptBox
              value={prompt}
              onChange={(value) => {
                setPrompt(value)
                if (promptError) setPromptError(null)
              }}
              onSubmit={handleTextToVideo}
              examples={EXAMPLES}
              loading={job.isProcessing}
              error={promptError}
              placeholder={t('ai.videoPromptPlaceholder')}
              actionLabel={t('ai.generateVideo')}
            />
          )}
          {job.isProcessing && (
            <MediaStage>
              <ProcessingState title={t(isAnimate ? 'processing.animatingImage' : 'processing.generatingVideo')} progress={job.progress} stage={job.stage} onCancel={job.cancel} longRunning />
            </MediaStage>
          )}
          {job.status === 'error' && (
            <MediaStage>
              <ErrorState error={job.error} onRetry={isAnimate ? handleAnimate : handleTextToVideo} compact />
            </MediaStage>
          )}
          {gallery.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {gallery.map((item) => (
                <GeneratedCard key={item.id} item={item} followUpTools={VIDEO_FOLLOW_UP_TOOLS} onRemove={removeItem} />
              ))}
            </div>
          ) : (
            !job.isProcessing &&
            !isAnimate && (
              <MediaStage>
                <EmptyState icon={Clapperboard} title={t('ai.galleryEmptyTitle')} description={t('ai.videoGalleryEmptyDescription')} />
              </MediaStage>
            )
          )}
        </div>
        <SettingsPanel
          footer={
            isAnimate ? (
              <Button variant="primary" size="lg" fullWidth leftIcon={Film} onClick={handleAnimate} disabled={!sourceImage} loading={job.isProcessing}>
                {t('ai.animateAction')}
              </Button>
            ) : undefined
          }
        >
          {isAnimate && sourceImage && <FileCard file={sourceImage} onRemove={job.isProcessing ? undefined : () => setSourceImage(null)} />}
          {isAnimate ? <AnimateSettings settings={settings} updateSettings={updateSettings} /> : <TextVideoSettings settings={settings} updateSettings={updateSettings} model={model} />}
          {isAnimate ? <PrivacyNote mode="local" detail={t('ai.animateLocalDetail')} /> : <PrivacyNote mode="server" detail={t('ai.privacyDetail', { provider: provider.name })} />}
        </SettingsPanel>
      </div>
    </ToolLayout>
  )
}
