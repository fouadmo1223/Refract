import { useState } from 'react'
import { EyeOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { censorRegions } from '@/services/image/compositionEffects'
import { readImageInfo } from '@/services/image/imageInfoService'
import { runImageJob } from '@/services/image/imageWorkerClient'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { RegionEditor } from '@/components/media/RegionEditor'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'image-censor'
const DEFAULTS = { mode: 'blur', strength: 60 }

export function CensorControls({ settings, updateSettings, regions, onClear }) {
  const { t } = useTranslation()
  return (
    <SettingsSection
      title={t('censor.title')}
      action={
        regions.length > 0 && (
          <Button variant="ghost" size="xs" leftIcon={Trash2} onClick={onClear}>
            {t('common.clear')}
          </Button>
        )
      }
    >
      <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">{regions.length ? t('censor.count', { count: regions.length }) : t('censor.drawHint')}</p>
      <SegmentedControl
        label={t('censor.effect')}
        value={settings.mode}
        onChange={(mode) => updateSettings({ mode })}
        options={['blur', 'pixelate', 'solid'].map((mode) => ({ value: mode, label: t(`censor.modes.${mode}`) }))}
      />
      {settings.mode !== 'solid' && <Slider label={t('effects.strength')} value={settings.strength} min={10} max={100} onChange={(strength) => updateSettings({ strength })} />}
    </SettingsSection>
  )
}

export default function CensorImagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [file, setFile] = useState(null)
  const [regions, setRegions] = useState([])
  const { bitmap } = usePreviewBitmap(file, 1400)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={(next) => {
          setFile(next)
          setRegions([])
        }}
        actionLabel={t('tools.image-censor.action')}
        actionIcon={EyeOff}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={regions.length > 0}
        renderPreview={({ meta }) =>
          bitmap ? (
            <MediaStage checkerboard>
              <RegionEditor mediaWidth={meta.width} mediaHeight={meta.height} regions={regions} onChange={setRegions} style={{ width: `min(100%, ${((meta.width / meta.height) * 60).toFixed(3)}vh)` }}>
                <CanvasView
                  className="size-full"
                  deps={[bitmap, regions, settings]}
                  label={t('common.preview')}
                  draw={() => {
                    const scale = bitmap.width / meta.width
                    const scaled = regions.map((region) => ({ x: region.x * scale, y: region.y * scale, width: region.width * scale, height: region.height * scale }))
                    return censorRegions(bitmap, { ...settings, regions: scaled })
                  }}
                />
              </RegionEditor>
            </MediaStage>
          ) : (
            <MediaStage>
              <LoadingState />
            </MediaStage>
          )
        }
        renderSettings={() => <CensorControls settings={settings} updateSettings={updateSettings} regions={regions} onClear={() => setRegions([])} />}
        onProcess={({ file: source, signal, onProgress }) => runImageJob('censor', source, { ...settings, regions, format: 'original', quality: 92 }, { signal, onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.effectComplete')} suffix="censored" />}
      />
    </ToolLayout>
  )
}
