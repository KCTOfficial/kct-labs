'use client'

import { Button, FieldError, FieldLabel, Modal, useField, useModal } from '@payloadcms/ui'
import type { LucideIcon } from 'lucide-react'
import type { TextFieldClientComponent } from 'payload'
import React from 'react'

import { ICON_MAP } from '@/components/site/iconMap'
import { appIconNames } from '@/fields/appIcons'
import { siteIconNames } from '@/fields/iconSelect'

import { IconPickerGrid } from './IconPickerGrid'
import './iconPicker.scss'

const LABELS = { search: 'Search icons', clear: 'Clear selection', empty: 'No icons match.' }

/**
 * Admin field: shows the chosen icon and opens a popup grid to change it. Works for the app icon
 * text field (`iconSet: 'app'`, the full registry) and for Home's 20-name select (`iconSet: 'site'`).
 */
export const IconPickerField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { errorMessage, setValue, showError, value } = useField<string>({ path })
  const { closeModal, openModal } = useModal()
  const slug = `icon-picker-${path.replace(/[^a-zA-Z0-9]/g, '-')}`
  const names = field.admin?.custom?.iconSet === 'site' ? siteIconNames : appIconNames
  const required = Boolean(field.required)
  const Preview = value ? (ICON_MAP as Record<string, LucideIcon | undefined>)[value] : undefined

  return (
    <div className="field-type icon-picker">
      <FieldLabel label={field.label} path={path} required={required} />
      <Button
        buttonStyle="secondary"
        disabled={readOnly}
        onClick={() => openModal(slug)}
        size="medium"
      >
        <span className="icon-picker__trigger">
          {Preview ? <Preview aria-hidden="true" className="icon-picker__glyph" /> : null}
          {value || 'Choose icon'}
        </span>
      </Button>
      <FieldError message={errorMessage} path={path} showError={showError} />
      <Modal className="icon-picker-modal" slug={slug}>
        <IconPickerGrid
          allowClear={!required}
          labels={LABELS}
          names={names}
          onSelect={(name) => {
            setValue(name)
            closeModal(slug)
          }}
          value={value ?? null}
        />
      </Modal>
    </div>
  )
}
