import { useTranslation } from 'react-i18next'
import { getImageFormat, getImageFormatFromFile } from '@/constants/imageFormats'
import { buildOutputName, getExtension } from '@/lib/files'
import { formatBytes, formatDimensions, formatPercent } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { MediaStage } from '@/components/layout/Panels'
import { BeforeAfterSlider } from '@/components/media/BeforeAfterSlider'
import { ResultView } from '@/components/media/ResultView'

function sourceFormatLabel(file) {
  const format = getImageFormatFromFile(file)
  return format ? getImageFormat(format).label : getExtension(file.name).toUpperCase()
}

/** Stats comparing the source file with the processed result. */
export function useImageComparisonStats(file, result, meta) {
  const { t } = useTranslation()
  const saved = file.size > 0 ? 1 - result.blob.size / file.size : 0
  return [
    { label: t('result.before'), value: formatBytes(file.size), hint: meta ? formatDimensions(meta.width, meta.height) : undefined },
    { label: t('result.after'), value: formatBytes(result.blob.size), hint: formatDimensions(result.width, result.height) },
    {
      label: saved >= 0 ? t('result.saved') : t('result.larger'),
      value: formatPercent(Math.abs(saved)),
      tone: saved > 0.005 ? 'success' : saved < -0.005 ? 'danger' : undefined,
    },
    {
      label: t('result.format'),
      value: `${sourceFormatLabel(file)} → ${getImageFormat(result.format).label}`,
    },
  ]
}

/**
 * Standard image result: stats + before/after slider (or a plain preview)
 * + export panel.
 */
export function ImageResult({ file, meta, result, reset, startOver, title, suffix, stats, compare = true, notice, outputName, hideSavings = false }) {
  const originalUrl = useObjectUrl(compare ? file : null)
  const resultUrl = useObjectUrl(result.blob)
  const { t } = useTranslation()
  const comparisonStats = useImageComparisonStats(file, result, meta)
  // Size savings are meaningless when the output is a different kind of file (e.g. raster → SVG).
  const defaultStats = hideSavings ? [comparisonStats[0], comparisonStats[1], comparisonStats[3]] : comparisonStats
  const format = getImageFormat(result.format)

  return (
    <ResultView
      title={title}
      notice={notice}
      stats={stats ?? defaultStats}
      onAdjust={reset}
      onProcessAnother={startOver}
      preview={
        compare && originalUrl && resultUrl ? (
          <BeforeAfterSlider beforeSrc={originalUrl} afterSrc={resultUrl} beforeLabel={t('result.original')} afterLabel={t('result.result')} className="border border-border" />
        ) : (
          <MediaStage checkerboard>{resultUrl && <img src={resultUrl} alt={t('result.result')} className="max-h-[62vh] max-w-full object-contain" />}</MediaStage>
        )
      }
      exportProps={{
        blob: result.blob,
        fileName: outputName ?? buildOutputName(file.name, suffix, format.ext),
        extension: format.ext,
        formatLabel: format.label,
        width: result.width,
        height: result.height,
      }}
    />
  )
}
