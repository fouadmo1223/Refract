import { useEffect, useState } from 'react'
import { Download, FileArchive, FileText, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createZip, downloadBlob } from '@/lib/download'
import { getBaseName } from '@/lib/files'
import { formatBytes, formatPercent } from '@/lib/format'
import { notify } from '@/lib/notify'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { canvasToBlob } from '@/services/image/canvas'
import { openPdf, renderPdfPage } from '@/services/pdf/pdfService'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { MediaStage } from '@/components/layout/Panels'
import { ResultStats } from '@/components/media/ResultStats'
import { ResultView } from '@/components/media/ResultView'

/** First page of a PDF blob, rendered as an image. */
export function PdfFirstPage({ blob, className = 'max-h-[60vh]' }) {
  const [image, setImage] = useState(null)
  const url = useObjectUrl(image)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const pdf = await openPdf(blob)
      try {
        const page = await pdf.getPage(1)
        const scale = 900 / page.getViewport({ scale: 1 }).width
        const canvas = await renderPdfPage(pdf, 1, { scale })
        const rendered = await canvasToBlob(canvas, 'image/jpeg', 0.85)
        if (!cancelled) setImage(rendered)
      } finally {
        pdf.destroy()
      }
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [blob])
  return url ? <img src={url} alt="" className={`max-w-full bg-white shadow-md ${className}`} /> : <Spinner className="text-muted" />
}

/** Result for tools that produce one PDF. */
export function PdfResult({ file, result, reset, startOver, title, suffix, showSizeChange = true, notice }) {
  const { t } = useTranslation()
  const before = file?.size
  const after = result.blob.size
  const saved = before ? 1 - after / before : null
  return (
    <ResultView
      title={title}
      notice={notice}
      onAdjust={reset}
      onProcessAnother={startOver}
      stats={[
        { label: t('pdf.pages'), value: String(result.pages ?? '—') },
        ...(showSizeChange && before
          ? [
              { label: t('result.before'), value: formatBytes(before) },
              { label: t('result.after'), value: formatBytes(after), tone: saved > 0 ? 'success' : undefined, hint: saved > 0.005 ? `−${formatPercent(saved)}` : undefined },
            ]
          : [{ label: t('result.fileSize'), value: formatBytes(after) }]),
      ]}
      preview={
        <MediaStage className="bg-surface-2">
          <PdfFirstPage blob={result.blob} />
        </MediaStage>
      }
      exportProps={{ blob: result.blob, fileName: `${getBaseName(file?.name ?? 'document')}${suffix ? `-${suffix}` : ''}.pdf`, extension: 'pdf', formatLabel: 'PDF' }}
    />
  )
}

/** Header with "adjust" / "start over" used by multi-output results. */
function MultiHeader({ title, reset, startOver }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {reset && (
          <Button variant="secondary" size="sm" leftIcon={SlidersHorizontal} onClick={reset}>
            {t('result.adjustSettings')}
          </Button>
        )}
        <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={startOver}>
          {t('common.processAnother')}
        </Button>
      </div>
    </div>
  )
}

function useZip(entries, zipName) {
  const [isZipping, setIsZipping] = useState(false)
  const download = async () => {
    setIsZipping(true)
    try {
      downloadBlob(await createZip(entries), zipName)
      notify.success('toasts.downloadStarted')
    } catch (error) {
      notify.error(error)
    } finally {
      setIsZipping(false)
    }
  }
  return [download, isZipping]
}

/** Result for split: several PDFs, each downloadable, plus a ZIP. */
export function PdfPartsResult({ file, result, reset, startOver }) {
  const { t } = useTranslation()
  const base = getBaseName(file.name)
  const parts = result.parts.map((part, index) => ({ ...part, name: `${base}-part${index + 1}.pdf` }))
  const [downloadAll, isZipping] = useZip(parts, `${base}-split.zip`)
  const pageLabel = (pages) => (pages.length === 1 ? t('pdf.pageShort', { number: pages[0] + 1 }) : `${t('pdf.pagesShort')} ${pages[0] + 1}–${pages[pages.length - 1] + 1}`)
  return (
    <div className="flex flex-col gap-4">
      <MultiHeader title={t('pdf.splitDone', { count: parts.length })} reset={reset} startOver={startOver} />
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {parts.map((part) => (
          <li key={part.name} className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted ring-1 ring-inset ring-border">
              <FileText size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-text">{part.name}</p>
              <p className="tabular text-xs text-muted">
                {pageLabel(part.pages)} · {formatBytes(part.blob.size)}
              </p>
            </div>
            <Button variant="ghost" size="sm" leftIcon={Download} onClick={() => downloadBlob(part.blob, part.name)}>
              {t('common.download')}
            </Button>
          </li>
        ))}
      </ul>
      {parts.length > 1 && (
        <Button variant="primary" size="lg" leftIcon={FileArchive} onClick={downloadAll} loading={isZipping} className="self-start">
          {t('batch.downloadAllZip', { count: parts.length })}
        </Button>
      )}
    </div>
  )
}

function ImageThumb({ image, onDownload }) {
  const url = useObjectUrl(image.blob)
  return (
    <button type="button" onClick={onDownload} title={image.name} className="group relative overflow-hidden rounded-md bg-surface-2 p-1 ring-1 ring-inset ring-border outline-none focus-visible:ring-2 focus-visible:ring-primary">
      {url && <img src={url} alt={image.name} className="mx-auto max-h-56 bg-white object-contain shadow-sm" loading="lazy" />}
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <Download size={16} aria-hidden="true" />
      </span>
    </button>
  )
}

/** Result for PDF → images. */
export function PdfImagesResult({ file, result, reset, startOver }) {
  const { t } = useTranslation()
  const base = getBaseName(file.name)
  const images = result.images.map((image) => ({ ...image, name: `${base}-${image.name}` }))
  const total = images.reduce((sum, image) => sum + image.blob.size, 0)
  const [downloadAll, isZipping] = useZip(images, `${base}-images.zip`)
  return (
    <div className="flex flex-col gap-4">
      <MultiHeader title={t('pdf.imagesDone', { count: images.length })} reset={reset} startOver={startOver} />
      <ResultStats
        stats={[
          { label: t('pdf.pages'), value: String(images.length) },
          { label: t('result.dimensions'), value: images[0] ? `${images[0].width} × ${images[0].height}` : '—' },
          { label: t('frames.totalSize'), value: formatBytes(total) },
        ]}
      />
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image) => (
          <ImageThumb key={image.name} image={image} onDownload={() => downloadBlob(image.blob, image.name)} />
        ))}
      </div>
      <Button variant="primary" size="lg" leftIcon={FileArchive} onClick={downloadAll} loading={isZipping} className="self-start">
        {t('batch.downloadAllZip', { count: images.length })}
      </Button>
    </div>
  )
}
