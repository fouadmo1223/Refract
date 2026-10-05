import { Minimize2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { resultFileName } from '@/lib/files'
import { compressPdf, readPdfInfo } from '@/services/pdf/pdfService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { PdfFirstPage, PdfResult } from './shared/PdfResults'

const TOOL_ID = 'pdf-compress'
const DEFAULTS = { mode: 'strong', dpi: 120, quality: 70 }
const LEVELS = { light: { dpi: 150, quality: 80 }, medium: { dpi: 120, quality: 70 }, small: { dpi: 96, quality: 55 } }

export default function CompressPdfPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const level = Object.entries(LEVELS).find(([, value]) => value.dpi === settings.dpi && value.quality === settings.quality)?.[0] ?? null

  const renderControls = ({ settings, updateSettings }) => (
    <SettingsSection title={t('settings.compression')}>
      <SegmentedControl
        value={settings.mode}
        onChange={(mode) => updateSettings({ mode })}
        options={[
          { value: 'strong', label: t('pdf.compressModes.strong') },
          { value: 'lossless', label: t('pdf.compressModes.lossless') },
        ]}
      />
      <p className="-mt-1 text-xs text-muted">{t(`pdf.compressHints.${settings.mode}`)}</p>
      {settings.mode === 'strong' && (
        <>
          <SegmentedControl
            label={t('pdf.compressLevel')}
            value={level}
            onChange={(id) => updateSettings(LEVELS[id])}
            options={Object.keys(LEVELS).map((id) => ({ value: id, label: t(`pdf.levels.${id}`) }))}
          />
          <Slider label={t('pdf.resolution')} value={settings.dpi} min={60} max={200} step={6} onChange={(dpi) => updateSettings({ dpi })} formatValue={(value) => `${value} DPI`} />
          <Slider label={t('settings.quality')} value={settings.quality} min={20} max={95} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />
        </>
      )}
    </SettingsSection>
  )

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.pdf}
        loadMeta={readPdfInfo}
        actionLabel={t('tools.pdf-compress.action')}
        actionIcon={Minimize2}
        processingTitle={t('processing.compressingPdf')}
        successMessage="toasts.pdfCompressed"
        renderPreview={({ file, meta }) => (
          <MediaStage className="bg-surface-2">
            <div className="flex flex-col items-center gap-2">
              <PdfFirstPage blob={file} />
              <p className="tabular text-xs text-muted">{t('pdf.pageCount', { count: meta?.pages ?? 0 })}</p>
            </div>
          </MediaStage>
        )}
        renderSettings={() => renderControls({ settings, updateSettings })}
        onProcess={({ file, signal, onProgress }) => compressPdf(file, settings, { signal, onProgress })}
        batch={{
          settings,
          updateSettings,
          renderSettings: renderControls,
          process: ({ file, settings: fileSettings, signal, onProgress }) => compressPdf(file, fileSettings, { signal, onProgress }),
          outputName: (file, result) => resultFileName(file.name, 'compressed', result?.format),
        }}
        renderResult={(context) => (
          <PdfResult
            {...context}
            title={t(context.result.unchanged ? 'pdf.alreadySmall' : 'pdf.compressDone')}
            suffix="compressed"
            notice={context.result.unchanged ? <p className="rounded-md bg-surface-2 px-3 py-2.5 text-[13px] text-text-2">{t('pdf.alreadySmallHint')}</p> : null}
          />
        )}
      />
    </ToolLayout>
  )
}
