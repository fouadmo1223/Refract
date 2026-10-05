import { useState } from 'react'
import { Sparkles, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Textarea } from '@/components/ui/Textarea'
import { SettingsSection } from '@/components/layout/Panels'
import { TextAiSettings, usePollinationsKey } from '@/features/ai/shared/TextAiSettings'
import { generateResume, tailorToJob } from './resumeAi'
import { uid } from './resumeModel'

/**
 * AI writer: build the whole resume from a description (or an old CV), or
 * tailor the summary and skills to a job ad. Results land in the editor, where
 * everything stays editable — and Undo brings the previous version back.
 */
export function ResumeAiPanel({ resume, onApply, model, onModelChange }) {
  const { t, i18n } = useTranslation()
  const apiKey = usePollinationsKey()
  const [description, setDescription] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [language, setLanguage] = useState(i18n.language?.startsWith('ar') ? 'ar' : 'en')
  const [jobAd, setJobAd] = useState('')
  const [busy, setBusy] = useState(null)

  const run = async (kind, task) => {
    setBusy(kind)
    try {
      await task()
    } catch (error) {
      notify.error(error)
    } finally {
      setBusy(null)
    }
  }

  const handleGenerate = () =>
    run('generate', async () => {
      const generated = await generateResume({ apiKey, model, description, targetRole, language })
      // Keep the user's photo; everything else comes from the AI draft.
      onApply({ ...generated, personal: { ...generated.personal, photo: resume.personal.photo } })
      notify.success('toasts.resumeGenerated')
    })

  const handleTailor = () =>
    run('tailor', async () => {
      const { summary, skills } = await tailorToJob({ apiKey, model, resume, jobDescription: jobAd, language })
      const hasSkills = resume.sections.some((section) => section.type === 'skills')
      const skillItems = skills.map((name, index) => ({ id: uid('i'), name, level: Math.max(3, 5 - Math.floor(index / 4)) }))
      const sections = hasSkills
        ? resume.sections.map((section) => (section.type === 'skills' && skills.length ? { ...section, items: skillItems } : section))
        : skills.length
          ? [...resume.sections, { id: uid('s'), type: 'skills', title: t('resume.types.skills'), visible: true, items: skillItems }]
          : resume.sections
      onApply({ ...resume, personal: { ...resume.personal, summary: summary || resume.personal.summary }, sections })
      notify.success('toasts.resumeTailored')
    })

  return (
    <div className="flex flex-col gap-5">
      <SettingsSection title={t('resume.ai.writeTitle')} description={t('resume.ai.writeHint')}>
        <Textarea label={t('resume.ai.aboutYou')} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t('resume.ai.aboutPlaceholder')} textareaClassName="min-h-40" dir="auto" />
        <Input label={t('resume.ai.targetRole')} value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder={t('resume.ai.targetPlaceholder')} dir="auto" />
        <SegmentedControl
          label={t('resume.ai.language')}
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ar', label: 'العربية' },
          ]}
        />
        <Button variant="primary" leftIcon={Sparkles} onClick={handleGenerate} loading={busy === 'generate'} disabled={!apiKey || description.trim().length < 20 || Boolean(busy)}>
          {t('resume.ai.generate')}
        </Button>
        <p className="-mt-1 text-xs text-muted">{t('resume.ai.undoHint')}</p>
      </SettingsSection>

      <SettingsSection title={t('resume.ai.tailorTitle')} description={t('resume.ai.tailorHint')}>
        <Textarea label={t('resume.ai.jobAd')} value={jobAd} onChange={(event) => setJobAd(event.target.value)} textareaClassName="min-h-28" dir="auto" />
        <Button variant="secondary" leftIcon={Target} onClick={handleTailor} loading={busy === 'tailor'} disabled={!apiKey || jobAd.trim().length < 30 || Boolean(busy)}>
          {t('resume.ai.tailor')}
        </Button>
      </SettingsSection>

      <SettingsSection title={t('resume.ai.settings')}>
        {!apiKey && <p className="rounded-md bg-primary-soft px-3 py-2 text-[13px] text-primary-soft-fg">{t('resume.ai.needsKey')}</p>}
        <TextAiSettings model={model} onModelChange={onModelChange} />
      </SettingsSection>
    </div>
  )
}
