import { useState } from 'react'
import { ArrowDownUp, LayoutGrid, RotateCcw, RotateCcwSquare, RotateCwSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { buildPdfFromPages, readPdfInfo } from '@/services/pdf/pdfService'
import { Button } from '@/components/ui/Button'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { PdfPagesGrid } from './shared/PdfPagesGrid'
import { SyncValue } from './shared/SyncValue'
import { PdfResult } from './shared/PdfResults'
import { usePageItems } from './shared/usePageItems'
import { usePdfThumbnails } from './shared/usePdfThumbnails'

const TOOL_ID = 'pdf-organize'

export default function OrganizePdfPage() {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const { pages: thumbs } = usePdfThumbnails(file)
  const pages = usePageItems(pageCount)
  const removed = pageCount - pages.items.length
  const rotated = pages.items.filter((item) => item.rotation).length
  const reordered = pages.items.some((item, position) => position > 0 && item.index < pages.items[position - 1].index)
  const changed = removed > 0 || rotated > 0 || reordered

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.pdf}
        loadMeta={readPdfInfo}
        onFileChange={setFile}
        actionLabel={t('tools.pdf-organize.action')}
        actionIcon={LayoutGrid}
        processingTitle={t('processing.savingPdf')}
        successMessage="toasts.pdfSaved"
        canProcess={changed}
        renderPreview={({ meta }) => (
          <MediaStage className="block bg-surface-2">
            <SyncValue value={meta?.pages ?? 0} onChange={setPageCount} />
            <p className="mb-3 text-xs text-muted">{t('pdf.organizeHint')}</p>
            <PdfPagesGrid items={pages.items} thumbs={thumbs} onReorder={pages.setItems} onRotate={(id) => pages.rotate(id)} onRemove={pages.remove} />
          </MediaStage>
        )}
        renderSettings={() => (
          <SettingsSection title={t('pdf.pagesTitle')}>
            <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
              {t('pdf.organizeSummary', { count: pages.items.length, removed, rotated })}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button variant="secondary" size="sm" leftIcon={RotateCcwSquare} onClick={() => pages.rotateAll(-90)}>
                {t('pdf.rotateAllLeft')}
              </Button>
              <Button variant="secondary" size="sm" leftIcon={RotateCwSquare} onClick={() => pages.rotateAll(90)}>
                {t('pdf.rotateAllRight')}
              </Button>
              <Button variant="secondary" size="sm" leftIcon={ArrowDownUp} onClick={pages.reverse}>
                {t('pdf.reverseOrder')}
              </Button>
              <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={pages.reset} disabled={!changed}>
                {t('common.reset')}
              </Button>
            </div>
          </SettingsSection>
        )}
        onProcess={({ file: source, onProgress }) =>
          buildPdfFromPages(
            source,
            pages.items.map((item) => ({ index: item.index, rotation: item.rotation })),
            { onProgress },
          )
        }
        renderResult={(context) => <PdfResult {...context} title={t('pdf.organizeDone')} suffix="organized" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
