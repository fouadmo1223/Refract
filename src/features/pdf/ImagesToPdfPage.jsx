import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { imagesToPdf } from '@/services/pdf/pdfService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { OrderedFilesTool } from './shared/OrderedFilesTool'
import { PdfResult } from './shared/PdfResults'

const TOOL_ID = 'images-to-pdf'
const DEFAULTS = { pageSize: 'a4', orientation: 'auto', margin: 24, fit: 'contain', quality: 90 }
const MARGINS = { 0: 'none', 24: 'small', 48: 'medium', 72: 'large' }

export default function ImagesToPdfPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const fixedPage = settings.pageSize !== 'fit'

  return (
    <ToolLayout toolId={TOOL_ID}>
      <OrderedFilesTool
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        actionLabel={t('tools.images-to-pdf.action')}
        actionIcon={FileText}
        processingTitle={t('processing.creatingPdf')}
        successMessage="toasts.pdfCreated"
        renderSettings={() => (
          <>
            <SettingsSection title={t('pdf.pageSetup')}>
              <Select
                label={t('pdf.pageSize')}
                value={settings.pageSize}
                onChange={(pageSize) => updateSettings({ pageSize })}
                options={['a4', 'letter', 'legal', 'a5', 'fit'].map((value) => ({ value, label: t(`pdf.pageSizes.${value}`) }))}
              />
              {fixedPage && (
                <>
                  <SegmentedControl
                    label={t('pdf.orientation')}
                    value={settings.orientation}
                    onChange={(orientation) => updateSettings({ orientation })}
                    options={['auto', 'portrait', 'landscape'].map((value) => ({ value, label: t(`pdf.orientations.${value}`) }))}
                  />
                  <SegmentedControl
                    label={t('pdf.imageFit')}
                    value={settings.fit}
                    onChange={(fit) => updateSettings({ fit })}
                    options={[
                      { value: 'contain', label: t('pdf.fits.contain') },
                      { value: 'cover', label: t('pdf.fits.cover') },
                    ]}
                  />
                </>
              )}
              <SegmentedControl label={t('pdf.margin')} value={settings.margin} onChange={(margin) => updateSettings({ margin })} options={Object.entries(MARGINS).map(([value, id]) => ({ value: Number(value), label: t(`pdf.margins.${id}`) }))} />
            </SettingsSection>
            <SettingsSection title={t('settings.output')}>
              <Slider label={t('settings.quality')} value={settings.quality} min={40} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />
              <p className="-mt-1 text-xs text-muted">{t('pdf.imageQualityHint')}</p>
            </SettingsSection>
          </>
        )}
        process={(files, options) => imagesToPdf(files, settings, options)}
        renderResult={(context) => (
          <PdfResult {...context} file={{ name: context.files.length === 1 ? context.file.name : 'images', size: context.files.reduce((sum, file) => sum + file.size, 0) }} title={t('pdf.createdDone', { count: context.files.length })} suffix="" showSizeChange={false} />
        )}
      />
    </ToolLayout>
  )
}
