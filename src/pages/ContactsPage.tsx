import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, ContactRound, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiRequestError, type ApiField, type ContactPage as ContactPageData, type ContactRecord, type ContactRequest } from '../api/apiClient'
import Dialog from '../components/ui/Dialog'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import { useApiKeys } from '../contexts/ApiKeyContext'

const pageSize = 20
const phonePattern = /^\+[1-9][0-9]{7,14}$/

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function ErrorNotice({ message }: { message: string }) {
  return <div role="alert" className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{message}</p></div>
}

function contactError(reason: unknown, fallback: string): string {
  if (!(reason instanceof ApiRequestError)) return reason instanceof Error ? reason.message : fallback
  if (reason.status === 409) return 'A contact with this phone number already exists. Use a different number.'
  return reason.message
}

function ContactFormDialog({ initial, onClose, onSaved }: { initial: ContactRecord | null; onClose: () => void; onSaved: (contact: ContactRecord) => void }) {
  const { createContact, updateContact } = useApiKeys()
  const [name, setName] = useState(initial?.name ?? '')
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ApiField, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedPhone = phoneNumber.trim()
    const trimmedEmail = email.trim()
    const trimmedDescription = description.trim()
    const errors: Partial<Record<ApiField, string>> = {}
    if (!trimmedName || trimmedName.length > 150) errors.name = 'Enter a name of up to 150 characters.'
    if (!phonePattern.test(trimmedPhone)) errors.phoneNumber = 'Use E.164 format: + followed by 8 to 15 digits.'
    if (trimmedEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 254)) errors.email = 'Enter a valid email address of up to 254 characters.'
    if (trimmedDescription.length > 1000) errors.description = 'Description must not exceed 1000 characters.'
    setFieldErrors(errors)
    setError(null)
    if (Object.keys(errors).length > 0) return
    const request: ContactRequest = {
      name: trimmedName,
      phoneNumber: trimmedPhone,
      email: trimmedEmail || null,
      description: trimmedDescription || null,
    }
    setSaving(true)
    try {
      const result = initial ? await updateContact(initial.id, request) : await createContact(request)
      onSaved(result)
    } catch (reason) {
      setError(contactError(reason, 'Could not save this contact.'))
      if (reason instanceof ApiRequestError) setFieldErrors(reason.fieldErrors)
    } finally {
      setSaving(false)
    }
  }

  const clearError = (field: ApiField) => setFieldErrors((current) => ({ ...current, [field]: undefined }))

  return <Dialog labelledBy="contact-form-title" onClose={() => { if (!saving) onClose() }} className="max-w-xl">
    <div className="flex items-start justify-between gap-3"><div><h2 id="contact-form-title" className="text-lg font-semibold tracking-tight">{initial ? 'Edit contact' : 'Create contact'}</h2><p className="mt-1 text-sm text-muted">Contact information is scoped to your connected tenant.</p></div><button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Close</button></div>
    {error && <div className="mt-4"><ErrorNotice message={error} /></div>}
    <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Name</span><input value={name} onChange={(event) => { setName(event.target.value); clearError('name') }} maxLength={150} autoComplete="name" required aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined} className="h-10 w-full rounded-md border border-line px-3 text-sm focus:border-brand-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />{fieldErrors.name && <span id="contact-name-error" className="mt-1 block text-sm text-rose-700">{fieldErrors.name}</span>}</label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Phone number</span><input type="tel" inputMode="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => { setPhoneNumber(event.target.value); clearError('phoneNumber') }} placeholder="+14155550123" maxLength={16} required aria-invalid={Boolean(fieldErrors.phoneNumber)} aria-describedby={fieldErrors.phoneNumber ? 'contact-phone-error' : undefined} className="h-10 w-full rounded-md border border-line px-3 text-sm focus:border-brand-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />{fieldErrors.phoneNumber && <span id="contact-phone-error" className="mt-1 block text-sm text-rose-700">{fieldErrors.phoneNumber}</span>}<span className="mt-1 block text-xs text-muted">Use E.164 format: + and 8 to 15 digits.</span></label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Email <span className="font-normal text-muted">(optional)</span></span><input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); clearError('email') }} maxLength={254} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined} className="h-10 w-full rounded-md border border-line px-3 text-sm focus:border-brand-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />{fieldErrors.email && <span id="contact-email-error" className="mt-1 block text-sm text-rose-700">{fieldErrors.email}</span>}</label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Description <span className="font-normal text-muted">(optional)</span></span><textarea value={description} onChange={(event) => { setDescription(event.target.value); clearError('description') }} maxLength={1000} rows={3} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? 'contact-description-error' : undefined} className="w-full resize-y rounded-md border border-line px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />{fieldErrors.description && <span id="contact-description-error" className="mt-1 block text-sm text-rose-700">{fieldErrors.description}</span>}<span className="mt-1 block text-right text-xs text-muted">{description.length}/1000</span></label>
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Cancel</button><button type="submit" disabled={saving} className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">{saving ? 'Saving…' : initial ? 'Save changes' : 'Create contact'}</button></div>
    </form>
  </Dialog>
}

function ContactDetailDialog({ contactId, onClose, onEdit, onDelete }: { contactId: string; onClose: () => void; onEdit: (contact: ContactRecord) => void; onDelete: (contact: ContactRecord) => void }) {
  const { getContact } = useApiKeys()
  const [contact, setContact] = useState<ContactRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getContact(contactId)
      .then((result) => { if (!cancelled) setContact(result) })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load contact details.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [contactId, getContact])

  return <Dialog labelledBy="contact-detail-title" onClose={onClose} className="max-w-xl">
    <div className="flex items-start justify-between gap-3"><div><h2 id="contact-detail-title" className="text-lg font-semibold tracking-tight">Contact details</h2><p className="mt-1 break-all font-mono text-xs text-muted">{contactId}</p></div><button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Close</button></div>
    {loading && <div role="status" aria-label="Loading contact details" className="mt-5 space-y-3"><span className="block h-4 w-44 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-60 animate-pulse rounded bg-slate-100" /></div>}
    {error && <div className="mt-4"><ErrorNotice message={error} /></div>}
    {contact && <><dl className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2"><div className="min-w-0"><dt className="text-xs font-medium text-muted">Name</dt><dd className="mt-1 break-words text-sm font-medium">{contact.name}</dd></div><div className="min-w-0"><dt className="text-xs font-medium text-muted">Phone number</dt><dd className="mt-1 break-all text-sm">{contact.phoneNumber}</dd></div><div className="min-w-0"><dt className="text-xs font-medium text-muted">Email</dt><dd className="mt-1 break-all text-sm">{contact.email || 'Not provided'}</dd></div><div className="min-w-0 sm:col-span-2"><dt className="text-xs font-medium text-muted">Description</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{contact.description || 'No description'}</dd></div><div><dt className="text-xs font-medium text-muted">Created</dt><dd className="mt-1 text-sm">{formatDate(contact.createdAt)}</dd></div><div><dt className="text-xs font-medium text-muted">Updated</dt><dd className="mt-1 text-sm">{formatDate(contact.updatedAt)}</dd></div></dl><div className="mt-5 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between"><button type="button" onClick={() => onDelete(contact)} className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><Trash2 className="size-4" aria-hidden="true" />Delete</button><button type="button" onClick={() => onEdit(contact)} className="inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><Pencil className="size-4" aria-hidden="true" />Edit contact</button></div></>}
  </Dialog>
}

export default function ContactsPage() {
  const { connected, connectionError, sessionRevision, listContacts, deleteContact } = useApiKeys()
  const [pageData, setPageData] = useState<ContactPageData | null>(null)
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [formInitial, setFormInitial] = useState<ContactRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContactRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!connected) {
      setPageData(null)
      setListError(null)
      setActionMessage(null)
      setDetailId(null)
      setDeleteTarget(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setListError(null)
    listContacts(page, pageSize, search || undefined)
      .then((result) => { if (!cancelled) setPageData(result) })
      .catch((reason: unknown) => { if (!cancelled) setListError(reason instanceof Error ? reason.message : 'Unable to load contacts.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [connected, listContacts, page, reload, search, sessionRevision])

  const openCreate = () => { setActionMessage(null); setActionError(null); setFormInitial(null); setFormOpen(true) }
  const openEdit = (contact: ContactRecord) => { setActionMessage(null); setActionError(null); setDetailId(null); setFormInitial(contact); setFormOpen(true) }
  const saved = (contact: ContactRecord) => {
    const wasEditing = formInitial !== null
    setFormOpen(false)
    setFormInitial(null)
    setActionError(null)
    setActionMessage(`Contact ${contact.name} ${wasEditing ? 'updated' : 'created'}.`)
    if (searchInput) setSearchInput('')
    setPage(0)
    setReload((value) => value + 1)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    const target = deleteTarget
    setDeleting(true)
    setActionMessage(null)
    setActionError(null)
    try {
      await deleteContact(target.id)
      setDeleteTarget(null)
      setDetailId(null)
      setActionMessage(`Contact ${target.name} deleted.`)
      if (pageData?.content.length === 1 && page > 0) setPage((value) => value - 1)
      else setReload((value) => value + 1)
    } catch (reason) {
      setActionError(contactError(reason, 'Could not delete this contact.'))
    } finally {
      setDeleting(false)
    }
  }

  if (!connected) return <div className="space-y-6"><PageHeader title="Contacts" description="Manage the contact details available to your tenant." /><section className="rounded-lg border border-line bg-white p-5"><h2 className="text-sm font-semibold">Connect to manage contacts</h2><p className="mt-1 text-sm text-muted">An existing tenant API key is required to view or edit contacts.{connectionError ? ` ${connectionError}` : ''}</p><Link to="/api-keys" className="mt-3 inline-flex rounded-md bg-navy-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Connect API key</Link></section></div>

  return <div className="space-y-7 sm:space-y-8">
    <PageHeader title="Contacts" description="Manage tenant contacts and keep recipient details ready for message requests." />
    <section aria-labelledby="contacts-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="contacts-heading" className="text-sm font-semibold">Contact list</h2><p className="mt-1 text-sm text-muted">{pageData ? `${pageData.totalElements} contact${pageData.totalElements === 1 ? '' : 's'} in this tenant` : 'Search by name or phone-number prefix.'}</p></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />Refresh</button><button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-3 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><Plus className="size-4" aria-hidden="true" />Create contact</button></div></div>
      <label className="relative block max-w-xl"><span className="sr-only">Search contacts by name or phone number</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(0); setActionMessage(null) }} maxLength={150} placeholder="Search by name or phone number" className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" /></label>
      {actionMessage && <div role="status" className="rounded-md border border-brand-100 bg-brand-50 px-3.5 py-3 text-sm text-ink">{actionMessage}</div>}
      {actionError && <ErrorNotice message={actionError} />}
      {listError && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><ErrorNotice message={listError} /><button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} className="shrink-0 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Retry</button></div>}
      {loading ? <div role="status" aria-label="Loading contacts" className="space-y-3 rounded-lg border border-line bg-white p-5"><span className="block h-4 w-40 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-2/3 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-1/3 animate-pulse rounded bg-slate-100" /></div> : !listError && pageData?.content.length === 0 ? <EmptyState icon={ContactRound} title={search ? 'No contacts match this search' : 'No contacts yet'} description={search ? 'Try a different name or phone-number prefix.' : 'Create a contact to keep recipient details available in your tenant.'} /> : !listError && pageData && <ul className="space-y-3">{pageData.content.map((contact) => <li key={contact.id} className="min-w-0 rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{contact.name}</h3><p className="mt-1 break-all text-sm text-muted">{contact.phoneNumber}</p>{contact.email && <p className="mt-1 break-all text-sm text-muted">{contact.email}</p>}{contact.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{contact.description}</p>}<p className="mt-3 text-xs text-muted">Updated {formatDate(contact.updatedAt)}</p></div><div className="flex flex-wrap gap-2 sm:justify-end"><button type="button" onClick={() => setDetailId(contact.id)} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Details</button><button type="button" onClick={() => openEdit(contact)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><Pencil className="size-3.5" aria-hidden="true" />Edit</button><button type="button" disabled={deleting} onClick={() => setDeleteTarget(contact)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-rose-700 hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><Trash2 className="size-3.5" aria-hidden="true" />Delete</button></div></div></li>)}</ul>}
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted">{pageData && pageData.totalPages > 0 ? `Page ${pageData.page + 1} of ${pageData.totalPages}` : 'No pages'}</span><div className="flex gap-2"><button type="button" disabled={!pageData?.hasPrevious || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><ArrowLeft className="size-4" aria-hidden="true" />Previous</button><button type="button" disabled={!pageData?.hasNext || loading} onClick={() => setPage((value) => value + 1)} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Next<ArrowRight className="size-4" aria-hidden="true" /></button></div></div>
    </section>
    {formOpen && <ContactFormDialog initial={formInitial} onClose={() => { setFormOpen(false); setFormInitial(null) }} onSaved={saved} />}
    {detailId && <ContactDetailDialog contactId={detailId} onClose={() => setDetailId(null)} onEdit={openEdit} onDelete={(contact) => { setDetailId(null); setDeleteTarget(contact) }} />}
    {deleteTarget && <Dialog labelledBy="delete-contact-title" onClose={() => { if (!deleting) setDeleteTarget(null) }} className="max-w-md"><h2 id="delete-contact-title" className="text-lg font-semibold tracking-tight">Delete contact?</h2><p className="mt-2 text-sm leading-relaxed text-muted">Delete <strong className="font-semibold text-ink">{deleteTarget.name}</strong> ({deleteTarget.phoneNumber}) from this tenant? This cannot be undone.</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Cancel</button><button type="button" disabled={deleting} onClick={() => void confirmDelete()} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">{deleting ? 'Deleting…' : 'Delete contact'}</button></div></Dialog>}
  </div>
}
