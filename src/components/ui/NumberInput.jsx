import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { controlShell } from './Input'

function clamp(value, min, max) {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value))
}

/**
 * Numeric input with steppers. Keeps a local draft string so users can clear
 * and retype freely; emits `onChange(number | NaN)` on every edit so parent
 * validation can show field errors (e.g. "Width must be greater than 0").
 */
export function NumberInput({
  label,
  description,
  error,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  prefix,
  disabled,
  className,
  stepper = true,
  precision = 0,
  id,
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(null)
  const display = draft ?? (Number.isFinite(value) ? String(value) : '')

  const commitDraft = () => setDraft(null)
  const handleChange = (event) => {
    const text = event.target.value.replace(',', '.')
    if (!/^-?\d*\.?\d*$/.test(text)) return
    setDraft(text)
    onChange(text === '' || text === '-' ? NaN : Number(text))
  }
  const nudge = (direction) => {
    const base = Number.isFinite(value) ? value : (min ?? 0)
    const next = clamp(Number((base + direction * step).toFixed(precision)), min, max)
    setDraft(null)
    onChange(next)
  }
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      nudge(event.key === 'ArrowUp' ? (event.shiftKey ? 10 : 1) : event.shiftKey ? -10 : -1)
    }
  }

  return (
    <Field label={label} description={description} error={error} hint={hint} className={className} id={id}>
      {({ id: fieldId, describedBy, invalid }) => (
        <div className={controlShell(invalid, disabled)}>
          {prefix && <span className="ps-3 text-xs font-medium text-muted">{prefix}</span>}
          <input
            id={fieldId}
            inputMode={precision > 0 ? 'decimal' : 'numeric'}
            autoComplete="off"
            value={display}
            onChange={handleChange}
            onBlur={commitDraft}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            role="spinbutton"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={Number.isFinite(value) ? value : undefined}
            className={cn('tabular h-full w-full min-w-0 bg-transparent px-3 outline-none', prefix && 'ps-2')}
          />
          {suffix && <span className="pe-2 text-xs text-muted">{suffix}</span>}
          {stepper && (
            <div className="flex h-full shrink-0 items-center border-s border-border">
              <button
                type="button"
                tabIndex={-1}
                aria-label={t('common.decrease')}
                onClick={() => nudge(-1)}
                disabled={disabled || (min != null && value <= min)}
                className="flex h-full w-7 items-center justify-center text-muted hover:bg-surface-2 hover:text-text disabled:opacity-40"
              >
                <Minus size={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-label={t('common.increase')}
                onClick={() => nudge(1)}
                disabled={disabled || (max != null && value >= max)}
                className="flex h-full w-7 items-center justify-center rounded-e-md text-muted hover:bg-surface-2 hover:text-text disabled:opacity-40"
              >
                <Plus size={13} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </Field>
  )
}
