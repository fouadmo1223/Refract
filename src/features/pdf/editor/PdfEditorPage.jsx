import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eraser,
  Highlighter,
  ImagePlus,
  Link2,
  Minus,
  MousePointer2,
  PenLine,
  Redo2,
  Save,
  Square,
  TextCursorInput,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { UPLOAD_PROFILES, getAcceptString } from '@/constants/fileConstraints'
import { validateFile } from '@/lib/files'
import { notify } from '@/lib/notify'
import { useHistoryState } from '@/hooks/useHistoryState'
import { useHotkey } from '@/hooks/useHotkey'
import { useProcessingJob } from '@/hooks/useProcessingJob'
import { exportEditedPdf, getTextItems } from '@/services/pdf/pdfEditService'
import { openPdf } from '@/services/pdf/pdfService'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Tooltip } from '@/components/ui/Tooltip'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsPanel, SettingsSection } from '@/components/layout/Panels'
import { FileCard } from '@/components/media/FileCard'
import { FileUploader } from '@/components/media/FileUploader'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ProcessingState } from '@/components/media/ProcessingState'
import { ErrorState, LoadingState } from '@/components/feedback/States'
import { usePdfThumbnails } from '../shared/usePdfThumbnails'
import { PdfResult } from '../shared/PdfResults'
import { DEFAULT_STYLE, newId, translate } from './editorModel'
import { EditorStage } from './EditorStage'
import { PropertiesPanel, ShapeControls, TextControls } from './PropertiesPanel'

const TOOL_ID = 'pdf-editor'
const TOOL_BUTTONS = [
  { id: 'select', icon: MousePointer2 },
  { id: 'editText', icon: TextCursorInput },
  { id: 'text', icon: Type },
  { id: 'image', icon: ImagePlus },
  { id: 'rect', icon: Square },
  { id: 'ellipse', icon: Circle },
  { id: 'line', icon: Minus },
  { id: 'arrow', icon: ArrowUpRight },
  { id: 'draw', icon: PenLine },
  { id: 'highlight', icon: Highlighter },
  { id: 'whiteout', icon: Eraser },
  { id: 'link', icon: Link2 },
]

export default function PdfEditorPage() {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [pageSizes, setPageSizes] = useState([])
  const [pageIndex, setPageIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [tool, setTool] = useState('select')
  const [style, setStyle] = useState(DEFAULT_STYLE)
  const [selectedId, setSelectedId] = useState(null)
  const [textItems, setTextItems] = useState([])
  const [pendingImage, setPendingImage] = useState(null)
  const history = useHistoryState({})
  const imageInputRef = useRef(null)
  const job = useProcessingJob({ toolId: TOOL_ID, successMessage: 'toasts.pdfSaved' })
  const { pages: thumbs } = usePdfThumbnails(file, { width: 110 })

  const elementsByPage = history.value
  const elements = elementsByPage[pageIndex] ?? []
  const selected = elements.find((element) => element.id === selectedId) ?? null
  const editCount = Object.values(elementsByPage).reduce((sum, list) => sum + (list?.length ?? 0), 0)

  // Open the PDF and read every page's display size (points, rotation applied).
  useEffect(() => {
    if (!file) return undefined
    let cancelled = false
    let doc = null
    setLoadError(null)
    openPdf(file)
      .then(async (opened) => {
        doc = opened
        const sizes = []
        for (let number = 1; number <= opened.numPages; number += 1) {
          const viewport = (await opened.getPage(number)).getViewport({ scale: 1 })
          sizes.push({ width: viewport.width, height: viewport.height })
        }
        if (cancelled) return opened.destroy()
        setPageSizes(sizes)
        setPdf(opened)
      })
      .catch((error) => !cancelled && setLoadError(error))
    return () => {
      cancelled = true
      doc?.destroy()
      setPdf(null)
    }
  }, [file])

  // Existing text runs for "Edit text".
  useEffect(() => {
    if (!pdf || tool !== 'editText') return undefined
    let cancelled = false
    getTextItems(pdf, pageIndex + 1)
      .then((items) => !cancelled && setTextItems(items))
      .catch(() => !cancelled && setTextItems([]))
    return () => {
      cancelled = true
    }
  }, [pdf, pageIndex, tool])

  const setPageElements = (list, commit) => (commit ? history.commit : history.set)({ ...elementsByPage, [pageIndex]: list })
  const updateSelected = (next) => setPageElements(elements.map((element) => (element.id === next.id ? next : element)), true)
  const removeSelected = () => {
    if (!selected) return
    setPageElements(
      elements.filter((element) => element.id !== selected.id),
      true,
    )
    setSelectedId(null)
  }
  const move = (delta) => {
    const index = elements.findIndex((element) => element.id === selectedId)
    const target = index + delta
    if (index < 0 || target < 0 || target >= elements.length) return
    const next = [...elements]
    ;[next[index], next[target]] = [next[target], next[index]]
    setPageElements(next, true)
  }

  const typing = () => ['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)
  useHotkey('mod+z', history.undo, { enabled: Boolean(pdf) })
  useHotkey('mod+shift+z', history.redo, { enabled: Boolean(pdf) })
  useHotkey('mod+y', history.redo, { enabled: Boolean(pdf) })
  useHotkey('delete', () => !typing() && removeSelected(), { enabled: Boolean(selected) })
  useHotkey('backspace', () => !typing() && removeSelected(), { enabled: Boolean(selected) })
  useHotkey(
    'escape',
    () => {
      setSelectedId(null)
      setTool('select')
      setPendingImage(null)
    },
    { enabled: Boolean(pdf), allowInInputs: true },
  )

  const chooseTool = (id) => {
    setPendingImage(null)
    if (id === 'image') {
      imageInputRef.current?.click()
      return
    }
    setTool(id)
    if (id !== 'select') setSelectedId(null)
  }

  const handleImagePicked = async (event) => {
    const [picked] = event.target.files ?? []
    event.target.value = ''
    if (!picked) return
    try {
      validateFile(picked, UPLOAD_PROFILES.image)
      const bitmap = await createImageBitmap(picked)
      setPendingImage({ blob: picked, width: bitmap.width * 0.75, height: bitmap.height * 0.75 })
      bitmap.close()
      setTool('select')
      notify.info('toasts.clickToPlace')
    } catch (error) {
      notify.error(error)
    }
  }

  // "Edit text": cover the original run and drop an editable copy on top.
  const editExistingText = (item) => {
    const pad = item.fontSize * 0.12
    const cover = { id: newId(), type: 'whiteout', x: item.x - pad, y: item.y - pad, width: item.width + pad * 2, height: item.height + pad * 2, fill: '#FFFFFF', opacity: 1 }
    const text = {
      id: newId(),
      type: 'text',
      text: item.text,
      x: item.x,
      y: item.y,
      width: Math.max(item.width + item.fontSize, 40),
      height: item.height,
      fontFamily: item.fontFamily,
      fontSize: Math.round(item.fontSize * 10) / 10,
      bold: item.bold,
      italic: item.italic,
      underline: false,
      color: '#111111',
      align: 'left',
      lineHeight: 1.15,
      background: 'transparent',
      opacity: 1,
    }
    setPageElements([...elements, cover, text], true)
    setSelectedId(text.id)
    setTool('select')
  }

  const handleSave = () => job.run(({ onProgress }) => exportEditedPdf(file, elementsByPage, { onProgress }), { fileName: file.name })
  const startOver = () => {
    job.reset()
    setFile(null)
    history.reset({})
    setSelectedId(null)
    setPageIndex(0)
  }

  if (!file) {
    return (
      <ToolLayout toolId={TOOL_ID}>
        <FileUploader
          profile={UPLOAD_PROFILES.pdf}
          onFiles={([next]) => {
            history.reset({})
            setPageIndex(0)
            setFile(next)
          }}
        />
        <PrivacyNote className="mx-auto mt-4 max-w-md bg-transparent" />
      </ToolLayout>
    )
  }

  if (job.status === 'success' && job.result) {
    return (
      <ToolLayout toolId={TOOL_ID}>
        <PdfResult file={file} result={job.result} reset={job.reset} startOver={startOver} title={t('pdfEditor.saved')} suffix="edited" showSizeChange={false} />
      </ToolLayout>
    )
  }

  const pageSize = pageSizes[pageIndex]
  const toolStyleControls =
    tool === 'text' ? (
      <TextControls value={style} onChange={(patch) => setStyle((current) => ({ ...current, ...patch }))} />
    ) : ['rect', 'ellipse', 'line', 'arrow', 'draw'].includes(tool) ? (
      <ShapeControls value={style} onChange={(patch) => setStyle((current) => ({ ...current, ...patch }))} fill={tool === 'rect' || tool === 'ellipse'} />
    ) : null

  return (
    <ToolLayout toolId={TOOL_ID}>
      <input ref={imageInputRef} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" accept={getAcceptString(UPLOAD_PROFILES.image.types)} onChange={handleImagePicked} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1.5" role="toolbar" aria-label={t('pdfEditor.tools')}>
            {TOOL_BUTTONS.map(({ id, icon: Icon }) => {
              const active = tool === id || (id === 'image' && pendingImage)
              return (
                <Tooltip key={id} content={t(`pdfEditor.toolNames.${id}`)}>
                  <button
                    type="button"
                    aria-label={t(`pdfEditor.toolNames.${id}`)}
                    aria-pressed={Boolean(active)}
                    onClick={() => chooseTool(id)}
                    className={cn('flex size-9 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', active ? 'bg-primary text-primary-fg' : 'text-text-2 hover:bg-surface-2 hover:text-text')}
                  >
                    <Icon size={17} aria-hidden="true" />
                  </button>
                </Tooltip>
              )
            })}
            <span className="mx-1 h-6 w-px bg-border" />
            <IconButton icon={Undo2} label={t('editor.undo')} size="sm" onClick={history.undo} disabled={!history.canUndo} />
            <IconButton icon={Redo2} label={t('editor.redo')} size="sm" onClick={history.redo} disabled={!history.canRedo} />
            <span className="flex-1" />
            <IconButton icon={ZoomOut} label={t('pdfEditor.zoomOut')} size="sm" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} />
            <span className="tabular w-11 text-center text-xs text-muted">{Math.round(zoom * 100)}%</span>
            <IconButton icon={ZoomIn} label={t('pdfEditor.zoomIn')} size="sm" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} />
          </div>

          {pendingImage && <p className="rounded-md bg-primary-soft px-3 py-2 text-[13px] text-primary-soft-fg">{t('pdfEditor.placeImage')}</p>}
          {tool === 'editText' && <p className="rounded-md bg-primary-soft px-3 py-2 text-[13px] text-primary-soft-fg">{t('pdfEditor.editTextHint')}</p>}

          <div className="flex gap-3">
            {/* Page thumbnails */}
            <ol className="scrollbar-thin hidden max-h-[78vh] w-24 shrink-0 flex-col gap-2 overflow-y-auto pe-1 md:flex">
              {pageSizes.map((size, index) => {
                const count = elementsByPage[index]?.length ?? 0
                return (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => {
                        setPageIndex(index)
                        setSelectedId(null)
                      }}
                      aria-current={index === pageIndex ? 'page' : undefined}
                      className={cn('relative block w-full overflow-hidden rounded-md bg-white ring-1 outline-none focus-visible:ring-2 focus-visible:ring-primary', index === pageIndex ? 'ring-2 ring-primary' : 'ring-border hover:ring-border-strong')}
                      style={{ aspectRatio: `${size.width} / ${size.height}` }}
                    >
                      {thumbs[index]?.url && <img src={thumbs[index].url} alt="" className="size-full object-contain" />}
                      <span className="tabular absolute bottom-0.5 start-0.5 rounded bg-black/55 px-1 text-[10px] text-white">{index + 1}</span>
                      {count > 0 && <span className="tabular absolute end-0.5 top-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-fg">{count}</span>}
                    </button>
                  </li>
                )
              })}
            </ol>

            <div className="min-w-0 flex-1">
              {loadError ? (
                <MediaStage>
                  <ErrorState error={loadError} />
                </MediaStage>
              ) : job.isProcessing ? (
                <MediaStage>
                  <ProcessingState title={t('processing.savingPdf')} progress={job.progress} stage={job.stage} onCancel={job.cancel} />
                </MediaStage>
              ) : pdf && pageSize ? (
                <EditorStage
                  pdf={pdf}
                  pageNumber={pageIndex + 1}
                  pageSize={pageSize}
                  zoom={zoom}
                  elements={elements}
                  onChange={(list) => setPageElements(list, false)}
                  onCommit={(list) => setPageElements(list, true)}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  tool={tool}
                  style={style}
                  textItems={textItems}
                  onEditText={editExistingText}
                  onToolDone={() => setTool('select')}
                  pendingImage={pendingImage}
                  onImagePlaced={() => setPendingImage(null)}
                />
              ) : (
                <MediaStage>
                  <LoadingState />
                </MediaStage>
              )}
              {pageSizes.length > 1 && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <IconButton icon={ChevronLeft} label={t('pdfEditor.previousPage')} size="sm" variant="secondary" disabled={pageIndex === 0} onClick={() => setPageIndex((value) => value - 1)} className="rtl:rotate-180" />
                  <span className="tabular text-[13px] text-text-2">{t('pdfEditor.pageOf', { page: pageIndex + 1, total: pageSizes.length })}</span>
                  <IconButton icon={ChevronRight} label={t('pdfEditor.nextPage')} size="sm" variant="secondary" disabled={pageIndex >= pageSizes.length - 1} onClick={() => setPageIndex((value) => value + 1)} className="rtl:rotate-180" />
                </div>
              )}
            </div>
          </div>
        </div>

        <SettingsPanel
          footer={
            <Button variant="primary" size="lg" fullWidth leftIcon={Save} onClick={handleSave} disabled={!editCount || !pdf} loading={job.isProcessing}>
              {t('tools.pdf-editor.action')}
            </Button>
          }
        >
          <FileCard file={file} meta={{ pages: pageSizes.length }} onRemove={job.isProcessing ? undefined : startOver} />
          {job.status === 'error' && <ErrorState error={job.error} onRetry={handleSave} />}
          {selected ? (
            <PropertiesPanel
              element={selected}
              onChange={updateSelected}
              onDelete={removeSelected}
              onDuplicate={() => {
                const copy = { ...translate(selected, 12, 12), id: newId() }
                setPageElements([...elements, copy], true)
                setSelectedId(copy.id)
              }}
              onForward={() => move(1)}
              onBackward={() => move(-1)}
            />
          ) : (
            <SettingsSection title={t(`pdfEditor.toolNames.${tool}`)} description={t(`pdfEditor.toolHints.${tool}`)}>
              {toolStyleControls}
            </SettingsSection>
          )}
          <SettingsSection title={t('pdfEditor.document')}>
            <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">{t('pdfEditor.editSummary', { count: editCount, pages: pageSizes.length })}</p>
            {elements.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setPageElements([], true)} className="self-start">
                {t('pdfEditor.clearPage')}
              </Button>
            )}
          </SettingsSection>
          <PrivacyNote />
        </SettingsPanel>
      </div>
    </ToolLayout>
  )
}
