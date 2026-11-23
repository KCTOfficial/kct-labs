'use client'

import { SlugField } from '@payloadcms/next/client'
import {
  Button,
  CheckboxInput,
  Modal,
  TextField,
  useDocumentInfo,
  useField,
  useModal,
} from '@payloadcms/ui'
import { useEffect, useState, type ComponentProps } from 'react'

import { useAdminApi } from '@/collections/AppDocuments/components/useAdminApi'
import { legalDocPath } from '@/utilities/legal/paths'

import '@/collections/AppDocuments/components/legalAdmin.scss'

type Props = ComponentProps<typeof SlugField>

const MODAL_SLUG = 'slug-lock-modal'
/** The hidden virtual checkbox read by the guardSlugChange hook. */
const CONFIRM_PATH = 'confirmSlugChange'
const PUBLISHED_DOCS_LIMIT = 100
const ID_PREFIX = '/id'

type PublishedDocs = { docs: Array<{ slug?: string | null }>; totalDocs: number }

/**
 * While the app has published legal documents (linked from Google Play), the slug stays read-only
 * until the admin confirms the impact. Unlocking sets `confirmSlugChange`, so autosave never sends
 * an unconfirmed slug change that guardSlugChange would reject.
 */
export const SlugLockField = (props: Props) => {
  const { id } = useDocumentInfo()
  const confirm = useField<boolean>({ path: CONFIRM_PATH })
  const { setValue: setConfirm, value: confirmValue } = confirm
  const slug = useField<string>({ potentiallyStalePath: props.path })
  const { openModal, closeModal } = useModal()
  const api = useAdminApi()
  // undefined = loading, null = could not be loaded (fail closed: stay locked).
  const [published, setPublished] = useState<PublishedDocs | null | undefined>(
    id ? undefined : { docs: [], totalDocs: 0 },
  )
  const [isAcknowledged, setIsAcknowledged] = useState(false)
  // Kept in component state: the virtual confirmSlugChange may be dropped from form state after an
  // autosave, so it is re-applied below while the slug differs from the locked one.
  const [isUnlockedByUser, setIsUnlockedByUser] = useState(false)
  const [lockedSlug] = useState(() => slug.initialValue ?? slug.value)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    const query = new URLSearchParams({
      'where[app][equals]': String(id),
      'where[_status][equals]': 'published',
      depth: '0',
      limit: String(PUBLISHED_DOCS_LIMIT),
      'select[slug]': 'true',
    })
    void api<PublishedDocs>(`/app-documents?${query}`, controller.signal).then((result) => {
      if (!controller.signal.aborted) setPublished(result)
    })
    return () => controller.abort()
  }, [api, id])

  useEffect(() => {
    if (isUnlockedByUser && confirmValue !== true && slug.value !== lockedSlug) {
      setConfirm(true, true)
    }
  }, [confirmValue, isUnlockedByUser, lockedSlug, setConfirm, slug.value])

  const isUnlocked = isUnlockedByUser || confirm.value === true || published?.totalDocs === 0

  if (isUnlocked && published?.totalDocs === 0) return <SlugField {...props} />
  if (isUnlocked) return <TextField {...props} />

  const readOnlyField = { ...props.field, admin: { ...props.field.admin, readOnly: true } }
  const urls = (published?.docs ?? []).flatMap((doc) => {
    if (!doc.slug || !lockedSlug) return []
    const path = legalDocPath(lockedSlug, doc.slug)
    return [path, `${ID_PREFIX}${path}`]
  })

  const unlock = () => {
    setIsUnlockedByUser(true)
    confirm.setValue(true)
    closeModal(MODAL_SLUG)
  }

  return (
    <>
      <SlugField {...props} field={readOnlyField} />
      <p className="legal-admin__hint">
        Locked: published legal documents are linked from Google Play.
      </p>
      <Button
        buttonStyle="secondary"
        disabled={published === undefined}
        onClick={() => {
          setIsAcknowledged(false)
          openModal(MODAL_SLUG)
        }}
        size="small"
      >
        Unlock slug
      </Button>
      <Modal className="confirmation-modal slug-lock-modal" slug={MODAL_SLUG}>
        <div className="confirmation-modal__wrapper">
          <div className="confirmation-modal__content">
            <h2>Change the app slug?</h2>
            <p>
              These public URLs will return 404 after the slug changes. No redirect is created —
              update the links in Google Play Console.
            </p>
            {urls.length ? (
              <ul className="legal-admin__list">
                {urls.map((url) => (
                  <li key={url}>
                    <code>{url}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p>The list of published documents could not be loaded.</p>
            )}
            <CheckboxInput
              checked={isAcknowledged}
              id="slug-lock-acknowledge"
              label="I understand these URLs will break and will update Google Play Console."
              onToggle={(event) => setIsAcknowledged(event.target.checked)}
            />
          </div>
          <div className="confirmation-modal__controls">
            <Button buttonStyle="secondary" onClick={() => closeModal(MODAL_SLUG)} size="large">
              Cancel
            </Button>
            <Button disabled={!isAcknowledged} onClick={unlock} size="large">
              Unlock
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
