'use client'

import { FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import React from 'react'

import { AccentSwatchGroup } from './AccentSwatchGroup'

/** Admin field for `accentColor`: a grid of colour swatches instead of a free text input. */
export const AccentColorField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { errorMessage, setValue, showError, value } = useField<string>({ path })

  return (
    <div className="field-type accent-color">
      <FieldLabel label={field.label} path={path} />
      <AccentSwatchGroup disabled={readOnly} onChange={setValue} value={value || null} />
      <FieldError message={errorMessage} path={path} showError={showError} />
    </div>
  )
}
