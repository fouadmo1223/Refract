import { Circle, Clock, Copy, Square, Trash2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { ColorInput } from '@/components/ui/ColorInput'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { SettingsSection } from '@/components/layout/Panels'
import { createRegionId } from '@/components/media/RegionEditor'
import { TimeRangeFields } from '@/features/video/shared/TimeRangeEditor'

/** Per-area defaults shared by the image and video censor tools. */
export const DEFAULT_AREA = { mode: 'blur', strength: 60, color: '#000000', shape: 'rect', start: 0, end: null }
export const STYLE_KEYS = ['mode', 'strength', 'color', 'shape']
export const pickStyle = (source) => Object.fromEntries(STYLE_KEYS.map((key) => [key, source[key] ?? DEFAULT_AREA[key]]))
export const areaEnd = (area, duration) => area.end ?? duration

function AreaSettings({ area, index, timing, onUpdate, onDuplicate, onRemove, onApplyToAll, canApplyToAll }) {
  const { t } = useTranslation()
  const duration = timing?.duration ?? 0
  const currentTime = timing?.currentTime ?? 0
  const wholeVideo = (area.start ?? 0) <= 0 && area.end == null
  const range = { start: area.start ?? 0, end: areaEnd(area, duration) }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label={t('censor.effect')}
        value={area.mode}
        onChange={(mode) => onUpdate({ mode })}
        options={['blur', 'pixelate', 'solid'].map((mode) => ({ value: mode, label: t(`censor.modes.${mode}`) }))}
      />
      {area.mode === 'solid' ? (
        <ColorInput label={t('censor.fillColor')} value={area.color} onChange={(color) => onUpdate({ color })} />
      ) : (
        <Slider label={t('effects.strength')} value={area.strength} min={10} max={100} onChange={(strength) => onUpdate({ strength })} />
      )}
      <SegmentedControl
        label={t('censor.shape')}
        value={area.shape}
        onChange={(shape) => onUpdate({ shape })}
        options={[
          { value: 'rect', label: t('censor.shapes.rect'), icon: Square },
          { value: 'ellipse', label: t('censor.shapes.ellipse'), icon: Circle },
        ]}
      />

      {timing && (
        <div className="flex flex-col gap-3">
          <Switch
            label={t('censor.wholeVideo')}
            description={wholeVideo ? t('censor.wholeVideoHint') : t('censor.timedHint', { start: formatDuration(range.start, { precise: true }), end: formatDuration(range.end, { precise: true }) })}
            checked={wholeVideo}
            onChange={(checked) => onUpdate(checked ? { start: 0, end: null } : { start: Math.min(currentTime, Math.max(0, duration - 1)), end: Math.min(duration, currentTime + Math.min(3, duration)) })}
          />
          {!wholeVideo && (
            <>
              <TimeRangeFields range={range} duration={duration} onRangeChange={({ start, end }) => onUpdate({ start: Math.min(start, end - 0.1), end: end >= duration - 0.01 ? null : end })} />
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="secondary" size="xs" leftIcon={Clock} onClick={() => onUpdate({ start: Math.min(currentTime, range.end - 0.1) })}>
                  {t('censor.startHere')}
                </Button>
                <Button variant="secondary" size="xs" leftIcon={Clock} onClick={() => onUpdate({ end: Math.max(currentTime, range.start + 0.1) })}>
                  {t('censor.endHere')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
        <Button variant="ghost" size="xs" leftIcon={Copy} onClick={onDuplicate}>
          {t('censor.duplicate')}
        </Button>
        {canApplyToAll && (
          <Button variant="ghost" size="xs" leftIcon={Wand2} onClick={onApplyToAll}>
            {t('censor.applyToAll')}
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="ghost" size="xs" leftIcon={Trash2} onClick={onRemove} className="hover:text-danger" aria-label={t('censor.removeRegion', { index: index + 1 })}>
          {t('common.remove')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Expandable list of censor areas; the selected one shows its own effect,
 * strength/colour, shape and (for video, when `timing` is given) time range.
 * @param {{ timing?: { duration: number, currentTime: number } | null }} props
 */
export function CensorAreaList({ regions, selectedId, onSelect, onChange, onDefaultsChange, timing = null }) {
  const { t } = useTranslation()
  const update = (id, patch) => {
    onChange((current) => current.map((region) => (region.id === id ? { ...region, ...patch } : region)))
    // Remember the style for the next area the user draws.
    if (STYLE_KEYS.some((key) => key in patch)) onDefaultsChange?.(pickStyle({ ...regions.find((region) => region.id === id), ...patch }))
  }

  return (
    <SettingsSection
      title={t('censor.title')}
      action={
        regions.length > 0 && (
          <Button variant="ghost" size="xs" leftIcon={Trash2} onClick={() => onChange([])}>
            {t('common.clear')}
          </Button>
        )
      }
    >
      {!regions.length && <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">{t('censor.drawHint')}</p>}
      <ul className="flex flex-col gap-2">
        {regions.map((area, index) => {
          const open = area.id === selectedId
          const timed = timing && ((area.start ?? 0) > 0 || area.end != null)
          const style = { ...DEFAULT_AREA, ...area }
          return (
            <li key={area.id} className={cn('overflow-hidden rounded-lg border transition-colors', open ? 'border-primary/50 bg-primary-soft/30' : 'border-border bg-surface-2/40')}>
              <div className="flex items-center gap-1 pe-2">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onSelect(open ? null : area.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 py-2 ps-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="tabular flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary text-2xs font-semibold text-primary-fg">{index + 1}</span>
                  <span
                    className="size-4 shrink-0 overflow-hidden border border-border-strong"
                    style={{ borderRadius: style.shape === 'ellipse' ? '50%' : 3, background: style.mode === 'solid' ? style.color : 'repeating-linear-gradient(45deg, var(--color-muted) 0 2px, transparent 2px 4px)' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-text">
                      {t(`censor.modes.${style.mode}`)}
                      {style.mode !== 'solid' && <span className="font-normal text-muted"> · {style.strength}</span>}
                    </span>
                    <span className="tabular block truncate text-xs text-muted" dir="auto">
                      {timing
                        ? timed
                          ? `${formatDuration(area.start ?? 0, { precise: true })} – ${formatDuration(areaEnd(area, timing.duration), { precise: true })}`
                          : t('censor.wholeVideo')
                        : `${Math.round(area.width)} × ${Math.round(area.height)} px`}
                    </span>
                  </span>
                </button>
                <IconButton icon={Trash2} label={t('censor.removeRegion', { index: index + 1 })} size="xs" variant="danger-ghost" onClick={() => onChange(regions.filter((region) => region.id !== area.id))} />
              </div>
              {open && (
                <div className="border-t border-border px-3 pb-3 pt-3">
                  <AreaSettings
                    area={style}
                    index={index}
                    timing={timing}
                    onUpdate={(patch) => update(area.id, patch)}
                    onRemove={() => onChange(regions.filter((region) => region.id !== area.id))}
                    onDuplicate={() => {
                      const id = createRegionId()
                      const offset = Math.round(Math.min(area.width, area.height) * 0.15)
                      onChange([...regions, { ...area, id, x: area.x + offset, y: area.y + offset }])
                      onSelect(id)
                    }}
                    canApplyToAll={regions.length > 1}
                    onApplyToAll={() => onChange((current) => current.map((region) => ({ ...region, ...pickStyle(area) })))}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </SettingsSection>
  )
}
