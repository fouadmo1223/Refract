import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { WATERMARK_POSITIONS } from '@/constants/presets'

/**
 * 3×3 anchor picker (radiogroup). Positions are physical — they map to the
 * image, which is never mirrored — so the grid stays LTR in every language.
 */
export function PositionGrid({ value, onChange, label }) {
  const { t } = useTranslation()
  const refs = useRef([])

  const handleKeyDown = (event, index) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = index + moves[event.key]
    if (next < 0 || next > 8) return
    if ((event.key === 'ArrowLeft' && index % 3 === 0) || (event.key === 'ArrowRight' && index % 3 === 2)) return
    onChange(WATERMARK_POSITIONS[next])
    refs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-text">{label}</span>
      <div role="radiogroup" aria-label={label} dir="ltr" className="grid w-fit grid-cols-3 gap-1 rounded-md bg-surface-2 p-1 ring-1 ring-inset ring-border">
        {WATERMARK_POSITIONS.map((position, index) => {
          const checked = position === value
          return (
            <button
              key={position}
              ref={(node) => (refs.current[index] = node)}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={t(`positions.${position}`)}
              title={t(`positions.${position}`)}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(position)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'flex size-8 items-center justify-center rounded-[4px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                checked ? 'bg-surface shadow-sm ring-1 ring-border' : 'hover:bg-surface-3',
              )}
            >
              <span className={cn('size-2 rounded-full', checked ? 'bg-primary' : 'bg-border-strong')} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
