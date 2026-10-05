import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, ImagePlus, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Slider } from '@/components/ui/Slider'
import { Textarea } from '@/components/ui/Textarea'
import { SECTION_TYPES, createItem, createSection } from './resumeModel'

const PERSONAL_FIELDS = ['fullName', 'title', 'email', 'phone', 'location', 'website', 'linkedin', 'github']
const MULTILINE = ['description']

/** Downscale a chosen photo to a small JPEG data URL so it can be saved with the resume. */
async function photoToDataUrl(file) {
  const bitmap = await createImageBitmap(file)
  const size = 360
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d').drawImage(bitmap, (size - bitmap.width * scale) / 2, (size - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

/** "Improve with AI" menu next to a text field. */
function AiImprove({ onImprove, busy, modes = ['bullets', 'shorter', 'grammar'] }) {
  const { t } = useTranslation()
  return (
    <Dropdown
      trigger={
        <Button variant="ghost" size="xs" leftIcon={Sparkles} loading={busy} className="text-primary">
          {t('resume.ai.improve')}
        </Button>
      }
      items={modes.map((mode) => ({ id: mode, label: t(`resume.ai.modes.${mode}`), onSelect: () => onImprove(mode) }))}
    />
  )
}

function Card({ id, title, subtitle, open, onToggle, actions, children, highlighted }) {
  return (
    <div id={id} className={cn('scroll-mt-24 overflow-hidden rounded-lg border bg-surface transition-colors', highlighted ? 'border-primary ring-2 ring-primary/30' : 'border-border')}>
      <div className="flex items-center gap-1 pe-2">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <ChevronDown size={15} className={cn('shrink-0 text-muted transition-transform', !open && '-rotate-90 rtl:rotate-90')} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-text">{title}</span>
            {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
          </span>
        </button>
        {actions}
      </div>
      {open && <div className="flex flex-col gap-3 border-t border-border p-3">{children}</div>}
    </div>
  )
}

function ItemFields({ section, item, onChange, ai }) {
  const { t } = useTranslation()
  const fields = SECTION_TYPES[section.type].fields
  if (section.type === 'skills') {
    return (
      <div className="grid grid-cols-[1fr_130px] items-end gap-2">
        <Input label={t('resume.fields.name')} value={item.name} onChange={(event) => onChange({ name: event.target.value })} />
        <Slider label={t('resume.fields.level')} value={Number(item.level) || 0} min={1} max={5} onChange={(level) => onChange({ level })} formatValue={(value) => `${value}/5`} />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) =>
        MULTILINE.includes(field) ? (
          <div key={field} className="col-span-2 flex flex-col gap-1">
            <Textarea
              label={t('resume.fields.description')}
              description={t('resume.descriptionHint')}
              value={item.description}
              onChange={(event) => onChange({ description: event.target.value })}
              textareaClassName="min-h-24"
              dir="auto"
              labelAction={ai && item.description?.trim() ? <AiImprove busy={ai.busyId === item.id} onImprove={(mode) => ai.improve(item.id, item.description, mode, (text) => onChange({ description: text }))} /> : null}
            />
          </div>
        ) : (
          <Input
            key={field}
            label={t(`resume.fields.${field}`)}
            value={item[field] ?? ''}
            onChange={(event) => onChange({ [field]: event.target.value })}
            className={['role', 'degree', 'name', 'title', 'company', 'school'].includes(field) && fields.length > 2 ? 'col-span-2 sm:col-span-1' : undefined}
            dir="auto"
          />
        ),
      )}
    </div>
  )
}

/**
 * Content editor: personal details and every section, with add / remove /
 * reorder for sections and items. `focusId` opens and highlights the card the
 * user clicked in the preview.
 */
export function ResumeEditor({ resume, onChange, focusId, ai }) {
  const { t } = useTranslation()
  const [openIds, setOpenIds] = useState(() => new Set(['personal', resume.sections[0]?.id]))
  const photoRef = useRef(null)
  const isOpen = (id) => openIds.has(id) || focusId === id
  const toggle = (id) =>
    setOpenIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const setPersonal = (patch) => onChange({ ...resume, personal: { ...resume.personal, ...patch } })
  const setSections = (sections) => onChange({ ...resume, sections })
  const updateSection = (id, patch) => setSections(resume.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)))
  const moveInList = (list, index, delta) => {
    const next = [...list]
    const target = index + delta
    if (target < 0 || target >= list.length) return list
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  }

  return (
    <div className="flex flex-col gap-2.5">
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (event) => {
          const [file] = event.target.files ?? []
          event.target.value = ''
          if (!file) return
          try {
            setPersonal({ photo: await photoToDataUrl(file) })
          } catch (error) {
            notify.error(error)
          }
        }}
      />
      <Card id="edit-personal" title={t('resume.personal')} subtitle={resume.personal.fullName} open={isOpen('personal')} onToggle={() => toggle('personal')} highlighted={focusId === 'personal'}>
        <div className="flex items-center gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
            {resume.personal.photo ? <img src={resume.personal.photo} alt="" className="size-full object-cover" /> : <ImagePlus size={20} className="text-muted" aria-hidden="true" />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" leftIcon={ImagePlus} onClick={() => photoRef.current?.click()}>
              {resume.personal.photo ? t('resume.changePhoto') : t('resume.addPhoto')}
            </Button>
            {resume.personal.photo && (
              <Button variant="ghost" size="sm" leftIcon={X} onClick={() => setPersonal({ photo: null })}>
                {t('common.remove')}
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PERSONAL_FIELDS.map((field) => (
            <Input key={field} label={t(`resume.fields.${field}`)} value={resume.personal[field] ?? ''} onChange={(event) => setPersonal({ [field]: event.target.value })} dir="auto" />
          ))}
        </div>
        <Textarea
          label={t('resume.fields.summary')}
          value={resume.personal.summary}
          onChange={(event) => setPersonal({ summary: event.target.value })}
          textareaClassName="min-h-24"
          dir="auto"
          labelAction={
            ai && resume.personal.summary?.trim() ? (
              <AiImprove busy={ai.busyId === 'summary'} modes={['summary', 'shorter', 'grammar']} onImprove={(mode) => ai.improve('summary', resume.personal.summary, mode, (text) => setPersonal({ summary: text }))} />
            ) : null
          }
        />
      </Card>

      {resume.sections.map((section, sectionIndex) => (
        <Card
          key={section.id}
          id={`edit-${section.id}`}
          title={section.title || t(`resume.types.${section.type}`)}
          subtitle={t('resume.itemCount', { count: section.items.length })}
          open={isOpen(section.id)}
          onToggle={() => toggle(section.id)}
          highlighted={focusId === section.id}
          actions={
            <div className="flex shrink-0 items-center">
              <IconButton icon={section.visible ? Eye : EyeOff} label={t(section.visible ? 'resume.hideSection' : 'resume.showSection')} size="xs" onClick={() => updateSection(section.id, { visible: !section.visible })} />
              <IconButton icon={ArrowUp} label={t('merge.moveUp')} size="xs" disabled={sectionIndex === 0} onClick={() => setSections(moveInList(resume.sections, sectionIndex, -1))} />
              <IconButton icon={ArrowDown} label={t('merge.moveDown')} size="xs" disabled={sectionIndex === resume.sections.length - 1} onClick={() => setSections(moveInList(resume.sections, sectionIndex, 1))} />
              <IconButton icon={Trash2} label={t('resume.deleteSection')} size="xs" variant="danger-ghost" onClick={() => setSections(resume.sections.filter((entry) => entry.id !== section.id))} />
            </div>
          }
        >
          <Input label={t('resume.sectionTitle')} value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} dir="auto" />
          {section.items.map((item, itemIndex) => (
            <div key={item.id} className="rounded-md border border-border bg-surface-2/40 p-2.5">
              <div className="mb-2 flex items-center gap-1">
                <span className="tabular flex size-5 items-center justify-center rounded-sm bg-surface-2 text-2xs font-semibold text-muted">{itemIndex + 1}</span>
                <span className="flex-1" />
                <IconButton icon={ArrowUp} label={t('merge.moveUp')} size="xs" disabled={itemIndex === 0} onClick={() => updateSection(section.id, { items: moveInList(section.items, itemIndex, -1) })} />
                <IconButton icon={ArrowDown} label={t('merge.moveDown')} size="xs" disabled={itemIndex === section.items.length - 1} onClick={() => updateSection(section.id, { items: moveInList(section.items, itemIndex, 1) })} />
                <IconButton icon={X} label={t('common.remove')} size="xs" variant="danger-ghost" onClick={() => updateSection(section.id, { items: section.items.filter((entry) => entry.id !== item.id) })} />
              </div>
              <ItemFields section={section} item={item} ai={ai} onChange={(patch) => updateSection(section.id, { items: section.items.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)) })} />
            </div>
          ))}
          <Button variant="secondary" size="sm" leftIcon={Plus} className="self-start" onClick={() => updateSection(section.id, { items: [...section.items, createItem(section.type)] })}>
            {t('resume.addItem')}
          </Button>
        </Card>
      ))}

      <Dropdown
        trigger={
          <Button variant="secondary" leftIcon={Plus} className="self-start">
            {t('resume.addSection')}
          </Button>
        }
        items={Object.keys(SECTION_TYPES).map((type) => ({
          id: type,
          label: t(`resume.types.${type}`),
          onSelect: () => {
            const section = createSection(type, t(`resume.types.${type}`))
            setSections([...resume.sections, section])
            setOpenIds((current) => new Set([...current, section.id]))
          },
        }))}
      />
    </div>
  )
}
