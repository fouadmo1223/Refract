import { AlignCenter, AlignLeft, AlignRight, Bold, BringToFront, Copy, Italic, SendToBack, Trash2, Underline } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { ColorInput } from '@/components/ui/ColorInput'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { SettingsSection } from '@/components/layout/Panels'
import { COLOR_SWATCHES } from './editorModel'

const FONT_OPTIONS = ['helvetica', 'times', 'courier']

function Swatches({ value, onChange, allowNone = false }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowNone && (
        <button
          type="button"
          title={t('pdfEditor.none')}
          aria-label={t('pdfEditor.none')}
          aria-pressed={value === 'transparent'}
          onClick={() => onChange('transparent')}
          className="checkerboard size-6 rounded-full border border-border-strong outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
        />
      )}
      {COLOR_SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          aria-label={color}
          aria-pressed={value?.toUpperCase() === color}
          onClick={() => onChange(color)}
          className="size-6 rounded-full border border-border-strong outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
          style={{ background: color }}
        />
      ))}
    </div>
  )
}

function Toggle({ icon, label, active, onClick }) {
  return <IconButton icon={icon} label={label} size="sm" variant="secondary" active={active} aria-pressed={active} onClick={onClick} />
}

/** Text styling controls; used for the selected text element and as defaults for the Text tool. */
export function TextControls({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <Select label={t('pdfEditor.font')} value={value.fontFamily} onChange={(fontFamily) => onChange({ fontFamily })} options={FONT_OPTIONS.map((id) => ({ value: id, label: t(`pdfEditor.fonts.${id}`) }))} />
        <Select label={t('pdfEditor.size')} value={value.fontSize} onChange={(fontSize) => onChange({ fontSize })} options={[...new Set([8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72, value.fontSize])].sort((x, y) => x - y).map((size) => ({ value: size, label: `${size} pt` }))} />
      </div>
      <div className="flex flex-wrap gap-1">
        <Toggle icon={Bold} label={t('pdfEditor.bold')} active={value.bold} onClick={() => onChange({ bold: !value.bold })} />
        <Toggle icon={Italic} label={t('pdfEditor.italic')} active={value.italic} onClick={() => onChange({ italic: !value.italic })} />
        <Toggle icon={Underline} label={t('pdfEditor.underline')} active={value.underline} onClick={() => onChange({ underline: !value.underline })} />
        <span className="mx-1 w-px bg-border" />
        <Toggle icon={AlignLeft} label={t('pdfEditor.alignLeft')} active={value.align === 'left'} onClick={() => onChange({ align: 'left' })} />
        <Toggle icon={AlignCenter} label={t('pdfEditor.alignCenter')} active={value.align === 'center'} onClick={() => onChange({ align: 'center' })} />
        <Toggle icon={AlignRight} label={t('pdfEditor.alignRight')} active={value.align === 'right'} onClick={() => onChange({ align: 'right' })} />
      </div>
      <ColorInput label={t('pdfEditor.textColor')} value={value.color} onChange={(color) => onChange({ color })} />
      <Swatches value={value.color} onChange={(color) => onChange({ color })} />
      <Slider label={t('pdfEditor.lineHeight')} value={value.lineHeight ?? 1.25} min={0.9} max={2.5} step={0.05} onChange={(lineHeight) => onChange({ lineHeight })} formatValue={(v) => v.toFixed(2)} />
    </>
  )
}

/** Stroke / fill controls for shapes. */
export function ShapeControls({ value, onChange, fill = true }) {
  const { t } = useTranslation()
  return (
    <>
      {fill && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-text">{t('pdfEditor.fill')}</p>
          <Swatches value={value.fill} onChange={(color) => onChange({ fill: color })} allowNone />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-text">{t('pdfEditor.stroke')}</p>
        <Swatches value={value.stroke} onChange={(stroke) => onChange({ stroke })} />
      </div>
      <Slider label={t('pdfEditor.strokeWidth')} value={value.strokeWidth} min={0} max={16} step={0.5} onChange={(strokeWidth) => onChange({ strokeWidth })} formatValue={(v) => `${v} pt`} />
    </>
  )
}

/** Properties of the selected element. */
export function PropertiesPanel({ element, onChange, onDelete, onDuplicate, onForward, onBackward }) {
  const { t } = useTranslation()
  const update = (patch) => onChange({ ...element, ...patch })
  return (
    <SettingsSection
      title={t(`pdfEditor.elements.${element.type === 'line' && element.arrow ? 'arrow' : element.type}`)}
      action={
        <div className="flex gap-0.5">
          <IconButton icon={BringToFront} label={t('pdfEditor.bringForward')} size="xs" onClick={onForward} />
          <IconButton icon={SendToBack} label={t('pdfEditor.sendBackward')} size="xs" onClick={onBackward} />
          <IconButton icon={Copy} label={t('pdfEditor.duplicate')} size="xs" onClick={onDuplicate} />
          <IconButton icon={Trash2} label={t('common.remove')} size="xs" variant="danger-ghost" onClick={onDelete} />
        </div>
      }
    >
      {element.type === 'text' && (
        <>
          <p className="-mt-1 text-xs text-muted">{t('pdfEditor.textHint')}</p>
          <TextControls value={element} onChange={update} />
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-text">{t('pdfEditor.textBackground')}</p>
            <Swatches value={element.background ?? 'transparent'} onChange={(background) => update({ background })} allowNone />
          </div>
        </>
      )}
      {(element.type === 'rect' || element.type === 'ellipse') && <ShapeControls value={element} onChange={update} />}
      {element.type === 'line' && (
        <>
          <ShapeControls value={element} onChange={update} fill={false} />
          <SegmentedControl
            label={t('pdfEditor.lineEnd')}
            value={element.arrow ? 'arrow' : 'plain'}
            onChange={(end) => update({ arrow: end === 'arrow' })}
            options={[
              { value: 'plain', label: t('pdfEditor.plainEnd') },
              { value: 'arrow', label: t('pdfEditor.arrowEnd') },
            ]}
          />
        </>
      )}
      {element.type === 'draw' && <ShapeControls value={element} onChange={update} fill={false} />}
      {element.type === 'highlight' && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-text">{t('pdfEditor.color')}</p>
          <Swatches value={element.fill} onChange={(fill) => update({ fill })} />
        </div>
      )}
      {element.type === 'whiteout' && (
        <>
          <p className="-mt-1 text-xs text-muted">{t('pdfEditor.whiteoutHint')}</p>
          <ColorInput label={t('pdfEditor.color')} value={element.fill} onChange={(fill) => update({ fill })} />
        </>
      )}
      {element.type === 'link' && (
        <>
          <Input label={t('pdfEditor.url')} value={element.url} onChange={(event) => update({ url: event.target.value })} placeholder="https://example.com" dir="ltr" />
          <p className="-mt-1 text-xs text-muted">{t('pdfEditor.linkHint')}</p>
        </>
      )}
      {element.type !== 'link' && (
        <Slider
          label={t('pdfEditor.opacity')}
          value={Math.round((element.opacity ?? 1) * 100)}
          min={10}
          max={100}
          onChange={(value) => update({ opacity: value / 100 })}
          formatValue={(v) => `${v}%`}
        />
      )}
      <Button variant="ghost" size="sm" leftIcon={Trash2} onClick={onDelete} className={cn('self-start hover:text-danger')}>
        {t('pdfEditor.deleteElement')}
      </Button>
    </SettingsSection>
  )
}
