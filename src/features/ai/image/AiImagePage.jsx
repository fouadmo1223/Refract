import { useCallback, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ERROR_CODES } from '@/lib/errors'
import { useProcessingJob } from '@/hooks/useProcessingJob'
import { generateImages, getAiProvider } from '@/services/ai'
import { useAiKeysStore } from '@/store/aiKeysStore'
import { useToolSettings } from '@/store/toolSettingsStore'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsPanel, SettingsSection } from '@/components/layout/Panels'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ProcessingState } from '@/components/media/ProcessingState'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { GeneratedCard } from '../shared/GeneratedCard'
import { PromptBox } from '../shared/PromptBox'
import { ProviderSettings } from '../shared/ProviderSettings'
import { IMAGE_FOLLOW_UP_TOOLS } from '../shared/aiHandoff'

const TOOL_ID = 'ai-image'
const DEFAULTS = { providerId: 'pollinations', model: null, aspect: '1:1', count: 1, fixedSeed: false, seed: 42, negativePrompt: '' }
const EXAMPLES = [
  'A cozy reading nook by a rainy window, warm lamp light, film photography',
  'Minimal product shot of a ceramic coffee cup on travertine, soft shadows',
  'Isometric illustration of a tiny futuristic city on a floating island',
]

export default function AiImagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [prompt, setPrompt] = useState('')
  const [promptError, setPromptError] = useState(null)
  const [gallery, setGallery] = useState([])
  const apiKey = useAiKeysStore((state) => state.keys[settings.providerId] ?? '')
  const job = useProcessingJob({ toolId: TOOL_ID, successMessage: 'toasts.imagesGenerated' })
  const provider = getAiProvider(settings.providerId)
  const model = settings.model ?? provider.defaultModels.image

  const handleGenerate = async () => {
    if (!prompt.trim()) return setPromptError('validation.promptRequired')
    setPromptError(null)
    const results = await job.run(
      ({ signal, onProgress }) =>
        generateImages(
          { providerId: settings.providerId, apiKey, prompt: prompt.trim(), negativePrompt: settings.negativePrompt, model, aspect: settings.aspect, count: settings.count, seed: settings.fixedSeed ? settings.seed : null },
          { signal, onProgress },
        ),
      { fileName: prompt.trim().slice(0, 60), initialStage: 'generatingImage' },
    )
    if (results) setGallery((current) => [...results.map((result) => ({ ...result, id: crypto.randomUUID() })), ...current].slice(0, 24))
  }

  const removeItem = useCallback((id) => setGallery((current) => current.filter((item) => item.id !== id)), [])
  const needsKey = job.error?.code === ERROR_CODES.AI_KEY_REQUIRED || job.error?.code === ERROR_CODES.AI_UNAUTHORIZED

  return (
    <ToolLayout toolId={TOOL_ID}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <PromptBox
            value={prompt}
            onChange={(value) => {
              setPrompt(value)
              if (promptError) setPromptError(null)
            }}
            onSubmit={handleGenerate}
            examples={EXAMPLES}
            loading={job.isProcessing}
            error={promptError}
            placeholder={t('ai.imagePromptPlaceholder')}
            actionLabel={t('tools.ai-image.action', { count: settings.count })}
          />
          {job.isProcessing && (
            <MediaStage>
              <ProcessingState title={t('processing.generatingImages')} progress={settings.count > 1 ? job.progress : null} stage={job.stage} onCancel={job.cancel} />
            </MediaStage>
          )}
          {job.status === 'error' && (
            <MediaStage>
              <ErrorState error={job.error} onRetry={needsKey ? undefined : handleGenerate} compact />
            </MediaStage>
          )}
          {gallery.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {gallery.map((item) => (
                <GeneratedCard key={item.id} item={item} followUpTools={IMAGE_FOLLOW_UP_TOOLS} onRemove={removeItem} />
              ))}
            </div>
          ) : (
            !job.isProcessing && (
              <MediaStage>
                <EmptyState icon={ImagePlus} title={t('ai.galleryEmptyTitle')} description={t('ai.galleryEmptyDescription')} />
              </MediaStage>
            )
          )}
        </div>
        <SettingsPanel>
          <ProviderSettings
            kind="image"
            providerId={settings.providerId}
            onProviderChange={(providerId) => updateSettings({ providerId, model: null })}
            model={model}
            onModelChange={(next) => updateSettings({ model: next })}
          />
          <SettingsSection title={t('settings.output')}>
            <SegmentedControl
              label={t('crop.aspectRatio')}
              value={settings.aspect}
              onChange={(aspect) => updateSettings({ aspect })}
              wrap
              options={['1:1', '16:9', '9:16', '4:3', '3:4'].map((value) => ({ value, label: value }))}
            />
            <SegmentedControl label={t('ai.count')} value={settings.count} onChange={(count) => updateSettings({ count })} options={[1, 2, 3, 4].map((value) => ({ value, label: String(value) }))} />
            <Switch label={t('ai.fixedSeed')} description={t('ai.fixedSeedHint')} checked={settings.fixedSeed} onChange={(fixedSeed) => updateSettings({ fixedSeed })} />
            {settings.fixedSeed && (
              <NumberInput
                label={t('ai.seed')}
                value={settings.seed}
                min={0}
                max={2147483647}
                onChange={(seed) => updateSettings({ seed })}
                error={Number.isInteger(settings.seed) && settings.seed >= 0 ? undefined : 'validation.seedRange'}
              />
            )}
            {settings.providerId === 'huggingface' && (
              <Textarea label={t('ai.negativePrompt')} description={t('ai.negativePromptHint')} value={settings.negativePrompt} onChange={(event) => updateSettings({ negativePrompt: event.target.value })} textareaClassName="min-h-16" dir="auto" />
            )}
          </SettingsSection>
          <PrivacyNote mode="server" detail={t('ai.privacyDetail', { provider: provider.name })} />
        </SettingsPanel>
      </div>
    </ToolLayout>
  )
}
