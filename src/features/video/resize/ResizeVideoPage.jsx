import { Lock, LockOpen, Scaling } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { VIDEO_RESOLUTIONS } from '@/constants/presets'
import { formatDimensions } from '@/lib/format'
import { useValidation } from '@/hooks/useValidation'
import { even } from '@/services/video/encodingArgs'
import { resizeVideo } from '@/services/video/videoTransformService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { IconButton } from '@/components/ui/IconButton'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { dimensionSchema } from '@/features/image/shared/schemas'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-resize'
const DEFAULTS = { resolution: '720', width: null, height: null, lockAspect: true, fit: 'pad', padColor: '#000000' }
const schema = z.object({ width: dimensionSchema('width'), height: dimensionSchema('height') })

/** Target size from a preset height (keeps aspect) or custom width/height. */
function resolveSize(settings, meta) {
  if (!meta?.width) return { width: NaN, height: NaN }
  if (settings.resolution !== 'custom') {
    const preset = VIDEO_RESOLUTIONS.find((item) => item.id === settings.resolution)
    const height = preset?.height ?? meta.height
    return { width: even((meta.width * height) / meta.height), height: even(height) }
  }
  return { width: settings.width ?? meta.width, height: settings.height ?? meta.height }
}

function ResizeVideoSettings({ file, meta, settings, updateSettings }) {
  const { t } = useTranslation()
  const size = resolveSize(settings, meta)
  const { errors } = useValidation(schema, size)
  const ratio = meta.width / meta.height

  const setDimension = (key, value) => {
    const next = { resolution: 'custom', width: size.width, height: size.height, [key]: value }
    if (settings.lockAspect && Number.isFinite(value) && value > 0) {
      if (key === 'width') next.height = Math.round(value / ratio)
      else next.width = Math.round(value * ratio)
    }
    updateSettings(next)
  }

  return (
    <>
      <VideoInfo file={file} meta={meta} />
      <SettingsSection title={t('video.resolution')}>
        <Select
          label={t('settings.preset')}
          value={settings.resolution}
          onChange={(resolution) => updateSettings({ resolution })}
          options={[
            ...VIDEO_RESOLUTIONS.filter((item) => item.height).map((item) => ({ value: item.id, label: item.label, meta: meta.width ? formatDimensions(even((meta.width * item.height) / meta.height), item.height) : undefined })),
            { value: 'custom', label: t('presets.resize.custom') },
          ]}
        />
        <div className="flex items-start gap-2">
          <NumberInput label={t('settings.width')} value={size.width} min={2} onChange={(value) => setDimension('width', value)} suffix="px" stepper={false} error={errors.width} className="flex-1" />
          <IconButton
            icon={settings.lockAspect ? Lock : LockOpen}
            label={t(settings.lockAspect ? 'settings.unlockAspect' : 'settings.lockAspect')}
            active={settings.lockAspect}
            aria-pressed={settings.lockAspect}
            onClick={() => updateSettings({ lockAspect: !settings.lockAspect })}
            className="mt-[26px]"
          />
          <NumberInput label={t('settings.height')} value={size.height} min={2} onChange={(value) => setDimension('height', value)} suffix="px" stepper={false} error={errors.height} className="flex-1" />
        </div>
        <p className="text-xs text-muted">{t('video.evenDimensionsHint')}</p>
        {Math.abs(size.width / size.height - ratio) > 0.01 && (
          <>
            <SegmentedControl
              label={t('merge.fit')}
              value={settings.fit}
              onChange={(fit) => updateSettings({ fit })}
              options={['pad', 'crop', 'stretch'].map((value) => ({ value, label: t(`resizeVideo.fits.${value}`) }))}
            />
            {settings.fit === 'pad' && <ColorInput label={t('merge.barColor')} value={settings.padColor} onChange={(padColor) => updateSettings({ padColor })} />}
          </>
        )}
        {size.height > meta.height && <p className="text-xs text-warning">{t('video.upscaleWarning')}</p>}
      </SettingsSection>
    </>
  )
}

export default function ResizeVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        onFileChange={() => settings.resolution === 'custom' && updateSettings({ width: null, height: null })}
        actionLabel={t('tools.video-resize.action')}
        actionIcon={Scaling}
        processingTitle={t('processing.resizingVideo')}
        successMessage="toasts.videoResized"
        canProcess={({ meta }) => schema.safeParse(resolveSize(settings, meta)).success}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => <ResizeVideoSettings file={file} meta={meta} settings={settings} updateSettings={updateSettings} />}
        onProcess={({ file, meta, signal, onProgress }) => resizeVideo(file, { ...resolveSize(settings, meta), fit: settings.fit, padColor: settings.padColor }, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.resizeComplete')} suffix="resized" />}
      />
    </ToolLayout>
  )
}
