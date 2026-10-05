import { useRef, useState } from 'react'
import { FilePlus2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getAcceptString } from '@/constants/fileConstraints'
import { createFileId, validateFile } from '@/lib/files'
import { notify } from '@/lib/notify'
import { useProcessingJob } from '@/hooks/useProcessingJob'
import { Button } from '@/components/ui/Button'
import { MediaStage, SettingsPanel } from '@/components/layout/Panels'
import { FileUploader } from '@/components/media/FileUploader'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ProcessingState } from '@/components/media/ProcessingState'
import { ErrorState } from '@/components/feedback/States'
import { SortableFileList } from './SortableFileList'

/**
 * Upload several files, put them in order, then combine them into one output
 * (merge PDFs, images → PDF). `process(files, { signal, onProgress })`.
 */
export function OrderedFilesTool({ toolId, profile, maxFiles = 50, minFiles = 1, actionLabel, actionIcon, processingTitle, successMessage, renderSettings, process, renderResult, details, onFilesChange }) {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const inputRef = useRef(null)
  const job = useProcessingJob({ toolId, successMessage })

  const update = (next) => {
    setItems(next)
    onFilesChange?.(next)
  }
  const addFiles = (files) => update([...items, ...files.map((file) => ({ id: createFileId(file), file }))].slice(0, maxFiles))
  const addFromInput = (fileList) => {
    const valid = []
    for (const file of [...(fileList ?? [])]) {
      try {
        valid.push(validateFile(file, profile))
      } catch (error) {
        notify.error(error)
      }
    }
    if (valid.length) addFiles(valid)
  }
  const start = () => job.run(({ signal, onProgress }) => process(items.map((item) => item.file), { signal, onProgress }), { fileName: items[0]?.file.name })

  if (job.status === 'success' && job.result) {
    return renderResult({
      file: items[0]?.file,
      files: items.map((item) => item.file),
      result: job.result,
      reset: job.reset,
      startOver: () => {
        job.reset()
        update([])
      },
    })
  }

  if (!items.length) {
    return (
      <>
        <FileUploader profile={profile} multiple maxFiles={maxFiles} onFiles={addFiles} />
        <PrivacyNote className="mx-auto mt-4 max-w-md bg-transparent" />
      </>
    )
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        accept={getAcceptString(profile.types)}
        onChange={(event) => {
          addFromInput(event.target.files)
          event.target.value = ''
        }}
      />
      <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20">
        {job.isProcessing ? (
          <MediaStage>
            <ProcessingState title={processingTitle} progress={job.progress} stage={job.stage} onCancel={job.cancel} />
          </MediaStage>
        ) : job.status === 'error' ? (
          <MediaStage>
            <ErrorState error={job.error} onRetry={start} />
          </MediaStage>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="tabular text-[13px] font-medium text-text">{t('multi.filesCount', { count: items.length })}</p>
              <Button variant="secondary" size="sm" leftIcon={FilePlus2} onClick={() => inputRef.current?.click()} disabled={items.length >= maxFiles}>
                {t('multi.addFiles')}
              </Button>
            </div>
            <SortableFileList items={items} onChange={update} details={details} />
            <p className="text-xs text-muted">{t('pdf.orderHint')}</p>
          </>
        )}
      </div>
      <SettingsPanel
        footer={
          <Button variant="primary" size="lg" fullWidth leftIcon={actionIcon} onClick={start} disabled={items.length < minFiles} loading={job.isProcessing}>
            {actionLabel}
          </Button>
        }
      >
        <fieldset disabled={job.isProcessing} className="flex min-w-0 flex-col gap-5 disabled:opacity-60">
          {renderSettings?.({ files: items.map((item) => item.file) })}
        </fieldset>
        <PrivacyNote />
      </SettingsPanel>
    </div>
  )
}
