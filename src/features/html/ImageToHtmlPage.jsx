import { useMemo, useState } from 'react'
import { Code2, Copy, Download, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { copyToClipboard, downloadBlob } from '@/lib/download'
import { getBaseName } from '@/lib/files'
import { notify } from '@/lib/notify'
import { buildDocument } from '@/services/html/htmlRender'
import { imageToEmbedHtml, imageToHtmlWithAi, imageToPixelCss } from '@/services/html/imageToHtml'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { Tabs } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { TextAiSettings, usePollinationsKey } from '@/features/ai/shared/TextAiSettings'
import { CodeEditor } from './CodeEditor'

const TOOL_ID = 'image-to-html'
const DEFAULTS = { mode: 'ai', framework: 'css', responsive: true, notes: '', model: null, maxWidth: 0, radius: 12, shadow: true, alt: '', columns: 48, pixel: 6 }
const TAILWIND_CDN = '<script src="https://cdn.tailwindcss.com"></script>'

function fullPage(result) {
  const doc = buildDocument(result.html, result.css, { background: '#FFFFFF' })
  return result.tailwind ? doc.replace('<head>', `<head>${TAILWIND_CDN}`) : doc
}

function CodeResult({ file, result, reset, startOver }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('preview')
  const [html, setHtml] = useState(result.html)
  const [css, setCss] = useState(result.css)
  const edited = { ...result, html, css }
  const page = useMemo(() => fullPage(edited), [html, css]) // eslint-disable-line react-hooks/exhaustive-deps
  const copy = async (text) => {
    await copyToClipboard(text)
    notify.success('toasts.copied')
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">{t(`imageHtml.done.${result.mode}`)}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" leftIcon={SlidersHorizontal} onClick={reset}>
            {t('result.adjustSettings')}
          </Button>
          <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={startOver}>
            {t('common.processAnother')}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          variant="segmented"
          aria-label={t('html.code')}
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'preview', label: t('html.preview') },
            { value: 'html', label: 'HTML', icon: Code2 },
            { value: 'css', label: 'CSS' },
          ]}
        />
        <span className="flex-1" />
        <Button variant="secondary" size="sm" leftIcon={Copy} onClick={() => copy(tab === 'css' ? css : tab === 'html' ? html : page)}>
          {t(tab === 'preview' ? 'imageHtml.copyPage' : 'common.copy')}
        </Button>
        <Button variant="primary" size="sm" leftIcon={Download} onClick={() => downloadBlob(new Blob([page], { type: 'text/html' }), `${getBaseName(file.name)}.html`)}>
          {t('imageHtml.downloadHtml')}
        </Button>
      </div>
      {tab === 'preview' ? (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          {/* Scripts are allowed only for the Tailwind CDN build; the frame has no access to the app. */}
          <iframe title={t('html.preview')} sandbox={result.tailwind ? 'allow-scripts' : ''} srcDoc={page} className="block h-[70vh] w-full border-0" />
        </div>
      ) : tab === 'html' ? (
        <CodeEditor label="HTML" value={html} onChange={setHtml} minHeight="60vh" />
      ) : (
        <CodeEditor label="CSS" value={css} onChange={setCss} minHeight="60vh" />
      )}
      <p className="text-xs text-muted">{t('imageHtml.editHint')}</p>
    </div>
  )
}

export default function ImageToHtmlPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const apiKey = usePollinationsKey()
  const needsKey = settings.mode === 'ai' && !apiKey

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        actionLabel={t(`imageHtml.actions.${settings.mode}`)}
        actionIcon={settings.mode === 'ai' ? Sparkles : Code2}
        processingTitle={t(settings.mode === 'ai' ? 'imageHtml.processingAi' : 'processing.encoding')}
        successMessage="toasts.codeReady"
        canProcess={!needsKey}
        longRunning={settings.mode === 'ai'}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={({ meta }) => (
          <>
            <SettingsSection title={t('imageHtml.mode')}>
              <SegmentedControl value={settings.mode} onChange={(mode) => updateSettings({ mode })} options={['ai', 'embed', 'pixel'].map((value) => ({ value, label: t(`imageHtml.modes.${value}`) }))} />
              <p className="-mt-1 text-xs text-muted">{t(`imageHtml.modeHints.${settings.mode}`)}</p>
            </SettingsSection>
            {settings.mode === 'ai' && (
              <>
                <SettingsSection title={t('imageHtml.codeStyle')}>
                  <SegmentedControl
                    value={settings.framework}
                    onChange={(framework) => updateSettings({ framework })}
                    options={[
                      { value: 'css', label: 'HTML + CSS' },
                      { value: 'tailwind', label: 'Tailwind' },
                    ]}
                  />
                  <Switch label={t('imageHtml.responsive')} checked={settings.responsive} onChange={(responsive) => updateSettings({ responsive })} />
                  <Textarea label={t('imageHtml.notes')} placeholder={t('imageHtml.notesPlaceholder')} value={settings.notes} onChange={(event) => updateSettings({ notes: event.target.value })} textareaClassName="min-h-20" />
                </SettingsSection>
                <SettingsSection title={t('resume.ai.settings')}>
                  {needsKey && <p className="rounded-md bg-primary-soft px-3 py-2 text-[13px] text-primary-soft-fg">{t('imageHtml.needsKey')}</p>}
                  <TextAiSettings vision model={settings.model} onModelChange={(model) => updateSettings({ model })} />
                </SettingsSection>
              </>
            )}
            {settings.mode === 'embed' && (
              <SettingsSection title={t('imageHtml.embedOptions')}>
                <Slider label={t('border.radius')} value={settings.radius} min={0} max={48} onChange={(radius) => updateSettings({ radius })} formatValue={(value) => `${value}px`} />
                <Switch label={t('border.shadow')} checked={settings.shadow} onChange={(shadow) => updateSettings({ shadow })} />
                <Slider
                  label={t('settings.maxWidth')}
                  value={settings.maxWidth}
                  min={0}
                  max={1600}
                  step={20}
                  onChange={(maxWidth) => updateSettings({ maxWidth })}
                  formatValue={(value) => (value ? `${value}px` : t('imageHtml.fullWidth'))}
                />
                <Input label={t('imageHtml.altText')} value={settings.alt} onChange={(event) => updateSettings({ alt: event.target.value })} />
              </SettingsSection>
            )}
            {settings.mode === 'pixel' && (
              <SettingsSection title={t('imageHtml.pixelOptions')}>
                <Slider label={t('imageHtml.columns')} value={settings.columns} min={8} max={128} onChange={(columns) => updateSettings({ columns })} formatValue={(value) => `${value} px`} />
                <Slider label={t('imageHtml.pixelSize')} value={settings.pixel} min={1} max={20} onChange={(pixel) => updateSettings({ pixel })} formatValue={(value) => `${value}px`} />
                {meta?.width && (
                  <p className="tabular -mt-1 text-xs text-muted">
                    {t('imageHtml.pixelSummary', { pixels: Math.min(settings.columns, meta.width) * Math.round((Math.min(settings.columns, meta.width) / meta.width) * meta.height) })}
                  </p>
                )}
              </SettingsSection>
            )}
          </>
        )}
        onProcess={({ file, signal, onProgress }) =>
          settings.mode === 'ai'
            ? imageToHtmlWithAi(file, { apiKey, model: settings.model, framework: settings.framework, responsive: settings.responsive, notes: settings.notes }, { signal, onProgress })
            : settings.mode === 'embed'
              ? imageToEmbedHtml(file, settings)
              : imageToPixelCss(file, settings)
        }
        renderResult={(context) => <CodeResult {...context} />}
      />
    </ToolLayout>
  )
}
