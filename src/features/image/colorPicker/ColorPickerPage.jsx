import { useMemo, useRef, useState } from 'react'
import { Copy, Pipette, RotateCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { copyToClipboard } from '@/lib/download'
import { notify } from '@/lib/notify'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { createCanvas, getContext } from '@/services/image/canvas'
import { describeColor, extractPalette } from '@/services/image/colorService'
import { useRecentJobsStore } from '@/store/recentJobsStore'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsPanel, SettingsSection } from '@/components/layout/Panels'
import { FileCard } from '@/components/media/FileCard'
import { FileUploader } from '@/components/media/FileUploader'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { LoadingState } from '@/components/feedback/States'

const TOOL_ID = 'image-color-picker'

function ColorRow({ color, onRemove }) {
  const { t } = useTranslation()
  const copy = async (value) => {
    await copyToClipboard(value)
    notify.success('toasts.colorCopied', { values: { value } })
  }
  return (
    <li className="flex items-center gap-2.5 py-1.5">
      <span className="size-8 shrink-0 rounded-md ring-1 ring-inset ring-black/10" style={{ background: color.hex }} />
      <div className="min-w-0 flex-1" dir="ltr">
        <button type="button" onClick={() => copy(color.hex)} className="block font-mono text-[13px] font-medium text-text hover:text-primary">
          {color.hex}
        </button>
        <button type="button" onClick={() => copy(color.rgb)} className="block truncate font-mono text-2xs text-muted hover:text-text">
          {color.rgb} · {color.hsl}
        </button>
      </div>
      <IconButton icon={Copy} label={t('common.copy')} size="xs" onClick={() => copy(color.hex)} />
      {onRemove && <IconButton icon={Trash2} label={t('common.remove')} size="xs" variant="danger-ghost" onClick={onRemove} />}
    </li>
  )
}

function PickerCanvas({ bitmap, onPick, onHover }) {
  const { t } = useTranslation()
  const sampler = useMemo(() => {
    if (!bitmap) return null
    const canvas = createCanvas(bitmap.width, bitmap.height)
    const context = getContext(canvas, { willReadFrequently: true })
    context.drawImage(bitmap, 0, 0)
    return context.getImageData(0, 0, canvas.width, canvas.height)
  }, [bitmap])
  const imgRef = useRef(null)
  const url = useMemo(() => {
    if (!bitmap) return null
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d').drawImage(bitmap, 0, 0)
    return canvas.toDataURL('image/png')
  }, [bitmap])

  const sampleAt = (event) => {
    const rect = imgRef.current.getBoundingClientRect()
    const x = Math.min(sampler.width - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * sampler.width)))
    const y = Math.min(sampler.height - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * sampler.height)))
    const index = (y * sampler.width + x) * 4
    return describeColor(sampler.data[index], sampler.data[index + 1], sampler.data[index + 2])
  }

  if (!bitmap || !url) {
    return (
      <MediaStage>
        <LoadingState />
      </MediaStage>
    )
  }
  return (
    <MediaStage checkerboard>
      <img
        ref={imgRef}
        src={url}
        alt={t('colorPicker.imageAlt')}
        className="max-h-[62vh] max-w-full cursor-crosshair object-contain"
        onPointerMove={(event) => onHover(sampleAt(event))}
        onPointerLeave={() => onHover(null)}
        onClick={(event) => onPick(sampleAt(event))}
        draggable={false}
      />
    </MediaStage>
  )
}

export default function ColorPickerPage() {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [picked, setPicked] = useState([])
  const { bitmap } = usePreviewBitmap(file, 1200)
  const addJob = useRecentJobsStore((state) => state.addJob)

  const palette = useMemo(() => {
    if (!bitmap) return []
    const size = 96
    const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
    const canvas = createCanvas(Math.max(1, bitmap.width * scale), Math.max(1, bitmap.height * scale))
    const context = getContext(canvas, { willReadFrequently: true })
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return extractPalette(context.getImageData(0, 0, canvas.width, canvas.height), 8)
  }, [bitmap])

  const handlePick = (color) => {
    setPicked((current) => [color, ...current.filter((item) => item.hex !== color.hex)].slice(0, 12))
    copyToClipboard(color.hex).then(() => notify.success('toasts.colorCopied', { values: { value: color.hex } }))
  }

  const handleFile = ([next]) => {
    setFile(next)
    setPicked([])
    addJob({ toolId: TOOL_ID, fileName: next.name, status: 'completed' })
  }

  if (!file) {
    return (
      <ToolLayout toolId={TOOL_ID}>
        <FileUploader profile={UPLOAD_PROFILES.image} onFiles={handleFile} />
        <PrivacyNote className="mx-auto mt-4 max-w-md bg-transparent" />
      </ToolLayout>
    )
  }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="min-w-0">
          <PickerCanvas bitmap={bitmap} onPick={handlePick} onHover={setHovered} />
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Pipette size={13} aria-hidden="true" />
            {t('colorPicker.hint')}
          </p>
        </div>
        <SettingsPanel>
          <FileCard file={file} onRemove={() => setFile(null)} />
          <SettingsSection title={t('colorPicker.current')}>
            <div className="flex items-center gap-3 rounded-md bg-surface-2 p-2.5">
              <span className="size-10 shrink-0 rounded-md ring-1 ring-inset ring-black/10" style={{ background: hovered?.hex ?? 'transparent' }} />
              <div className="min-w-0 font-mono text-xs" dir="ltr">
                <p className="text-[13px] font-medium text-text">{hovered?.hex ?? '—'}</p>
                <p className="truncate text-muted">{hovered?.rgb ?? t('colorPicker.hoverHint')}</p>
              </div>
            </div>
          </SettingsSection>
          <SettingsSection
            title={t('colorPicker.picked')}
            action={
              picked.length > 0 && (
                <Button variant="ghost" size="xs" leftIcon={RotateCcw} onClick={() => setPicked([])}>
                  {t('common.clear')}
                </Button>
              )
            }
          >
            {picked.length ? (
              <ul className="-my-1.5">
                {picked.map((color) => (
                  <ColorRow key={color.hex} color={color} onRemove={() => setPicked((current) => current.filter((item) => item.hex !== color.hex))} />
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted">{t('colorPicker.noneYet')}</p>
            )}
          </SettingsSection>
          <SettingsSection title={t('colorPicker.palette')}>
            <div className="flex h-8 overflow-hidden rounded-md ring-1 ring-inset ring-black/10">
              {palette.map((color) => (
                <button key={color.hex} type="button" title={color.hex} aria-label={color.hex} onClick={() => handlePick(color)} className="h-full flex-1 outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ background: color.hex }} />
              ))}
            </div>
            <ul className="-my-1.5">
              {palette.slice(0, 5).map((color) => (
                <ColorRow key={color.hex} color={color} />
              ))}
            </ul>
          </SettingsSection>
        </SettingsPanel>
      </div>
    </ToolLayout>
  )
}
