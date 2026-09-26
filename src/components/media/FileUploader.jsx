import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CloudUpload, FileVideo, ImagePlus, Music } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { getAcceptString } from '@/constants/fileConstraints'
import { AppError, ERROR_CODES } from '@/lib/errors'
import { validateFile } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/misc'

const KIND_ICONS = { image: ImagePlus, video: FileVideo, audio: Music, any: CloudUpload }

/**
 * Reusable upload surface: drag & drop, click to browse (hidden native input),
 * and clipboard paste. Files are validated against a centralized upload
 * profile before anything is decoded.
 *
 * @param {object} props
 * @param {object} props.profile one of UPLOAD_PROFILES
 * @param {(files: File[]) => void} props.onFiles
 * @param {boolean} [props.multiple]
 * @param {number} [props.maxFiles]
 * @param {'default'|'compact'|'hero'} [props.variant]
 * @param {React.Ref} [props.pickerRef] exposes { open() }
 */
export function FileUploader({ profile, onFiles, multiple = false, maxFiles = 1, variant = 'default', title, className, pasteEnabled = true, disabled = false, pickerRef }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const inputId = useId()
  const Icon = KIND_ICONS[profile.kind] ?? CloudUpload

  const handleFiles = useCallback(
    (fileList) => {
      const files = [...(fileList ?? [])]
      if (!files.length || disabled) return
      if (files.length > maxFiles) {
        notify.error(new AppError(ERROR_CODES.TOO_MANY_FILES, { max: maxFiles }))
      }
      const valid = []
      for (const file of files.slice(0, maxFiles)) {
        try {
          valid.push(validateFile(file, profile))
        } catch (error) {
          notify.error(error)
        }
      }
      if (valid.length) {
        setAccepted(true)
        setTimeout(() => setAccepted(false), 400)
        onFiles(multiple ? valid : [valid[0]])
      }
    },
    [disabled, maxFiles, multiple, onFiles, profile],
  )

  // Paste from clipboard anywhere on the page while this uploader is mounted.
  useEffect(() => {
    if (!pasteEnabled || disabled) return undefined
    const handlePaste = (event) => {
      const target = event.target
      if (target instanceof HTMLElement && (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)) return
      const files = [...(event.clipboardData?.files ?? [])]
      if (files.length) {
        event.preventDefault()
        handleFiles(files)
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [disabled, handleFiles, pasteEnabled])

  const dragHandlers = {
    onDragEnter: (event) => {
      event.preventDefault()
      dragDepth.current += 1
      setIsDragging(true)
    },
    onDragOver: (event) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    },
    onDragLeave: (event) => {
      event.preventDefault()
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setIsDragging(false)
    },
    onDrop: (event) => {
      event.preventDefault()
      dragDepth.current = 0
      setIsDragging(false)
      handleFiles(event.dataTransfer.files)
    },
  }

  const openPicker = () => !disabled && inputRef.current?.click()
  // Lets surrounding UI (e.g. a hero CTA) open the file dialog.
  useImperativeHandle(pickerRef, () => ({ open: openPicker }))
  const kindKey = profile.kind === 'any' ? 'files' : profile.kind === 'image' ? (multiple ? 'images' : 'image') : profile.kind === 'video' ? (multiple ? 'videos' : 'video') : 'audio'
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

  return (
    <motion.div
      {...dragHandlers}
      animate={{ scale: accepted ? 0.99 : 1 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border border-dashed text-center transition-colors duration-[var(--duration-base)]',
        variant === 'compact' ? 'gap-2 px-4 py-6' : variant === 'hero' ? 'gap-3 px-6 py-12 sm:py-14' : 'gap-3 px-6 py-14 sm:py-20',
        isDragging ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface hover:border-muted/60',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        accept={getAcceptString(profile.types)}
        multiple={multiple}
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <div
        className={cn(
          'flex items-center justify-center rounded-lg ring-1 ring-inset transition-colors',
          variant === 'compact' ? 'size-9' : 'size-11',
          isDragging ? 'bg-surface text-primary ring-primary/30' : 'bg-surface-2 text-text-2 ring-border',
        )}
      >
        <Icon size={variant === 'compact' ? 18 : 20} aria-hidden="true" />
      </div>
      <div>
        <p className={cn('font-semibold text-text', variant === 'compact' ? 'text-sm' : 'text-[15px]')}>
          {isDragging ? t('upload.releaseToUpload') : (title ?? t(`upload.drop.${kindKey}`))}
        </p>
        <p className="mt-1 text-[13px] text-muted">{t('upload.or')}</p>
      </div>
      <Button variant={variant === 'hero' ? 'primary' : 'secondary'} size={variant === 'compact' ? 'sm' : 'md'} onClick={openPicker} aria-controls={inputId}>
        {t('upload.browse')}
      </Button>
      <p className="text-xs text-muted">
        {t('upload.constraints', { formats: profile.formatsLabel, size: formatBytes(profile.maxSize) })}
      </p>
      {pasteEnabled && variant !== 'compact' && (
        <p className="hidden items-center gap-1.5 text-xs text-faint sm:flex">
          {t('upload.pasteHint')}
          <span className="inline-flex items-center gap-0.5" dir="ltr">
            <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>V</Kbd>
          </span>
        </p>
      )}
    </motion.div>
  )
}
