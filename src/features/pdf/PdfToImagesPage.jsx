import { useState } from 'react'
import { FileImage } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { pdfToImages, readPdfInfo } from '@/services/pdf/pdfService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { PdfPagesGrid } from './shared/PdfPagesGrid'
import { PdfImagesResult } from './shared/PdfResults'
import { usePageItems } from './shared/usePageItems'
import { usePdfThumbnails } from './shared/usePdfThumbnails'

const TOOL_ID = 'pdf-to-images'
const DEFAULTS = { format: 'png', dpi: 150, quality: 90, transparent: false }
const DPI_OPTIONS = [72, 150, 200, 300]

export default function PdfToImagesPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const { pages: thumbs } = usePdfThumbnails(file)
  const pages = usePageItems(pageCount)
  const chosen = pages.items.filter((item) => pages.selected.has(item.id)).map((item) => item.index)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.pdf}
        loadMeta={async (next) => {
          const info = await readPdfInfo(next)
          setPageCount(info.pages)
          return info
        }}
        onFileChange={setFile}
        actionLabel={t('tools.pdf-to-images.action')}
        actionIcon={FileImage}
        processingTitle={t('processing.renderingPages')}
        successMessage="toasts.pagesExported"
        renderPreview={() => (
          <MediaStage className="block bg-surface-2">
            <p className="mb-3 text-xs text-muted">{t('pdf.selectPagesHint')}</p>
            <PdfPagesGrid items={pages.items} thumbs={thumbs} selectedIds={pages.selected} onToggle={pages.toggle} />
          </MediaStage>
        )}
        renderSettings={({ meta }) => (
          <>
            <SettingsSection
              title={t('pdf.pagesTitle')}
              action={
                <Button variant="ghost" size="xs" onClick={pages.selected.size ? pages.selectNone : pages.selectAll}>
                  {pages.selected.size ? t('pdf.selectNone') : t('common.selectAll')}
                </Button>
              }
            >
              <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                {chosen.length ? t('pdf.selectedCount', { count: chosen.length, total: meta?.pages ?? 0 }) : t('pdf.allPages', { count: meta?.pages ?? 0 })}
              </p>
            </SettingsSection>
            <SettingsSection title={t('settings.output')}>
              <SegmentedControl
                label={t('settings.outputFormat')}
                value={settings.format}
                onChange={(format) => updateSettings({ format })}
                options={[
                  { value: 'png', label: 'PNG' },
                  { value: 'jpeg', label: 'JPG' },
                  { value: 'webp', label: 'WebP' },
                ]}
              />
              <SegmentedControl label={t('pdf.resolution')} value={settings.dpi} onChange={(dpi) => updateSettings({ dpi })} options={DPI_OPTIONS.map((value) => ({ value, label: `${value} DPI` }))} />
              <p className="-mt-1 text-xs text-muted">{t('pdf.resolutionHint')}</p>
              {settings.format !== 'png' ? (
                <Slider label={t('settings.quality')} value={settings.quality} min={30} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />
              ) : (
                <Switch label={t('pdf.transparent')} description={t('pdf.transparentHint')} checked={settings.transparent} onChange={(transparent) => updateSettings({ transparent })} />
              )}
            </SettingsSection>
          </>
        )}
        onProcess={({ file: source, signal, onProgress }) => pdfToImages(source, { ...settings, pages: chosen.length ? chosen : null }, { signal, onProgress })}
        renderResult={(context) => <PdfImagesResult {...context} />}
      />
    </ToolLayout>
  )
}
