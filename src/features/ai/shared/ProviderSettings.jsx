import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getAiProvider, getProvidersFor } from '@/services/ai'
import { useAiKeysStore } from '@/store/aiKeysStore'
import { Checkbox } from '@/components/ui/Checkbox'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SettingsSection } from '@/components/layout/Panels'

/** Live model list for a provider (cached for the session). */
export function useProviderModels(providerId, kind) {
  return useQuery({
    queryKey: ['ai-models', providerId, kind],
    queryFn: () => getAiProvider(providerId).listModels(kind),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })
}

/**
 * Provider picker + API key field + model picker. Keys are user-supplied and
 * scoped to this browser (session by default).
 */
export function ProviderSettings({ kind, providerId, onProviderChange, model, onModelChange }) {
  const { t } = useTranslation()
  const [showKey, setShowKey] = useState(false)
  const provider = getAiProvider(providerId)
  const apiKey = useAiKeysStore((state) => state.keys[providerId] ?? '')
  const remember = useAiKeysStore((state) => state.remember)
  const setKey = useAiKeysStore((state) => state.setKey)
  const setRemember = useAiKeysStore((state) => state.setRemember)
  const models = useProviderModels(providerId, kind)

  const modelOptions = (models.data ?? []).map((item) => ({
    value: item.id,
    label: item.label,
    description: item.paidOnly ? t('ai.paidOnly') : item.description?.slice(0, 80),
    meta: item.paidOnly ? t('ai.paid') : t('ai.free'),
  }))
  if (model && !modelOptions.some((option) => option.value === model)) modelOptions.unshift({ value: model, label: model })

  return (
    <SettingsSection title={t('ai.provider')}>
      <Select
        label={t('ai.service')}
        value={providerId}
        onChange={onProviderChange}
        options={getProvidersFor(kind).map((item) => ({ value: item.id, label: item.name, description: t(`ai.providers.${item.id}`) }))}
      />
      <Input
        label={t('ai.apiKey')}
        type={showKey ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        placeholder={provider.keyPlaceholder}
        value={apiKey}
        onChange={(event) => setKey(providerId, event.target.value)}
        prefix={<KeyRound size={14} aria-hidden="true" />}
        suffix={<IconButton icon={showKey ? EyeOff : Eye} label={t(showKey ? 'ai.hideKey' : 'ai.showKey')} size="xs" tooltip={false} onClick={() => setShowKey(!showKey)} />}
        description={t('ai.keyHint', { provider: provider.name })}
        dir="ltr"
        labelAction={
          <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {t('ai.getFreeKey')}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        }
      />
      <Checkbox label={t('ai.rememberKey')} description={t('ai.rememberKeyHint')} checked={remember} onChange={setRemember} />
      <Select
        label={t('ai.model')}
        value={model ?? provider.defaultModels[kind]}
        onChange={onModelChange}
        options={modelOptions}
        placeholder={models.isLoading ? t('common.loading') : undefined}
        description={models.isError ? t('ai.modelsUnavailable') : undefined}
      />
    </SettingsSection>
  )
}
