import { useTranslation } from 'react-i18next'
import { getImageFormat } from '@/constants/imageFormats'
import { Select } from '@/components/ui/Select'

/**
 * Output format picker. `includeOriginal` adds "Keep original (JPG)".
 */
export function FormatSelect({ value, onChange, formats, sourceFormat, includeOriginal = true, label, disabled }) {
  const { t } = useTranslation()
  const options = [
    ...(includeOriginal
      ? [{ value: 'original', label: t('settings.keepOriginal'), meta: sourceFormat ? getImageFormat(sourceFormat).label : undefined }]
      : []),
    ...formats.map((id) => ({
      value: id,
      label: getImageFormat(id).label,
      description: t(`formats.${id}`),
    })),
  ]
  return <Select label={label ?? t('settings.outputFormat')} value={value} onChange={onChange} options={options} disabled={disabled} />
}
