import { useState } from 'react'
import { Crop, FlipHorizontal2, FlipVertical2, Lock, LockOpen, RotateCcwSquare, RotateCwSquare, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ADJUSTMENT_RANGES, DEFAULT_ADJUSTMENTS } from '@/services/image/adjustments'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { NumberInput } from '@/components/ui/NumberInput'
import { Slider } from '@/components/ui/Slider'
import { Tabs } from '@/components/ui/Tabs'
import { SettingsSection } from '@/components/layout/Panels'
import { ADJUSTMENT_GROUPS, getEditedBaseSize } from './editorState'

export function AdjustmentsPanel({ adjustments, onLiveChange, onCommit }) {
  const { t } = useTranslation()
  return ADJUSTMENT_GROUPS.map((group) => (
    <SettingsSection key={group.id} title={t(`editor.groups.${group.id}`)}>
      {group.keys.map((key) => {
        const [min, max] = ADJUSTMENT_RANGES[key]
        const bipolar = min < 0
        return (
          <Slider
            key={key}
            label={t(`editor.adjustments.${key}`)}
            value={adjustments[key]}
            min={min}
            max={max}
            origin={bipolar ? 0 : undefined}
            onChange={(value) => onLiveChange({ ...adjustments, [key]: value })}
            onValueCommit={() => onCommit()}
            onDoubleClick={() => onCommit({ ...adjustments, [key]: DEFAULT_ADJUSTMENTS[key] })}
            formatValue={(value) => (key === 'opacity' ? `${value}%` : bipolar && value > 0 ? `+${value}` : String(value))}
          />
        )
      })}
    </SettingsSection>
  ))
}

export function TransformPanel({ meta, state, onCommit, cropMode, onCropStart, onCropApply, onCropCancel }) {
  const { t } = useTranslation()
  const [lockAspect, setLockAspect] = useState(true)
  const base = getEditedBaseSize(meta, state)
  const size = state.resize ?? base
  const ratio = base.width / base.height

  const setTransform = (patch) => onCommit({ ...state, transform: { ...state.transform, ...patch }, crop: null })
  const setSize = (key, value) => {
    const next = { ...size, [key]: value }
    if (lockAspect && Number.isFinite(value) && value > 0) {
      if (key === 'width') next.height = Math.max(1, Math.round(value / ratio))
      else next.width = Math.max(1, Math.round(value * ratio))
    }
    onCommit({ ...state, resize: next.width === base.width && next.height === base.height ? null : next })
  }

  return (
    <>
      <SettingsSection title={t('editor.rotateFlip')}>
        <div className="flex flex-wrap gap-1.5">
          <IconButton icon={RotateCcwSquare} label={t('crop.rotateLeft')} variant="secondary" onClick={() => setTransform({ rotation: (state.transform.rotation + 270) % 360 })} />
          <IconButton icon={RotateCwSquare} label={t('crop.rotateRight')} variant="secondary" onClick={() => setTransform({ rotation: (state.transform.rotation + 90) % 360 })} />
          <IconButton icon={FlipHorizontal2} label={t('crop.flipHorizontal')} variant="secondary" active={state.transform.flipH} aria-pressed={state.transform.flipH} onClick={() => setTransform({ flipH: !state.transform.flipH })} />
          <IconButton icon={FlipVertical2} label={t('crop.flipVertical')} variant="secondary" active={state.transform.flipV} aria-pressed={state.transform.flipV} onClick={() => setTransform({ flipV: !state.transform.flipV })} />
        </div>
      </SettingsSection>
      <SettingsSection title={t('editor.crop')}>
        {cropMode ? (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={onCropApply} className="flex-1">
              {t('editor.applyCrop')}
            </Button>
            <Button variant="secondary" size="sm" leftIcon={X} onClick={onCropCancel}>
              {t('common.cancel')}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={Crop} onClick={onCropStart} className="flex-1">
              {state.crop ? t('editor.editCrop') : t('editor.startCrop')}
            </Button>
            {state.crop && (
              <Button variant="ghost" size="sm" onClick={() => onCommit({ ...state, crop: null, resize: null })}>
                {t('editor.removeCrop')}
              </Button>
            )}
          </div>
        )}
      </SettingsSection>
      <SettingsSection title={t('editor.resize')}>
        <div className="flex items-start gap-2">
          <NumberInput label={t('settings.width')} value={size.width} min={1} onChange={(value) => setSize('width', value)} suffix="px" stepper={false} className="flex-1" />
          <IconButton icon={lockAspect ? Lock : LockOpen} label={t(lockAspect ? 'settings.unlockAspect' : 'settings.lockAspect')} active={lockAspect} aria-pressed={lockAspect} onClick={() => setLockAspect(!lockAspect)} className="mt-[26px]" />
          <NumberInput label={t('settings.height')} value={size.height} min={1} onChange={(value) => setSize('height', value)} suffix="px" stepper={false} className="flex-1" />
        </div>
      </SettingsSection>
    </>
  )
}

export function EditorSettings(props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('adjust')
  return (
    <>
      <Tabs
        variant="segmented"
        value={tab}
        onChange={setTab}
        aria-label={t('editor.panels')}
        className="w-full [&>button]:flex-1 [&>button]:justify-center"
        tabs={[
          { value: 'adjust', label: t('editor.tabs.adjust') },
          { value: 'transform', label: t('editor.tabs.transform') },
        ]}
      />
      {tab === 'adjust' ? (
        <AdjustmentsPanel adjustments={props.state.adjustments} onLiveChange={(adjustments) => props.onLiveChange({ ...props.state, adjustments })} onCommit={(adjustments) => props.onCommit(adjustments ? { ...props.state, adjustments } : undefined)} />
      ) : (
        <TransformPanel {...props} />
      )}
    </>
  )
}
