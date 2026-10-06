import { useEffect, useState } from 'react'
import { Blend, Eraser, FlipVertical2, Paintbrush, RotateCcw, Trash2, Wand } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'
import { EraserCanvas } from './EraserCanvas'
import { EraserEngine } from './eraserEngine'

const TOOL_ID = 'image-eraser'
const WORKING_SIZE = 2400
const DEFAULTS = {
  tool: 'erase',
  size: 60,
  hardness: 70,
  strength: 100,
  tolerance: 18,
  contiguous: true,
  wandMode: 'erase',
  smooth: true,
  view: 'checker',
  format: 'png',
  quality: 92,
  trim: false,
  padding: 0,
}

export default function EraserPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const [file, setFile] = useState(null)
  const { bitmap } = usePreviewBitmap(file, WORKING_SIZE)
  const [engine, setEngine] = useState(null)

  // One engine (mask + history) per image; it outlives the preview while exporting.
  useEffect(() => {
    setEngine(bitmap ? new EraserEngine(bitmap) : null)
  }, [bitmap])

  const brushTool = settings.tool !== 'wand'

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={setFile}
        actionLabel={t('tools.image-eraser.action')}
        actionIcon={Eraser}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={Boolean(engine)}
        renderPreview={() =>
          engine ? (
            <EraserCanvas engine={engine} settings={settings} updateSettings={updateSettings} />
          ) : (
            <MediaStage>
              <LoadingState />
            </MediaStage>
          )
        }
        renderSettings={() => (
          <>
            <SettingsSection title={t('eraser.tool')}>
              <SegmentedControl
                value={settings.tool}
                onChange={(tool) => updateSettings({ tool })}
                options={[
                  { value: 'erase', label: t('eraser.tools.erase'), icon: Eraser },
                  { value: 'restore', label: t('eraser.tools.restore'), icon: Paintbrush },
                  { value: 'wand', label: t('eraser.tools.wand'), icon: Wand },
                ]}
              />
              <p className="-mt-1 text-xs text-muted">{t(`eraser.toolHints.${settings.tool}`)}</p>
            </SettingsSection>

            {brushTool ? (
              <SettingsSection title={t('eraser.brush')}>
                <Slider label={t('eraser.size')} value={settings.size} min={2} max={400} onChange={(size) => updateSettings({ size })} formatValue={(value) => `${value}px`} />
                <Slider label={t('eraser.hardness')} value={settings.hardness} min={0} max={100} onChange={(hardness) => updateSettings({ hardness })} formatValue={(value) => `${value}%`} />
                <Slider label={t('eraser.strength')} value={settings.strength} min={5} max={100} onChange={(strength) => updateSettings({ strength })} formatValue={(value) => `${value}%`} />
              </SettingsSection>
            ) : (
              <SettingsSection title={t('eraser.wand')}>
                <SegmentedControl
                  value={settings.wandMode}
                  onChange={(wandMode) => updateSettings({ wandMode })}
                  options={[
                    { value: 'erase', label: t('eraser.tools.erase') },
                    { value: 'restore', label: t('eraser.tools.restore') },
                  ]}
                />
                <Slider label={t('eraser.tolerance')} value={settings.tolerance} min={0} max={100} onChange={(tolerance) => updateSettings({ tolerance })} formatValue={(value) => `${value}%`} />
                <Switch label={t('eraser.contiguous')} description={t('eraser.contiguousHint')} checked={settings.contiguous} onChange={(contiguous) => updateSettings({ contiguous })} />
                <Switch label={t('eraser.smooth')} checked={settings.smooth} onChange={(smooth) => updateSettings({ smooth })} />
              </SettingsSection>
            )}

            <SettingsSection title={t('eraser.quickActions')}>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" leftIcon={FlipVertical2} disabled={!engine} onClick={() => engine.invert()}>
                  {t('eraser.invert')}
                </Button>
                <Button variant="secondary" size="sm" leftIcon={Blend} disabled={!engine} onClick={() => engine.feather(2)}>
                  {t('eraser.feather')}
                </Button>
                <Button variant="secondary" size="sm" leftIcon={RotateCcw} disabled={!engine} onClick={() => engine.restoreAll()}>
                  {t('eraser.restoreAll')}
                </Button>
                <Button variant="secondary" size="sm" leftIcon={Trash2} disabled={!engine} onClick={() => engine.eraseAll()}>
                  {t('eraser.eraseAll')}
                </Button>
              </div>
            </SettingsSection>

            <SettingsSection title={t('settings.output')}>
              <SegmentedControl
                label={t('settings.outputFormat')}
                value={settings.format}
                onChange={(format) => updateSettings({ format })}
                options={[
                  { value: 'png', label: 'PNG' },
                  { value: 'webp', label: 'WebP' },
                ]}
              />
              {settings.format === 'webp' && <Slider label={t('settings.quality')} value={settings.quality} min={40} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />}
              <Switch label={t('eraser.trim')} description={t('eraser.trimHint')} checked={settings.trim} onChange={(trim) => updateSettings({ trim })} />
              {settings.trim && <Slider label={t('eraser.padding')} value={settings.padding} min={0} max={200} onChange={(padding) => updateSettings({ padding })} formatValue={(value) => `${value}px`} />}
            </SettingsSection>
          </>
        )}
        onProcess={({ file: source }) => engine.export(source, settings)}
        renderResult={(context) => <ImageResult {...context} title={t('result.effectComplete')} suffix="erased" />}
      />
    </ToolLayout>
  )
}
