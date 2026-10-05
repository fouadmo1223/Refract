import { useEffect, useRef, useState } from 'react'
import { Camera, Code2, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getImageFormat } from '@/constants/imageFormats'
import { useProcessingJob } from '@/hooks/useProcessingJob'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { buildDocument, renderFrameToImage } from '@/services/html/htmlRender'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { ColorInput } from '@/components/ui/ColorInput'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { Tabs } from '@/components/ui/Tabs'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsPanel, SettingsSection } from '@/components/layout/Panels'
import { PrivacyNote } from '@/components/media/PrivacyNote'
import { ResultView } from '@/components/media/ResultView'
import { CodeEditor } from './CodeEditor'
import { HTML_EXAMPLES } from './examples'

const TOOL_ID = 'html-to-image'
const DEFAULTS = { width: 800, autoHeight: false, height: 420, scale: 2, format: 'png', transparent: false, background: '#FFFFFF', quality: 92 }
const SIZE_PRESETS = { custom: null, og: [1200, 630], square: [1080, 1080], story: [1080, 1920], banner: [1500, 500], twitter: [1600, 900] }

export default function HtmlToImagePage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const [html, setHtml] = useState(HTML_EXAMPLES.card.html)
  const [css, setCss] = useState(HTML_EXAMPLES.card.css)
  const [codeTab, setCodeTab] = useState('html')
  const [srcDoc, setSrcDoc] = useState('')
  const frameRef = useRef(null)
  const job = useProcessingJob({ toolId: TOOL_ID, successMessage: 'toasts.imageExported' })
  const height = settings.autoHeight ? null : settings.height
  const background = settings.transparent && settings.format !== 'jpeg' ? 'transparent' : settings.background

  // Live preview, debounced while typing.
  useEffect(() => {
    const timer = setTimeout(() => setSrcDoc(buildDocument(html, css, { background, width: settings.width })), 300)
    return () => clearTimeout(timer)
  }, [background, css, html, settings.width])

  const loadExample = (id) => {
    const example = HTML_EXAMPLES[id]
    setHtml(example.html)
    setCss(example.css)
    updateSettings(example.height ? { width: example.width, height: example.height, autoHeight: false } : { width: example.width, autoHeight: true })
  }
  const capture = () =>
    job.run(() => renderFrameToImage(frameRef.current, { ...settings, height, background: background === 'transparent' ? null : background }), { fileName: 'html-snapshot' })

  if (job.status === 'success' && job.result) return <HtmlResult result={job.result} onAdjust={job.reset} />

  const presetId = Object.entries(SIZE_PRESETS).find(([, size]) => size && size[0] === settings.width && size[1] === settings.height && !settings.autoHeight)?.[0] ?? 'custom'
  const frameHeight = height ?? 600

  return (
    <ToolLayout toolId={TOOL_ID}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              variant="segmented"
              aria-label={t('html.code')}
              value={codeTab}
              onChange={setCodeTab}
              tabs={[
                { value: 'html', label: 'HTML', icon: Code2 },
                { value: 'css', label: 'CSS' },
              ]}
            />
            <span className="flex-1" />
            <Select
              aria-label={t('html.examples')}
              value=""
              placeholder={t('html.examples')}
              onChange={loadExample}
              options={Object.keys(HTML_EXAMPLES).map((id) => ({ value: id, label: t(`html.exampleNames.${id}`) }))}
              className="w-48"
            />
          </div>
          {codeTab === 'html' ? <CodeEditor label="HTML" value={html} onChange={setHtml} onRun={capture} /> : <CodeEditor label="CSS" value={css} onChange={setCss} onRun={capture} />}
          <p className="text-xs text-muted">{t('html.editorHint')}</p>
          <MediaStage checkerboard className="block overflow-auto">
            <p className="mb-2 text-xs text-muted">
              {t('html.preview')} · {settings.width} × {height ?? t('html.auto')} px
            </p>
            <div className="origin-top-left" style={{ width: settings.width, transform: `scale(${Math.min(1, 640 / settings.width)})`, height: frameHeight * Math.min(1, 640 / settings.width) }}>
              {/* Same-origin but script-less sandbox: user CSS can't touch the app and no code runs. */}
              <iframe ref={frameRef} title={t('html.preview')} sandbox="allow-same-origin" srcDoc={srcDoc} className="block border-0 bg-transparent shadow-md" style={{ width: settings.width, height: frameHeight }} />
            </div>
          </MediaStage>
        </div>

        <SettingsPanel
          footer={
            <Button variant="primary" size="lg" fullWidth leftIcon={Camera} onClick={capture} loading={job.isProcessing} disabled={!html.trim()}>
              {t('tools.html-to-image.action')}
            </Button>
          }
        >
          {job.status === 'error' && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">{t('html.renderError')}</p>}
          <SettingsSection title={t('html.canvas')}>
            <Select
              label={t('settings.preset')}
              value={presetId}
              onChange={(id) => SIZE_PRESETS[id] && updateSettings({ width: SIZE_PRESETS[id][0], height: SIZE_PRESETS[id][1], autoHeight: false })}
              options={Object.entries(SIZE_PRESETS).map(([id, size]) => ({ value: id, label: t(`html.sizes.${id}`), meta: size ? `${size[0]}×${size[1]}` : undefined }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label={t('settings.width')} value={settings.width} min={50} max={4000} onChange={(width) => updateSettings({ width })} suffix="px" stepper={false} />
              <NumberInput label={t('settings.height')} value={settings.height} min={50} max={8000} onChange={(value) => updateSettings({ height: value })} suffix="px" stepper={false} disabled={settings.autoHeight} />
            </div>
            <Switch label={t('html.autoHeight')} description={t('html.autoHeightHint')} checked={settings.autoHeight} onChange={(autoHeight) => updateSettings({ autoHeight })} />
          </SettingsSection>
          <SettingsSection title={t('settings.output')}>
            <SegmentedControl
              label={t('settings.outputFormat')}
              value={settings.format}
              onChange={(format) => updateSettings({ format })}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'jpeg', label: 'JPG' },
                { value: 'webp', label: 'WebP' },
                { value: 'svg', label: 'SVG' },
              ]}
            />
            {settings.format !== 'svg' && (
              <SegmentedControl label={t('html.scale')} value={settings.scale} onChange={(scale) => updateSettings({ scale })} options={[1, 2, 3, 4].map((value) => ({ value, label: `${value}×` }))} />
            )}
            {['jpeg', 'webp'].includes(settings.format) && <Slider label={t('settings.quality')} value={settings.quality} min={40} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />}
            {settings.format !== 'jpeg' && <Switch label={t('pdf.transparent')} description={t('html.transparentHint')} checked={settings.transparent} onChange={(transparent) => updateSettings({ transparent })} />}
            {(!settings.transparent || settings.format === 'jpeg') && <ColorInput label={t('settings.backgroundColor')} value={settings.background} onChange={(value) => updateSettings({ background: value })} />}
          </SettingsSection>
          <PrivacyNote />
        </SettingsPanel>
      </div>
    </ToolLayout>
  )
}

function HtmlResult({ result, onAdjust }) {
  const { t } = useTranslation()
  const url = useObjectUrl(result.blob)
  const ext = result.format === 'svg' ? 'svg' : getImageFormat(result.format).ext
  return (
    <ToolLayout toolId={TOOL_ID}>
      <ResultView
        title={t('html.done')}
        onAdjust={onAdjust}
        extraActions={
          <Button variant="ghost" leftIcon={RotateCcw} onClick={onAdjust}>
            {t('html.backToCode')}
          </Button>
        }
        preview={<MediaStage checkerboard>{url && <img src={url} alt={t('result.result')} className="max-h-[62vh] max-w-full object-contain" />}</MediaStage>}
        exportProps={{ blob: result.blob, fileName: `snapshot.${ext}`, extension: ext, formatLabel: ext.toUpperCase(), width: result.width, height: result.height }}
      />
    </ToolLayout>
  )
}
