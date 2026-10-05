import { useEffect, useState } from 'react'
import { Merge } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { mergePdfs, readPdfInfo } from '@/services/pdf/pdfService'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { OrderedFilesTool } from './shared/OrderedFilesTool'
import { PdfResult } from './shared/PdfResults'

const TOOL_ID = 'pdf-merge'

/** Page counts per list item, read in the background. */
function usePageCounts(items) {
  const [counts, setCounts] = useState({})
  useEffect(() => {
    let cancelled = false
    for (const item of items) {
      if (counts[item.id] !== undefined) continue
      readPdfInfo(item.file)
        .then((info) => !cancelled && setCounts((current) => ({ ...current, [item.id]: info.pages })))
        .catch(() => !cancelled && setCounts((current) => ({ ...current, [item.id]: null })))
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])
  return counts
}

export default function MergePdfPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const counts = usePageCounts(items)
  const details = Object.fromEntries(items.map((item) => [item.id, counts[item.id] != null ? t('pdf.pageCount', { count: counts[item.id] }) : null]))
  const total = items.reduce((sum, item) => sum + (counts[item.id] ?? 0), 0)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <OrderedFilesTool
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.pdf}
        minFiles={2}
        actionLabel={t('tools.pdf-merge.action')}
        actionIcon={Merge}
        processingTitle={t('processing.mergingPdfs')}
        successMessage="toasts.pdfMerged"
        details={details}
        onFilesChange={setItems}
        renderSettings={() => (
          <SettingsSection title={t('pdf.mergeTitle')}>
            <p className="text-[13px] leading-relaxed text-text-2">{t('pdf.mergeDescription')}</p>
            <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">{t('pdf.mergeSummary', { files: items.length, pages: total })}</p>
            {items.length < 2 && <p className="text-xs font-medium text-danger">{t('validation.mergeMinClips')}</p>}
          </SettingsSection>
        )}
        process={mergePdfs}
        renderResult={(context) => <PdfResult {...context} title={t('pdf.mergeDone', { count: context.files.length })} suffix="merged" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}

