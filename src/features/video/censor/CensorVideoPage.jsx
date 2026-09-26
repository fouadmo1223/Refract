import { useState } from 'react'
import { EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { censorVideo } from '@/services/video/videoLookService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage } from '@/components/layout/Panels'
import { RegionEditor } from '@/components/media/RegionEditor'
import { VideoPreview } from '@/components/media/Previews'
import { CensorControls } from '@/features/image/censor/CensorImagePage'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-censor'
const DEFAULTS = { mode: 'blur', strength: 60 }
const PREVIEW_EFFECT = { blur: 'backdrop-blur-md', pixelate: 'backdrop-blur-sm backdrop-contrast-150', solid: 'bg-black' }

function CensorStage({ file, meta, regions, onChange, mode }) {
  const { t } = useTranslation()
  const url = useObjectUrl(file)
  if (meta?.playable === false || !meta?.width) return <VideoPreview file={file} meta={meta} />
  return (
    <div className="flex flex-col gap-2">
      <MediaStage className="bg-black">
        <RegionEditor mediaWidth={meta.width} mediaHeight={meta.height} regions={regions} onChange={onChange} style={{ width: `min(100%, ${((meta.width / meta.height) * 60).toFixed(3)}vh)` }}>
          {url && <video src={url} className="size-full" muted loop autoPlay playsInline />}
          {/* Approximate live effect; the export applies the exact FFmpeg filter. */}
          {regions.map((region) => (
            <div
              key={region.id}
              className={cn('pointer-events-none absolute', PREVIEW_EFFECT[mode])}
              style={{ left: `${(region.x / meta.width) * 100}%`, top: `${(region.y / meta.height) * 100}%`, width: `${(region.width / meta.width) * 100}%`, height: `${(region.height / meta.height) * 100}%` }}
            />
          ))}
        </RegionEditor>
      </MediaStage>
      <p className="text-xs text-muted">{t('censor.videoHint')}</p>
    </div>
  )
}

export default function CensorVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [regions, setRegions] = useState([])

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        onFileChange={() => setRegions([])}
        actionLabel={t('tools.video-censor.action')}
        actionIcon={EyeOff}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={regions.length > 0}
        renderPreview={({ file, meta }) => <CensorStage file={file} meta={meta} regions={regions} onChange={setRegions} mode={settings.mode} />}
        renderSettings={() => <CensorControls settings={settings} updateSettings={updateSettings} regions={regions} onClear={() => setRegions([])} />}
        onProcess={({ file, meta, signal, onProgress }) => censorVideo(file, { ...settings, regions }, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.effectComplete')} suffix="censored" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
