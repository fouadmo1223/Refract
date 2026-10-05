import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { SettingsSection } from '@/components/layout/Panels'
import { ACCENTS, FONT_PAIRS, PAPER, TEMPLATES } from './resumeModel'
import { ResumeDocument } from './ResumeTemplates'

const THUMB_WIDTH = 132

/** Live miniature of the user's own resume in each template. */
function TemplateThumb({ template, resume, design, labels, selected, onSelect }) {
  const { t } = useTranslation()
  const paper = PAPER[design.paper] ?? PAPER.a4
  const scale = THUMB_WIDTH / paper.width
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn('flex flex-col gap-1.5 rounded-lg p-1.5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', selected ? 'bg-primary-soft ring-2 ring-primary' : 'hover:bg-surface-2')}
    >
      <div className="relative overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10" style={{ width: THUMB_WIDTH, height: THUMB_WIDTH * 1.414 }} aria-hidden="true">
        <div className="pointer-events-none absolute start-0 top-0 origin-top-left rtl:origin-top-right" style={{ transform: `scale(${scale})` }}>
          <ResumeDocument resume={resume} design={{ ...design, template }} labels={labels} />
        </div>
      </div>
      <span className={cn('px-0.5 text-xs font-medium', selected ? 'text-primary-soft-fg' : 'text-text-2')}>{t(`resume.templates.${template}`)}</span>
    </button>
  )
}

export function ResumeDesign({ resume, design, labels, onChange }) {
  const { t } = useTranslation()
  const set = (patch) => onChange({ ...design, ...patch })
  return (
    <div className="flex flex-col gap-5">
      <SettingsSection title={t('resume.design.template')}>
        <div role="radiogroup" aria-label={t('resume.design.template')} className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3">
          {TEMPLATES.map((template) => (
            <TemplateThumb key={template} template={template} resume={resume} design={design} labels={labels} selected={design.template === template} onSelect={() => set({ template })} />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={t('resume.design.colors')}>
        <div className="flex flex-wrap gap-1.5">
          {ACCENTS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={design.accent.toUpperCase() === color}
              onClick={() => set({ accent: color })}
              className="size-7 rounded-full outline-none ring-offset-2 ring-offset-surface transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-text"
              style={{ background: color }}
            />
          ))}
        </div>
        <ColorInput label={t('resume.design.accent')} value={design.accent} onChange={(accent) => set({ accent })} />
      </SettingsSection>

      <SettingsSection title={t('resume.design.typography')}>
        <Select
          label={t('resume.design.font')}
          value={design.font}
          onChange={(font) => set({ font })}
          options={Object.keys(FONT_PAIRS).map((id) => ({ value: id, label: t(`resume.fonts.${id}`) }))}
        />
        <Slider label={t('resume.design.fontSize')} value={design.fontSize} min={8} max={12} step={0.5} onChange={(fontSize) => set({ fontSize })} formatValue={(value) => `${value} pt`} />
        <Slider label={t('pdfEditor.lineHeight')} value={design.lineHeight} min={1.2} max={1.8} step={0.05} onChange={(lineHeight) => set({ lineHeight })} formatValue={(value) => value.toFixed(2)} />
        <SegmentedControl
          label={t('resume.design.headings')}
          value={design.headingStyle}
          onChange={(headingStyle) => set({ headingStyle })}
          options={['accent', 'underline', 'pill', 'plain'].map((value) => ({ value, label: t(`resume.headingStyles.${value}`) }))}
        />
        <Switch label={t('resume.design.uppercase')} checked={design.uppercaseHeadings} onChange={(uppercaseHeadings) => set({ uppercaseHeadings })} />
      </SettingsSection>

      <SettingsSection title={t('resume.design.layout')}>
        <SegmentedControl label={t('resume.design.spacing')} value={design.spacing} onChange={(spacing) => set({ spacing })} options={['compact', 'normal', 'relaxed'].map((value) => ({ value, label: t(`resume.spacing.${value}`) }))} />
        <Slider label={t('pdf.margin')} value={design.margin} min={20} max={72} step={2} onChange={(margin) => set({ margin })} formatValue={(value) => `${value}px`} />
        <SegmentedControl
          label={t('pdf.pageSize')}
          value={design.paper}
          onChange={(paper) => set({ paper })}
          options={[
            { value: 'a4', label: 'A4' },
            { value: 'letter', label: 'US Letter' },
          ]}
        />
        <SegmentedControl
          label={t('resume.design.direction')}
          value={design.direction}
          onChange={(direction) => set({ direction })}
          options={['auto', 'ltr', 'rtl'].map((value) => ({ value, label: t(`resume.directions.${value}`) }))}
        />
      </SettingsSection>

      <SettingsSection title={t('resume.design.details')}>
        <Switch label={t('resume.design.photo')} checked={design.photo} onChange={(photo) => set({ photo })} />
        {design.photo && (
          <SegmentedControl label={t('resume.design.photoShape')} value={design.photoShape} onChange={(photoShape) => set({ photoShape })} options={['circle', 'rounded', 'square'].map((value) => ({ value, label: t(`resume.photoShapes.${value}`) }))} />
        )}
        <Switch label={t('resume.design.icons')} checked={design.showIcons} onChange={(showIcons) => set({ showIcons })} />
        <SegmentedControl label={t('resume.design.skills')} value={design.skillStyle} onChange={(skillStyle) => set({ skillStyle })} options={['bars', 'dots', 'tags', 'list'].map((value) => ({ value, label: t(`resume.skillStyles.${value}`) }))} />
      </SettingsSection>
    </div>
  )
}
