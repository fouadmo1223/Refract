import { useState } from 'react'
import { EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { censorRegions } from '@/services/image/compositionEffects'
import { readImageInfo } from '@/services/image/imageInfoService'
import { runImageJob } from '@/services/image/imageWorkerClient'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { RegionEditor } from '@/components/media/RegionEditor'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'
import { CensorAreaList, DEFAULT_AREA, pickStyle } from './CensorAreaList'

const TOOL_ID = 'image-censor'

export default function CensorImagePage() {
  const { t } = useTranslation()
  const [defaults, updateDefaults] = useToolSettings(`${TOOL_ID}-areas`, pickStyle(DEFAULT_AREA))
  const [file, setFile] = useState(null)
  const [regions, setRegions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
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
          setSelectedId(null)
        }}
        actionLabel={t('tools.image-censor.action')}
        actionIcon={EyeOff}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={regions.length > 0}
        renderPreview={({ meta }) =>
          bitmap ? (
            <MediaStage checkerboard>
              <RegionEditor
                mediaWidth={meta.width}
                mediaHeight={meta.height}
                regions={regions}
                onChange={setRegions}
                selectedId={selectedId}
                onSelect={setSelectedId}
                newRegion={() => pickStyle(defaults)}
                renderFill={() => null}
                style={{ width: `min(100%, ${((meta.width / meta.height) * 60).toFixed(3)}vh)` }}
              >
                <CanvasView
                  className="size-full"
                  deps={[bitmap, regions]}
                  label={t('common.preview')}
                  draw={() => {
                    const scale = bitmap.width / meta.width
                    const scaled = regions.map((region) => ({ ...region, x: region.x * scale, y: region.y * scale, width: region.width * scale, height: region.height * scale }))
                    return censorRegions(bitmap, { regions: scaled })
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
        renderSettings={() => <CensorAreaList regions={regions} selectedId={selectedId} onSelect={setSelectedId} onChange={setRegions} onDefaultsChange={updateDefaults} />}
        onProcess={({ file: source, signal, onProgress }) => runImageJob('censor', source, { regions, format: 'original', quality: 92 }, { signal, onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.effectComplete')} suffix="censored" />}
      />
    </ToolLayout>
  )
}
