import { useState } from 'react'
import { ArrowDown, ArrowUp, Merge, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MERGE_MAX_FILES, UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { createFileId } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { useProcessingJob } from '@/hooks/useProcessingJob'
import { mergeVideos } from '@/services/video/videoMergeService'
import { preloadFFmpeg } from '@/services/video/ffmpeg/ffmpegClient'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsPanel, SettingsSection } from '@/components/layout/Panels'
import { FileUploader } from '@/components/media/FileUploader'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ProcessingState } from '@/components/media/ProcessingState'
import { ErrorState } from '@/components/feedback/States'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-merge'

/** Ordered clip list with keyboard-accessible reordering (move up / down buttons). */
function ClipList({ clips, onMove, onRemove, disabled }) {
  const { t } = useTranslation()
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {clips.map((clip, index) => (
        <li key={clip.id} className="flex items-center gap-3 px-3 py-2.5">
          <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-xs font-semibold text-text-2">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-text" dir="auto">
              {clip.file.name}
            </p>
            <p className="tabular text-xs text-muted">{formatBytes(clip.file.size)}</p>
          </div>
          <IconButton icon={ArrowUp} label={t('merge.moveUp')} size="sm" disabled={disabled || index === 0} onClick={() => onMove(index, -1)} />
          <IconButton icon={ArrowDown} label={t('merge.moveDown')} size="sm" disabled={disabled || index === clips.length - 1} onClick={() => onMove(index, 1)} />
          <IconButton icon={X} label={t('common.removeFile')} size="sm" variant="danger-ghost" disabled={disabled} onClick={() => onRemove(clip.id)} />
        </li>
      ))}
    </ol>
  )
}

export default function MergeVideosPage() {
  const { t } = useTranslation()
  const [clips, setClips] = useState([])
  const job = useProcessingJob({ toolId: TOOL_ID, successMessage: 'toasts.videosMerged' })

  const addClips = (files) => {
    preloadFFmpeg()
    setClips((current) => [...current, ...files.map((file) => ({ id: createFileId(file), file }))].slice(0, MERGE_MAX_FILES))
  }
  const moveClip = (index, direction) =>
    setClips((current) => {
      const next = [...current]
      const [clip] = next.splice(index, 1)
      next.splice(index + direction, 0, clip)
      return next
    })

  const handleMergeStart = () => job.run(({ signal, onProgress }) => mergeVideos(clips.map((clip) => clip.file), { signal, onProgress }), { fileName: clips[0]?.file.name })

  if (job.status === 'success' && job.result) {
    const firstClip = clips[0].file
    return (
      <ToolLayout toolId={TOOL_ID}>
        <VideoResult
          file={{ name: firstClip.name, size: clips.reduce((sum, clip) => sum + clip.file.size, 0) }}
          result={job.result}
          reset={job.reset}
          startOver={() => {
            job.reset()
            setClips([])
          }}
          title={t('result.mergeComplete', { count: clips.length })}
          suffix="merged"
          showSizeChange={false}
          notice={
            job.result.audioDropped ? (
              <p className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-[13px] text-text-2">
                <TriangleAlert size={15} className="mt-px shrink-0 text-warning" aria-hidden="true" />
                {t('merge.audioDropped')}
              </p>
            ) : null
          }
        />
      </ToolLayout>
    )
  }

  if (!clips.length) {
    return (
      <ToolLayout toolId={TOOL_ID}>
        <FileUploader profile={UPLOAD_PROFILES.video} multiple maxFiles={MERGE_MAX_FILES} onFiles={addClips} />
        <PrivacyNote className="mx-auto mt-4 max-w-md bg-transparent" />
      </ToolLayout>
    )
  }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          {job.isProcessing ? (
            <MediaStage>
              <ProcessingState title={t('processing.mergingVideos')} progress={job.progress} stage={job.stage} onCancel={job.cancel} longRunning />
            </MediaStage>
          ) : job.status === 'error' ? (
            <MediaStage>
              <ErrorState error={job.error} onRetry={handleMergeStart} />
            </MediaStage>
          ) : (
            <>
              <ClipList clips={clips} onMove={moveClip} onRemove={(id) => setClips((current) => current.filter((clip) => clip.id !== id))} disabled={job.isProcessing} />
              {clips.length < MERGE_MAX_FILES && <FileUploader profile={UPLOAD_PROFILES.video} multiple maxFiles={MERGE_MAX_FILES - clips.length} onFiles={addClips} variant="compact" title={t('merge.addClips')} />}
            </>
          )}
        </div>
        <SettingsPanel
          footer={
            <Button variant="primary" size="lg" fullWidth leftIcon={Merge} onClick={handleMergeStart} disabled={clips.length < 2} loading={job.isProcessing}>
              {t('tools.video-merge.action')}
            </Button>
          }
        >
          <SettingsSection title={t('merge.title')}>
            <p className="text-[13px] leading-relaxed text-text-2">{t('merge.description')}</p>
            {clips.length < 2 && <p className="text-xs font-medium text-danger">{t('validation.mergeMinClips')}</p>}
          </SettingsSection>
          <PrivacyNote />
        </SettingsPanel>
      </div>
    </ToolLayout>
  )
}
