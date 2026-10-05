import { useState } from 'react'
import { Scissors } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { buildPdfFromPages, parsePageRanges, readPdfInfo, splitPdf } from '@/services/pdf/pdfService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { PdfPagesGrid } from './shared/PdfPagesGrid'
import { PdfPartsResult, PdfResult } from './shared/PdfResults'
import { usePageItems } from './shared/usePageItems'
import { usePdfThumbnails } from './shared/usePdfThumbnails'

const TOOL_ID = 'pdf-split'
const DEFAULTS = { mode: 'select', ranges: '1-2, 3-', every: 1 }
const MODES = ['select', 'ranges', 'every']

/** Output groups (0-based pages per file) for the current mode, or null when invalid. */
function planGroups(settings, pageCount, selectedPages) {
  if (!pageCount) return null
  if (settings.mode === 'select') return selectedPages.length ? [selectedPages] : null
  if (settings.mode === 'every') {
    const size = Math.max(1, Math.floor(settings.every || 1))
    const groups = []
    for (let start = 0; start < pageCount; start += size) groups.push(Array.from({ length: Math.min(size, pageCount - start) }, (_, offset) => start + offset))
    return groups.length > 1 || size < pageCount ? groups : null
  }
  // "1-2, 3-" → one file per comma-separated range.
  const groups = String(settings.ranges)
    .split(',')
    .map((part) => parsePageRanges(part, pageCount))
  return groups.length && groups.every((group) => group?.length) ? groups : null
}

export default function SplitPdfPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const { pages: thumbs } = usePdfThumbnails(file)
  const pages = usePageItems(pageCount)
  const selectedPages = pages.items.filter((item) => pages.selected.has(item.id)).map((item) => item.index)
  const groups = planGroups(settings, pageCount, selectedPages)

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
        actionLabel={settings.mode === 'select' ? t('pdf.extractAction') : t('tools.pdf-split.action')}
        actionIcon={Scissors}
        processingTitle={t('processing.splittingPdf')}
        successMessage="toasts.pdfSplit"
        canProcess={Boolean(groups)}
        renderPreview={() => (
          <MediaStage className="block bg-surface-2">
            {settings.mode === 'select' && <p className="mb-3 text-xs text-muted">{t('pdf.selectExtractHint')}</p>}
            <PdfPagesGrid items={pages.items} thumbs={thumbs} selectedIds={settings.mode === 'select' ? pages.selected : undefined} onToggle={settings.mode === 'select' ? pages.toggle : undefined} />
          </MediaStage>
        )}
        renderSettings={() => (
          <SettingsSection title={t('pdf.splitHow')}>
            <SegmentedControl value={settings.mode} onChange={(mode) => updateSettings({ mode })} options={MODES.map((value) => ({ value, label: t(`pdf.splitModes.${value}`) }))} />
            <p className="-mt-1 text-xs text-muted">{t(`pdf.splitHints.${settings.mode}`)}</p>
            {settings.mode === 'select' && (
              <div className="flex gap-1.5">
                <Button variant="secondary" size="xs" onClick={pages.selectAll}>
                  {t('common.selectAll')}
                </Button>
                <Button variant="ghost" size="xs" onClick={pages.selectNone}>
                  {t('pdf.selectNone')}
                </Button>
              </div>
            )}
            {settings.mode === 'ranges' && (
              <Input
                label={t('pdf.ranges')}
                value={settings.ranges}
                onChange={(event) => updateSettings({ ranges: event.target.value })}
                placeholder="1-3, 4-6, 7-"
                inputClassName="tabular"
                dir="ltr"
                error={groups ? undefined : 'validation.pageRanges'}
              />
            )}
            {settings.mode === 'every' && <NumberInput label={t('pdf.pagesPerFile')} value={settings.every} min={1} max={Math.max(1, pageCount)} onChange={(every) => updateSettings({ every })} />}
            <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
              {groups ? t('pdf.splitSummary', { count: groups.length, pages: groups.reduce((sum, group) => sum + group.length, 0) }) : t('pdf.splitNothing')}
            </p>
          </SettingsSection>
        )}
        onProcess={({ file: source, signal, onProgress }) =>
          groups.length === 1
            ? buildPdfFromPages(
                source,
                groups[0].map((index) => ({ index })),
                { onProgress },
              )
            : splitPdf(source, groups, { signal, onProgress })
        }
        renderResult={(context) =>
          context.result.parts ? <PdfPartsResult {...context} /> : <PdfResult {...context} title={t('pdf.extractDone', { count: context.result.pages })} suffix="extract" showSizeChange={false} />
        }
      />
    </ToolLayout>
  )
}
