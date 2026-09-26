import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

export const MAX_PROMPT_LENGTH = 1500

/**
 * Prompt editor with example chips. Ctrl/⌘+Enter submits.
 */
export function PromptBox({ value, onChange, onSubmit, examples, disabled, loading, actionLabel, error, placeholder }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Textarea
        label={t('ai.prompt')}
        hint={`${value.length}/${MAX_PROMPT_LENGTH}`}
        value={value}
        maxLength={MAX_PROMPT_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            onSubmit()
          }
        }}
        placeholder={placeholder}
        error={error}
        textareaClassName="min-h-28 text-[15px]"
        dir="auto"
      />
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="me-1 text-xs text-muted">{t('ai.tryExample')}</span>
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            dir="auto"
            onClick={() => onChange(example)}
            className="max-w-full truncate rounded-md border border-border px-2 py-1 text-xs text-text-2 transition-colors hover:border-border-strong hover:bg-surface-2"
          >
            {example.length > 48 ? `${example.slice(0, 48)}…` : example}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="hidden text-xs text-muted sm:block">{t('ai.submitHint')}</p>
        <Button variant="primary" size="lg" leftIcon={Sparkles} onClick={onSubmit} disabled={disabled} loading={loading} className="max-sm:w-full">
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}
