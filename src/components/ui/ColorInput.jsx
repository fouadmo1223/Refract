import { useRef, useState } from 'react'
import { Pipette } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { Popover } from './Popover'

const SWATCHES = ['#FFFFFF', '#F4F4F5', '#D4D4D8', '#71717A', '#27272A', '#000000', '#0B7A73', '#2563EB', '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#DB2777', '#7C3AED']
const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function normalizeHex(value) {
  let hex = value.trim()
  if (!hex.startsWith('#')) hex = `#${hex}`
  if (!HEX_PATTERN.test(hex)) return null
  if (hex.length === 4) hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  return hex.toUpperCase()
}

/**
 * Color picker: swatch grid + hex field in a popover. The OS color picker is
 * offered as an extra (visually hidden native input behind a button).
 */
export function ColorInput({ label, value, onChange, className }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(null)
  const nativeRef = useRef(null)
  const draftValid = draft == null || normalizeHex(draft)

  return (
    <Field label={label} className={className}>
      {({ id }) => (
        <Popover
          label={label}
          className="w-60"
          trigger={
            <button
              id={id}
              type="button"
              className="flex h-9 w-full items-center gap-2.5 rounded-md border border-border bg-surface px-2 text-sm text-text shadow-xs hover:border-border-strong focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="size-5 shrink-0 rounded-sm ring-1 ring-inset ring-black/10" style={{ background: value }} />
              <span className="tabular font-mono text-xs uppercase">{value}</span>
            </button>
          }
        >
          <div className="grid grid-cols-7 gap-1.5">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={swatch === value?.toUpperCase()}
                onClick={() => onChange(swatch)}
                className={cn(
                  'size-6 rounded-sm ring-1 ring-inset ring-black/10 outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  swatch === value?.toUpperCase() && 'ring-2 ring-primary ring-offset-1 ring-offset-surface',
                )}
                style={{ background: swatch }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              aria-label={t('common.hexColor')}
              value={draft ?? value}
              onChange={(event) => {
                setDraft(event.target.value)
                const hex = normalizeHex(event.target.value)
                if (hex) onChange(hex)
              }}
              onBlur={() => setDraft(null)}
              className={cn(
                'tabular h-8 min-w-0 flex-1 rounded-md border bg-surface px-2 font-mono text-xs uppercase outline-none focus:ring-2 focus:ring-ring',
                draftValid ? 'border-border' : 'border-danger',
              )}
            />
            <button
              type="button"
              onClick={() => nativeRef.current?.click()}
              aria-label={t('common.systemColorPicker')}
              className="flex size-8 items-center justify-center rounded-md border border-border text-muted hover:bg-surface-2 hover:text-text"
            >
              <Pipette size={15} aria-hidden="true" />
            </button>
            <input ref={nativeRef} type="color" tabIndex={-1} aria-hidden="true" className="sr-only" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} />
          </div>
        </Popover>
      )}
    </Field>
  )
}
