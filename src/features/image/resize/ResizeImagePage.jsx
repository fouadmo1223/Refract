import { useMemo } from 'react'
import { Lock, LockOpen, Scaling } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { RESIZE_MODES, RESIZE_PRESETS } from '@/constants/presets'
import { formatDimensions } from '@/lib/format'
import { useValidation } from '@/hooks/useValidation'
import { readImageInfo } from '@/services/image/imageInfoService'
import { computeResizeGeometry } from '@/services/image/imagePipeline'
import { resizeImage } from '@/services/image/imageResizeService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Checkbox } from '@/components/ui/Checkbox'
import { IconButton } from '@/components/ui/IconButton'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { ImageResult } from '../shared/ImageResult'
import { dimensionSchema } from '../shared/schemas'

const TOOL_ID = 'image-resize'
const DEFAULTS = { preset: 'custom', width: null, height: null, lockAspect: true, mode: 'fit', noUpscale: true }
const schema = z.object({ width: dimensionSchema('width'), height: dimensionSchema('height') }).passthrough()

function ResizeSettings({ settings, updateSettings, meta }) {
  const { t } = useTranslation()
  const { width, height } = resolveDimensions(settings, meta)
  const { errors } = useValidation(schema, { width, height })
  const ratio = meta.width / meta.height

  const handleWidthChange = (value) => {
    const next = { width: value, preset: 'custom' }
    if (settings.lockAspect && Number.isFinite(value) && value > 0) next.height = Math.max(1, Math.round(value / ratio))
    updateSettings(next)
  }
  const handleHeightChange = (value) => {
    const next = { height: value, preset: 'custom' }
    if (settings.lockAspect && Number.isFinite(value) && value > 0) next.width = Math.max(1, Math.round(value * ratio))
    updateSettings(next)
  }
  const handlePresetChange = (presetId) => {
    if (presetId === 'custom') return updateSettings({ preset: 'custom' })
    if (presetId === 'original') return updateSettings({ preset: 'original', width: meta.width, height: meta.height })
    const preset = RESIZE_PRESETS.find((item) => item.id === presetId)
    // Social presets are exact canvases, so default to "fill" (crop to fit).
    updateSettings({ preset: presetId, width: preset.width, height: preset.height, lockAspect: false, mode: 'fill', noUpscale: false })
  }

  const geometry = useMemo(() => {
    try {
      return computeResizeGeometry(meta.width, meta.height, { width, height, mode: settings.mode, noUpscale: settings.noUpscale })
    } catch {
      return null
    }
  }, [height, meta.height, meta.width, settings.mode, settings.noUpscale, width])

  return (
    <>
      <SettingsSection title={t('settings.size')}>
        <Select
          label={t('settings.preset')}
          value={settings.preset}
          onChange={handlePresetChange}
          options={[
            { value: 'custom', label: t('presets.resize.custom') },
            { value: 'original', label: t('presets.resize.original'), meta: formatDimensions(meta.width, meta.height) },
            ...RESIZE_PRESETS.map((preset) => ({ value: preset.id, label: t(`presets.resize.${preset.id}`), meta: `${preset.width}×${preset.height}` })),
          ]}
        />
        <div className="flex items-start gap-2">
          <NumberInput label={t('settings.width')} value={width} onChange={handleWidthChange} min={1} suffix="px" error={errors.width} className="flex-1" stepper={false} />
          <IconButton
            icon={settings.lockAspect ? Lock : LockOpen}
            label={t(settings.lockAspect ? 'settings.unlockAspect' : 'settings.lockAspect')}
            active={settings.lockAspect}
            onClick={() => updateSettings({ lockAspect: !settings.lockAspect })}
            className="mt-[26px]"
            aria-pressed={settings.lockAspect}
          />
          <NumberInput label={t('settings.height')} value={height} onChange={handleHeightChange} min={1} suffix="px" error={errors.height} className="flex-1" stepper={false} />
        </div>
        <SegmentedControl
          size="sm"
          label={t('settings.scale')}
          value={null}
          onChange={(factor) => {
            updateSettings({ preset: 'custom', width: Math.max(1, Math.round(meta.width * factor)), height: Math.max(1, Math.round(meta.height * factor)), lockAspect: true })
          }}
          options={[0.25, 0.5, 0.75, 2].map((factor) => ({ value: factor, label: `${factor * 100}%` }))}
        />
      </SettingsSection>
      <SettingsSection title={t('settings.fitting')}>
        <SegmentedControl
          value={settings.mode}
          onChange={(mode) => updateSettings({ mode })}
          options={RESIZE_MODES.map((mode) => ({ value: mode, label: t(`settings.modes.${mode}`) }))}
        />
        <p className="-mt-1 text-xs text-muted">{t(`settings.modes.${settings.mode}Hint`)}</p>
        <Checkbox label={t('settings.noUpscale')} description={t('settings.noUpscaleHint')} checked={settings.noUpscale} onChange={(noUpscale) => updateSettings({ noUpscale })} />
        {geometry && (
          <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
            {t('settings.outputSize')}: <span className="font-semibold text-text">{formatDimensions(geometry.canvasWidth, geometry.canvasHeight)}</span>
          </p>
        )}
      </SettingsSection>
    </>
  )
}

// Width/height follow the uploaded image until the user edits them.
const resolveDimensions = (settings, meta) => ({ width: settings.width ?? meta.width, height: settings.height ?? meta.height })

export default function ResizeImagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={() => updateSettings({ width: null, height: null, preset: 'custom' })}
        actionLabel={t('tools.image-resize.action')}
        actionIcon={Scaling}
        processingTitle={t('processing.resizingImage')}
        successMessage="toasts.imageResized"
        canProcess={({ meta }) => schema.safeParse(resolveDimensions(settings, meta)).success}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={({ meta }) => <ResizeSettings settings={settings} updateSettings={updateSettings} meta={meta} />}
        onProcess={({ file, meta, signal, onProgress }) =>
          resizeImage(file, { ...resolveDimensions(settings, meta), mode: settings.mode, noUpscale: settings.noUpscale }, { signal, onProgress })
        }
        renderResult={(context) => <ImageResult {...context} title={t('result.resizeComplete')} suffix="resized" compare={false} />}
      />
    </ToolLayout>
  )
}
