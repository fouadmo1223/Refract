import { Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { OutputSizeOptions } from '../shared/OutputSizeOptions'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { resultFileName } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { convertHeic, readHeicInfo } from '@/services/image/heicService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'heic-to-jpg'
const DEFAULTS = { format: 'jpeg', quality: 90, scale: 100, limitDimensions: false, maxDimension: 2560 }

/** Most browsers can't render HEIC, so show a file summary instead of a preview. */
function HeicPlaceholder({ file }) {
  const { t } = useTranslation()
  return (
    <MediaStage>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg bg-surface-2 text-muted ring-1 ring-inset ring-border">
          <Smartphone size={22} aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-text" dir="auto">
          {file.name}
        </p>
        <p className="tabular text-xs text-muted">{formatBytes(file.size)}</p>
        <p className="max-w-xs text-xs text-muted">{t('heic.previewHint')}</p>
      </div>
    </MediaStage>
  )
}

export default function HeicToJpgPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }

  // Controls and processing take settings as arguments so multi-file mode can give each file its own.
  const renderControls = ({ settings, updateSettings }) => (
    <>
    <SettingsSection title={t('settings.output')}>
      <SegmentedControl
        label={t('settings.outputFormat')}
        value={settings.format}
        onChange={(format) => updateSettings({ format })}
        options={[
          { value: 'jpeg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
        ]}
      />
      {settings.format === 'jpeg' && (
        <Slider label={t('settings.quality')} value={settings.quality} min={10} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />
      )}
      <p className="text-xs text-muted">{t('heic.note')}</p>
    </SettingsSection>
    <SettingsSection title={t('settings.resizeOptions')}>
      <OutputSizeOptions settings={settings} updateSettings={updateSettings} />
    </SettingsSection>
    </>
  )
  const runJob = ({ settings, file, signal, onProgress }) => convertHeic(file, { ...settings, maxDimension: settings.limitDimensions ? settings.maxDimension : null }, { signal, onProgress })

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.heic}
        loadMeta={readHeicInfo}
        actionLabel={t('tools.heic-to-jpg.action', { format: settings.format === 'png' ? 'PNG' : 'JPG' })}
        actionIcon={Smartphone}
        processingTitle={t('processing.convertingImage')}
        successMessage="toasts.imageConverted"
        renderPreview={({ file }) => <HeicPlaceholder file={file} />}
        renderSettings={(context) => renderControls({ ...context, settings, updateSettings })}
        onProcess={(context) => runJob({ ...context, settings })}
        batch={{
          settings,
          updateSettings,
          renderSettings: renderControls,
          process: runJob,
          outputName: (file, result) => resultFileName(file.name, '', result?.format),
        }}
        renderResult={(context) => <ImageResult {...context} title={t('result.conversionComplete')} suffix="" compare={false} />}
      />
    </ToolLayout>
  )
}
