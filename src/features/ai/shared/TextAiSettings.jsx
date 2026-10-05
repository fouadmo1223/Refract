import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_TEXT_MODEL, listTextModels } from '@/services/ai/textAi'
import { useAiKeysStore } from '@/store/aiKeysStore'
import { Checkbox } from '@/components/ui/Checkbox'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const PROVIDER_ID = 'pollinations'

/** Pollinations key for text AI (shared with image/video generation). */
export function usePollinationsKey() {
  return useAiKeysStore((state) => state.keys[PROVIDER_ID] ?? '')
}

/**
 * Key + model controls for AI text features (resume writer, image → HTML).
 * `vision` limits the model list to models that accept images.
 */
export function TextAiSettings({ model, onModelChange, vision = false }) {
  const { t } = useTranslation()
  const [showKey, setShowKey] = useState(false)
  const apiKey = usePollinationsKey()
  const remember = useAiKeysStore((state) => state.remember)
  const setKey = useAiKeysStore((state) => state.setKey)
  const setRemember = useAiKeysStore((state) => state.setRemember)
  const models = useQuery({ queryKey: ['text-models'], queryFn: listTextModels, staleTime: 60 * 60 * 1000, retry: 1 })
  const options = (models.data ?? []).filter((item) => !vision || item.vision).map((item) => ({ value: item.id, label: item.label, meta: item.vision ? t('aiText.vision') : undefined }))
  const current = model || DEFAULT_TEXT_MODEL
  if (!options.some((option) => option.value === current)) options.unshift({ value: current, label: current })

  return (
    <>
      <Input
        label={t('ai.apiKey')}
        type={showKey ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        placeholder="sk_…"
        value={apiKey}
        onChange={(event) => setKey(PROVIDER_ID, event.target.value)}
        prefix={<KeyRound size={14} aria-hidden="true" />}
        suffix={<IconButton icon={showKey ? EyeOff : Eye} label={t(showKey ? 'ai.hideKey' : 'ai.showKey')} size="xs" tooltip={false} onClick={() => setShowKey(!showKey)} />}
        description={t('aiText.keyHint')}
        dir="ltr"
        labelAction={
          <a href="https://enter.pollinations.ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {t('ai.getFreeKey')}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        }
      />
      <Checkbox label={t('ai.rememberKey')} description={t('ai.rememberKeyHint')} checked={remember} onChange={setRemember} />
      <Select label={t('ai.model')} value={current} onChange={onModelChange} options={options} description={models.isError ? t('ai.modelsUnavailable') : undefined} />
    </>
  )
}
