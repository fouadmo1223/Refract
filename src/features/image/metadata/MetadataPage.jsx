import { MapPin, ShieldCheck, ShieldOff, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { getImageFormat } from '@/constants/imageFormats'
import { formatBytes, formatDimensions } from '@/lib/format'
import { useMediaMeta } from '@/hooks/useMediaMeta'
import { readImageInfo } from '@/services/image/imageInfoService'
import { readImageMetadata, stripImageMetadata } from '@/services/image/imageMetadataService'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'image-metadata'

function MetadataTable({ file, info }) {
  const { t } = useTranslation()
  const metadata = useMediaMeta(file, readImageMetadata, { key: 'exif' })

  const basics = [
    { key: 'fileName', value: file.name },
    { key: 'fileSize', value: formatBytes(file.size) },
    { key: 'format', value: info?.format ? getImageFormat(info.format).label : file.type },
    { key: 'dimensions', value: info ? formatDimensions(info.width, info.height) : '—' },
    { key: 'lastModified', value: file.lastModified ? new Date(file.lastModified).toLocaleString() : '—' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <ImagePreview file={file} imgClassName="max-h-[36vh]" />
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <MetadataGroup title={t('metadata.groups.file')} rows={basics.map((row) => ({ label: t(`metadata.fields.${row.key}`), value: row.value }))} />
        {metadata.isLoading && <LoadingState className="min-h-24" />}
        {metadata.data?.gps && (
          <div className="flex items-start gap-2.5 border-t border-border bg-warning-soft px-4 py-3 text-[13px]">
            <MapPin size={16} className="mt-px shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="font-medium text-text">{t('metadata.gpsFound')}</p>
              <p className="tabular text-xs text-muted" dir="ltr">
                {metadata.data.gps.latitude.toFixed(5)}, {metadata.data.gps.longitude.toFixed(5)}
              </p>
            </div>
          </div>
        )}
        {metadata.data?.groups.map((group) => (
          <MetadataGroup key={group.group} title={t(`metadata.groups.${group.group}`)} rows={group.entries.map((entry) => ({ label: t(`metadata.exif.${entry.key}`, { defaultValue: entry.key }), value: entry.value }))} />
        ))}
        {metadata.data && !metadata.data.hasMetadata && (
          <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-[13px] text-muted">
            <ShieldCheck size={15} className="text-success" aria-hidden="true" />
            {t('metadata.none')}
          </p>
        )}
      </div>
    </div>
  )
}

function MetadataGroup({ title, rows }) {
  return (
    <section className="border-t border-border first:border-t-0">
      <h3 className="bg-surface-2 px-4 py-2 text-2xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-4 py-2 text-[13px]">
            <dt className="text-muted">{row.label}</dt>
            <dd className="tabular truncate text-text" title={row.value} dir="auto">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default function MetadataPage() {
  const { t } = useTranslation()
  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        actionLabel={t('tools.image-metadata.action')}
        actionIcon={ShieldOff}
        processingTitle={t('processing.removingMetadata')}
        successMessage="toasts.metadataRemoved"
        renderPreview={({ file, meta }) => <MetadataTable file={file} info={meta} />}
        renderSettings={() => (
          <SettingsSection title={t('metadata.removeTitle')}>
            <p className="text-[13px] leading-relaxed text-text-2">{t('metadata.removeDescription')}</p>
            <p className="flex gap-2 text-xs leading-relaxed text-muted">
              <TriangleAlert size={14} className="mt-px shrink-0 text-warning" aria-hidden="true" />
              {t('metadata.reencodeNote')}
            </p>
          </SettingsSection>
        )}
        onProcess={({ file, signal, onProgress }) => stripImageMetadata(file, { signal, onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.metadataRemoved')} suffix="clean" compare={false} />}
      />
    </ToolLayout>
  )
}
