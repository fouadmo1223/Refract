import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { getAcceptString } from '@/constants/fileConstraints'
import { validateFile } from '@/lib/files'
import { notify } from '@/lib/notify'
import { useMediaMeta } from '@/hooks/useMediaMeta'
import { useProcessingJob } from '@/hooks/useProcessingJob'
import { usePendingFileStore } from '@/store/pendingFileStore'
import { Button } from '@/components/ui/Button'
import { ErrorState, LoadingState } from '@/components/feedback/States'
import { FileUploader } from '@/components/media/FileUploader'
import { FileCard } from '@/components/media/FileCard'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ProcessingState } from '@/components/media/ProcessingState'
import { MediaStage, SettingsPanel } from './Panels'
import { Stagger, StaggerItem } from '@/components/ui/Stagger'

/**
 * The shared Upload → Configure → Process → Preview → Download flow.
 * Tools only provide their preview, settings, processing call and result view;
 * state transitions, validation, cancellation and error handling live here.
 *
 * @param {object} props
 * @param {string} props.toolId
 * @param {object} props.profile upload profile (constants/fileConstraints)
 * @param {(file: File) => Promise<object>} [props.loadMeta] derive metadata after upload
 * @param {(ctx) => ReactNode} props.renderPreview ({ file, meta })
 * @param {(ctx) => ReactNode} props.renderSettings ({ file, meta, disabled })
 * @param {(ctx) => Promise<object>} props.onProcess ({ file, meta, signal, onProgress })
 * @param {(ctx) => ReactNode} props.renderResult ({ file, meta, result, reset, startOver })
 * @param {string} props.actionLabel
 * @param {boolean|((ctx) => boolean)} [props.canProcess] false disables the action (field errors present)
 */
export function MediaToolFlow({
  toolId,
  profile,
  loadMeta,
  renderPreview,
  renderSettings,
  onProcess,
  renderResult,
  actionLabel,
  actionIcon,
  processingTitle,
  successMessage,
  canProcess = true,
  longRunning = false,
  onFileChange,
  uploaderTitle,
}) {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const replaceInputRef = useRef(null)
  const takePendingFile = usePendingFileStore((state) => state.takePendingFile)
  const job = useProcessingJob({ toolId, successMessage })
  const meta = useMediaMeta(file, loadMeta, { key: toolId })

  const acceptFile = useCallback(
    (nextFile) => {
      job.reset()
      setFile(nextFile)
      onFileChange?.(nextFile)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [job.reset, onFileChange],
  )

  // Accept a file handed over from the home page uploader.
  useEffect(() => {
    const pending = takePendingFile()
    if (!pending) return
    try {
      acceptFile(validateFile(pending, profile))
    } catch (error) {
      notify.error(error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleReplaceChange = (event) => {
    const [next] = event.target.files ?? []
    event.target.value = ''
    if (!next) return
    try {
      acceptFile(validateFile(next, profile))
    } catch (error) {
      notify.error(error)
    }
  }

  const clearFile = () => {
    job.reset()
    setFile(null)
    onFileChange?.(null)
  }

  const isAllowed = typeof canProcess === 'function' ? Boolean(meta.data || !loadMeta) && canProcess({ file, meta: meta.data }) : canProcess

  const handleProcessStart = () => {
    if (!file || !isAllowed || job.isProcessing) return
    job.run(({ signal, onProgress }) => onProcess({ file, meta: meta.data, signal, onProgress }), { fileName: file.name })
  }

  // -------------------------------------------------------------- Empty
  if (!file) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <FileUploader profile={profile} onFiles={([next]) => acceptFile(next)} title={uploaderTitle} />
        <PrivacyNote className="mx-auto mt-4 max-w-md bg-transparent" />
      </motion.div>
    )
  }

  const hiddenReplaceInput = (
    <input ref={replaceInputRef} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" accept={getAcceptString(profile.types)} onChange={handleReplaceChange} />
  )

  // -------------------------------------------------------------- Result
  if (job.status === 'success' && job.result) {
    return (
      <motion.div key="result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        {renderResult({ file, meta: meta.data, result: job.result, reset: job.reset, startOver: clearFile })}
      </motion.div>
    )
  }

  const isBusy = job.isProcessing
  const metaReady = !loadMeta || meta.isSuccess

  let stage
  if (job.isProcessing) {
    stage = <ProcessingState title={processingTitle} progress={job.progress} stage={job.stage} onCancel={job.cancel} longRunning={longRunning} />
  } else if (meta.isError) {
    stage = <ErrorState error={meta.error} onRetry={() => meta.refetch()} secondaryAction={<Button variant="ghost" onClick={clearFile}>{t('common.chooseAnother')}</Button>} />
  } else if (job.status === 'error') {
    stage = (
      <ErrorState
        error={job.error}
        onRetry={handleProcessStart}
        secondaryAction={
          <Button variant="ghost" onClick={job.reset}>
            {t('common.backToSettings')}
          </Button>
        }
      />
    )
  } else if (!metaReady) {
    stage = <LoadingState label={t('common.readingFile')} />
  } else {
    stage = renderPreview({ file, meta: meta.data })
  }

  const showBareStage = !job.isProcessing && job.status !== 'error' && !meta.isError && metaReady

  return (
    <Stagger stagger={0.08} className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
      {hiddenReplaceInput}
      {/* Both columns are sticky: whichever is shorter stays in view while the taller one scrolls. */}
      <StaggerItem className="min-w-0 lg:sticky lg:top-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={job.status + String(meta.status)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {showBareStage ? stage : <MediaStage>{stage}</MediaStage>}
          </motion.div>
        </AnimatePresence>
      </StaggerItem>
      <StaggerItem className="lg:sticky lg:top-20">
      <SettingsPanel
        footer={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={actionIcon}
            onClick={handleProcessStart}
            loading={isBusy}
            disabled={!metaReady || !isAllowed || meta.isError}
          >
            {actionLabel}
          </Button>
        }
      >
        <FileCard file={file} meta={meta.data} onReplace={isBusy ? undefined : () => replaceInputRef.current?.click()} onRemove={isBusy ? undefined : clearFile} />
        <fieldset disabled={isBusy} className="flex min-w-0 flex-col gap-5 disabled:opacity-60">
          {metaReady && !meta.isError ? renderSettings({ file, meta: meta.data, disabled: isBusy }) : null}
        </fieldset>
        <PrivacyNote />
      </SettingsPanel>
      </StaggerItem>
    </Stagger>
  )
}
