import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Cpu, LayoutGrid, ShieldCheck, Upload, UserRoundX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { getCategoryPath, getPopularTools, getSuggestedToolsForKind, getToolsByCategory } from '@/constants/tools'
import { getFileKind } from '@/lib/files'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { usePendingFileStore } from '@/store/pendingFileStore'
import { Button } from '@/components/ui/Button'
import { FileCard } from '@/components/media/FileCard'
import { FileUploader } from '@/components/media/FileUploader'
import { SortableToolGrid } from '@/components/media/SortableToolGrid'
import { Stagger, StaggerItem } from '@/components/ui/Stagger'

// Stable arrays so ordering hooks don't recompute every render.
const POPULAR_TOOLS = getPopularTools()
const CATEGORY_TOOLS = Object.fromEntries(['ai', 'image', 'video', 'pdf'].map((category) => [category, getToolsByCategory(category).filter((tool) => tool.status !== 'soon').slice(0, 12)]))

function SectionHeader({ title, description, action }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** After a drop on the home page, suggest the tools that fit the file. */
function ToolChooser({ file, onClear }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setPendingFile = usePendingFileStore((state) => state.setPendingFile)
  const kind = getFileKind(file)
  const tools = getSuggestedToolsForKind(kind)

  const handleToolSelect = (tool) => {
    setPendingFile(file)
    navigate(tool.path)
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="rounded-lg border border-border bg-surface p-4">
      <FileCard file={file} onRemove={onClear} className="border-0 bg-surface-2 p-2" />
      <p className="mb-2.5 mt-4 text-[13px] font-medium text-text">{t('home.chooseTool')}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleToolSelect(tool)}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-start text-[13px] font-medium text-text outline-none transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon size={15} className="shrink-0 text-muted" aria-hidden="true" />
              <span className="truncate">{t(`tools.${tool.id}.title`)}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const pickerRef = useRef(null)

  useDocumentMeta({ title: `${t('app.name')} — ${t('home.seoTitle')}`, description: t('home.seoDescription'), path: '/' })

  const scrollToTools = () => document.getElementById('popular-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-8 pb-12 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 lg:pb-16 lg:pt-16">
        <Stagger stagger={0.07}>
          <StaggerItem as="p" className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t('home.eyebrow')}</StaggerItem>
          <StaggerItem as="h1" className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-tight text-text sm:text-4xl sm:leading-[1.12]">{t('home.headline')}</StaggerItem>
          <StaggerItem as="p" className="mt-4 max-w-md text-[15px] leading-relaxed text-muted sm:text-base">{t('home.subtitle')}</StaggerItem>
          <StaggerItem className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button variant="primary" size="lg" leftIcon={Upload} onClick={() => pickerRef.current?.open()}>
              {t('home.primaryCta')}
            </Button>
            <Button variant="secondary" size="lg" leftIcon={LayoutGrid} onClick={scrollToTools}>
              {t('home.secondaryCta')}
            </Button>
          </StaggerItem>
          <StaggerItem as="ul" className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
            <li className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-success" aria-hidden="true" />
              {t('home.points.private')}
            </li>
            <li className="flex items-center gap-1.5">
              <UserRoundX size={15} className="text-text-2" aria-hidden="true" />
              {t('home.points.noAccount')}
            </li>
          </StaggerItem>
        </Stagger>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.18, ease: [0.2, 0.8, 0.2, 1] }}>
          <AnimatePresence mode="wait" initial={false}>
            {file ? (
              <ToolChooser key="chooser" file={file} onClear={() => setFile(null)} />
            ) : (
              <motion.div key="uploader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <FileUploader profile={UPLOAD_PROFILES.any} onFiles={([next]) => setFile(next)} variant="hero" title={t('upload.drop.files')} pickerRef={pickerRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      <section id="popular-tools" className="scroll-mt-20 pb-12">
        <SectionHeader title={t('home.popularTools')} />
        <SortableToolGrid listKey="home:popular" tools={POPULAR_TOOLS} inView className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" />
      </section>

      {['ai', 'image', 'video', 'pdf'].map((category) => (
        <section key={category} className="pb-12">
          <SectionHeader
            title={t(`categories.${category}.title`)}
            description={t(`categories.${category}.description`)}
            action={
              <Button as={Link} to={getCategoryPath(category)} variant="link" size="sm" rightIcon={ArrowRight} className="text-[13px]">
                {t('common.viewAll')}
              </Button>
            }
          />
          <SortableToolGrid listKey={`home:${category}`} tools={CATEGORY_TOOLS[category]} compact inView className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" />
        </section>
      ))}

      <Stagger as="section" inView stagger={0.08} className="mb-16 grid overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-3">
        {[
          { icon: ShieldCheck, key: 'private' },
          { icon: Cpu, key: 'fast' },
          { icon: UserRoundX, key: 'free' },
        ].map(({ icon: Icon, key }, index) => (
          <StaggerItem key={key} className={index > 0 ? 'border-t border-border p-5 sm:border-s sm:border-t-0' : 'p-5'}>
            <Icon size={18} className="text-primary" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-text">{t(`home.features.${key}.title`)}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{t(`home.features.${key}.description`)}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
