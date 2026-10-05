import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Download, FileDown, FileJson, FileUp, ImageDown, MoreHorizontal, Printer, Redo2, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import '@fontsource/lora/400.css'
import '@fontsource/lora/700.css'
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/merriweather/400.css'
import '@fontsource/merriweather/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import { downloadBlob } from '@/lib/download'
import { notify } from '@/lib/notify'
import { useHistoryState } from '@/hooks/useHistoryState'
import { useHotkey } from '@/hooks/useHotkey'
import { useRecentJobsStore } from '@/store/recentJobsStore'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { IconButton } from '@/components/ui/IconButton'
import { Tabs } from '@/components/ui/Tabs'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { DEFAULT_DESIGN, PAPER, emptyResume, sampleResume } from './resumeModel'
import { improveText } from './resumeAi'
import { exportResumePdf, exportResumePng, printResume } from './resumeExport'
import { ResumeDocument } from './ResumeTemplates'
import { ResumeEditor } from './ResumeEditor'
import { ResumeDesign } from './ResumeDesign'
import { ResumeAiPanel } from './ResumeAiPanel'
import { usePollinationsKey } from '@/features/ai/shared/TextAiSettings'

const TOOL_ID = 'resume-builder'
const STORAGE_KEY = 'refract:resume'

function readSaved(language) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.resume?.personal && Array.isArray(saved.resume.sections)) return { resume: saved.resume, design: { ...DEFAULT_DESIGN, ...saved.design } }
  } catch {
    /* no saved resume */
  }
  return { resume: sampleResume(language), design: { ...DEFAULT_DESIGN, font: language === 'ar' ? 'arabic' : DEFAULT_DESIGN.font } }
}

/** Scaled live preview with page-break guides; clicking a part opens it in the editor. */
function Preview({ resume, design, labels, onPick }) {
  const { t } = useTranslation()
  const wrapRef = useRef(null)
  const docRef = useRef(null)
  const [available, setAvailable] = useState(600)
  const [height, setHeight] = useState(PAPER.a4.height)
  const paper = PAPER[design.paper] ?? PAPER.a4
  const scale = Math.min(1.1, available / paper.width)

  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width))
    observer.observe(wrapRef.current)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => {
    const node = docRef.current
    if (!node) return undefined
    const observer = new ResizeObserver(() => setHeight(node.offsetHeight))
    observer.observe(node)
    return () => observer.disconnect()
  })

  const pages = Math.max(1, Math.ceil((height - 2) / paper.height))
  return (
    <div ref={wrapRef} className="w-full">
      <div className="relative mx-auto" style={{ width: paper.width * scale, height: height * scale }}>
        <div
          className="absolute start-0 top-0 origin-top-left cursor-pointer shadow-[0_2px_16px_rgba(0,0,0,0.18)] rtl:origin-top-right"
          style={{ transform: `scale(${scale})` }}
          onClick={(event) => {
            const target = event.target.closest('[data-section-id]')
            if (target && !event.target.closest('a')) onPick(target.dataset.sectionId)
          }}
          title={t('resume.clickToEdit')}
        >
          <ResumeDocument resume={resume} design={design} labels={labels} documentRef={docRef} />
        </div>
        {Array.from({ length: pages - 1 }, (_, index) => (
          <div key={index} className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-primary/60" style={{ top: (index + 1) * paper.height * scale }}>
            <span className="absolute end-1 -top-5 rounded bg-primary px-1.5 text-[10px] font-medium text-primary-fg">{t('resume.pageBreak', { page: index + 2 })}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted">{t('resume.pages', { count: pages })}</p>
    </div>
  )
}

export default function ResumeBuilderPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language?.startsWith('ar') ? 'ar' : 'en'
  const [initial] = useState(() => readSaved(language))
  const history = useHistoryState(initial)
  const { resume, design } = history.value
  const [tab, setTab] = useState('content')
  const [focusId, setFocusId] = useState(null)
  const [exporting, setExporting] = useState(null)
  const [aiModel, setAiModel] = useState(null)
  const [aiBusyId, setAiBusyId] = useState(null)
  const exportRef = useRef(null)
  const importRef = useRef(null)
  const typingTimer = useRef(null)
  const apiKey = usePollinationsKey()
  const addJob = useRecentJobsStore((state) => state.addJob)
  const labels = { contact: t('resume.labels.contact'), profile: t('resume.labels.profile') }
  const paper = PAPER[design.paper] ?? PAPER.a4

  // Autosave (debounced) so the resume survives reloads.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
      } catch {
        /* storage full or unavailable */
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [history.value])

  // Typing updates live; a history step is committed after a short pause.
  const setResume = (next) => {
    history.set({ resume: next, design })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => history.commit(), 600)
  }
  const setDesign = (next) => history.commit({ resume, design: next })
  const replaceResume = (next) => history.commit({ resume: next, design })

  useHotkey('mod+z', history.undo)
  useHotkey('mod+shift+z', history.redo)
  useHotkey('mod+y', history.redo)

  const ai = apiKey
    ? {
        busyId: aiBusyId,
        improve: async (id, text, mode, apply) => {
          setAiBusyId(id)
          try {
            apply(await improveText({ apiKey, model: aiModel, text, mode, role: resume.personal.title, language: /[؀-ۿ]/.test(text) ? 'ar' : 'en' }))
          } catch (error) {
            notify.error(error)
          } finally {
            setAiBusyId(null)
          }
        },
      }
    : null

  const pick = (id) => {
    setTab('content')
    setFocusId(id)
    requestAnimationFrame(() => document.getElementById(`edit-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    setTimeout(() => setFocusId((current) => (current === id ? null : current)), 1800)
  }

  const fileBase = (resume.personal.fullName || 'resume').trim().replace(/\s+/g, '-').toLowerCase()
  const runExport = async (kind) => {
    setExporting(kind)
    try {
      const node = exportRef.current
      if (kind === 'pdf') downloadBlob(await exportResumePdf(node, { pageHeight: paper.height, title: resume.personal.fullName }), `${fileBase}-resume.pdf`)
      if (kind === 'png') downloadBlob(await exportResumePng(node), `${fileBase}-resume.png`)
      addJob({ toolId: TOOL_ID, fileName: `${fileBase}-resume.${kind}`, status: 'completed' })
      notify.success('toasts.downloadStarted')
    } catch (error) {
      notify.error(error)
    } finally {
      setExporting(null)
    }
  }

  const exportJson = () => downloadBlob(new Blob([JSON.stringify(history.value, null, 2)], { type: 'application/json' }), `${fileBase}-resume.json`)
  const importJson = async (event) => {
    const [file] = event.target.files ?? []
    event.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!data?.resume?.personal || !Array.isArray(data.resume.sections)) throw new Error('invalid')
      history.commit({ resume: data.resume, design: { ...DEFAULT_DESIGN, ...data.design } })
      notify.success('toasts.resumeImported')
    } catch {
      notify.error({ code: 'CORRUPTED_FILE' })
    }
  }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <input ref={importRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={importJson} />
      {/* Full-size copy used for PDF / PNG / print, kept off-screen. */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
        <ResumeDocument resume={resume} design={design} labels={labels} documentRef={exportRef} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Tabs
            variant="segmented"
            className="w-full [&>button]:flex-1 [&>button]:justify-center"
            aria-label={t('resume.panels')}
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'content', label: t('resume.tabs.content') },
              { value: 'design', label: t('resume.tabs.design') },
              { value: 'ai', label: t('resume.tabs.ai'), icon: Sparkles },
            ]}
          />
          {tab === 'content' && <ResumeEditor resume={resume} onChange={setResume} focusId={focusId} ai={ai} />}
          {tab === 'design' && <ResumeDesign resume={resume} design={design} labels={labels} onChange={setDesign} />}
          {tab === 'ai' && <ResumeAiPanel resume={resume} onApply={replaceResume} model={aiModel} onModelChange={setAiModel} />}
          {tab === 'content' && !ai && (
            <button type="button" onClick={() => setTab('ai')} className="flex items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary-soft/40 px-3 py-2.5 text-start text-[13px] text-primary-soft-fg hover:bg-primary-soft">
              <Sparkles size={15} aria-hidden="true" />
              {t('resume.ai.promo')}
            </button>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface p-1.5">
            <IconButton icon={Undo2} label={t('editor.undo')} size="sm" onClick={history.undo} disabled={!history.canUndo} />
            <IconButton icon={Redo2} label={t('editor.redo')} size="sm" onClick={history.redo} disabled={!history.canRedo} />
            <span className="flex-1" />
            <Dropdown
              trigger={<IconButton icon={MoreHorizontal} label={t('common.more')} size="sm" />}
              items={[
                { id: 'print', label: t('resume.printPdf'), icon: Printer, onSelect: () => printResume(exportRef.current, { paper: design.paper }) },
                { id: 'png', label: t('resume.downloadPng'), icon: ImageDown, onSelect: () => runExport('png') },
                { id: 'json', label: t('resume.exportJson'), icon: FileJson, onSelect: exportJson, separatorBefore: true },
                { id: 'import', label: t('resume.importJson'), icon: FileUp, onSelect: () => importRef.current?.click() },
                { id: 'sample', label: t('resume.loadSample'), icon: RotateCcw, onSelect: () => replaceResume(sampleResume(language)), separatorBefore: true },
                { id: 'empty', label: t('resume.startEmpty'), icon: FileDown, onSelect: () => replaceResume(emptyResume()) },
              ]}
            />
            <Button variant="primary" size="sm" leftIcon={Download} onClick={() => runExport('pdf')} loading={exporting === 'pdf'}>
              {t('resume.downloadPdf')}
            </Button>
          </div>
          <div className="scrollbar-thin max-h-[calc(100vh-9rem)] overflow-auto rounded-lg border border-border bg-surface-2 p-4">
            <Preview resume={resume} design={design} labels={labels} onPick={pick} />
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
