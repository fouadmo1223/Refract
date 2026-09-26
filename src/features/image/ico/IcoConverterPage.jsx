import { Grid2x2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { ICO_SIZES } from '@/constants/presets'
import { createIco } from '@/services/image/icoService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Checkbox } from '@/components/ui/Checkbox'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'image-ico'
const DEFAULTS = { sizes: [16, 32, 48, 256] }

export default function IcoConverterPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const toggleSize = (size, checked) => updateSettings({ sizes: checked ? [...settings.sizes, size] : settings.sizes.filter((value) => value !== size) })
  const allSelected = settings.sizes.length === ICO_SIZES.length

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        actionLabel={t('tools.image-ico.action')}
        actionIcon={Grid2x2}
        processingTitle={t('processing.creatingIcon')}
        successMessage="toasts.iconCreated"
        canProcess={settings.sizes.length > 0}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={({ meta }) => (
          <SettingsSection
            title={t('ico.sizes')}
            action={
              <Checkbox
                label={t('common.selectAll')}
                checked={allSelected}
                indeterminate={!allSelected && settings.sizes.length > 0}
                onChange={() => updateSettings({ sizes: allSelected ? [] : [...ICO_SIZES] })}
              />
            }
          >
            <div className="grid grid-cols-2 gap-2.5">
              {ICO_SIZES.map((size) => (
                <Checkbox key={size} label={`${size} × ${size}`} checked={settings.sizes.includes(size)} onChange={(checked) => toggleSize(size, checked)} />
              ))}
            </div>
            {settings.sizes.length === 0 && <p className="text-xs font-medium text-danger" role="alert">{t('validation.selectAtLeastOneSize')}</p>}
            {meta && meta.width !== meta.height && <p className="text-xs text-muted">{t('ico.nonSquareHint')}</p>}
          </SettingsSection>
        )}
        onProcess={({ file, onProgress }) => createIco(file, settings.sizes, { onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.iconComplete')} suffix="" compare={false} />}
      />
    </ToolLayout>
  )
}
