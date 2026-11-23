import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, ContactRound, MessageSquareText, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import Dialog from '../components/ui/Dialog'
import { ApiRequestError, type ApiField, type ContactRecord, type CreateMessageRequest, type MessageRecord, type MessageStatus, type MessageStatusHistoryRecord } from '../api/apiClient'
import { useApiKeys, type PendingMessageAttempt } from '../contexts/ApiKeyContext'

const statuses: MessageStatus[] = ['QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'SIMULATED', 'FAILED']
const phonePattern = /^\+[1-9][0-9]{7,14}$/
const pageSize = 10

type AbandonResolution =
  | { kind: 'new'; request: CreateMessageRequest }
  | { kind: 'discard' }

function createIdempotencyKey(): string {
  if (typeof crypto === 'undefined') throw new Error('Secure random number generation is unavailable.')
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function isAmbiguousSubmissionFailure(reason: unknown): boolean {
  if (!(reason instanceof ApiRequestError)) return false
  return reason.status === null || reason.status >= 500 || (reason.status >= 200 && reason.status < 300)
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function statusDescription(status: MessageStatus): string {
  switch (status) {
    case 'QUEUED': return 'Accepted into the OpenSMS processing queue; this does not confirm delivery.'
    case 'PROCESSING': return 'Currently being processed; this does not confirm delivery.'
    case 'SIMULATED': return 'Handled by the mock gateway; it was not delivered to a mobile phone.'
    case 'SENT': return 'Accepted by a non-simulated gateway; this does not confirm delivery.'
    case 'DELIVERED': return 'OpenSMS reports DELIVERED, but this API does not provide carrier receipt or delivery evidence.'
    case 'FAILED': return 'Message processing or submission failed.'
  }
}

function MessageStatusBadge({ status }: { status: MessageStatus }) {
  const tone = status === 'SIMULATED' ? 'bg-amber-50 text-amber-800' : status === 'FAILED' ? 'bg-rose-50 text-rose-800' : status === 'DELIVERED' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-700'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{status}</span>
}

function ErrorNotice({ message }: { message: string }) {
  return <div role="alert" className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{message}</p></div>
}

function MessageDialog({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const { getMessage, getMessageHistory } = useApiKeys()
  const [message, setMessage] = useState<MessageRecord | null>(null)
  const [history, setHistory] = useState<MessageStatusHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getMessage(messageId), getMessageHistory(messageId)])
      .then(([record, entries]) => {
        if (cancelled) return
        setMessage(record)
        setHistory([...entries].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)))
      })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load message details.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [getMessage, getMessageHistory, messageId])

  return (
    <Dialog labelledBy="message-detail-title" onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-3"><div><h2 id="message-detail-title" className="text-lg font-semibold tracking-tight">Message details</h2><p className="mt-1 break-all font-mono text-xs text-muted">{messageId}</p></div><button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Close</button></div>
      {loading && <div role="status" aria-label="Loading message details" className="mt-5 space-y-3"><span className="block h-4 w-40 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-64 animate-pulse rounded bg-slate-100" /></div>}
      {error && <div className="mt-4"><ErrorNotice message={error} /></div>}
      {message && <>
        <dl className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2"><div><dt className="text-xs font-medium text-muted">Destination</dt><dd className="mt-1 break-all text-sm">{message.destinationPhoneNumber}</dd></div><div><dt className="text-xs font-medium text-muted">Status</dt><dd className="mt-1"><MessageStatusBadge status={message.status} /><p className="mt-1 text-xs leading-relaxed text-muted">{statusDescription(message.status)}</p></dd></div><div><dt className="text-xs font-medium text-muted">Created</dt><dd className="mt-1 text-sm">{formatDate(message.createdAt)}</dd></div><div><dt className="text-xs font-medium text-muted">Updated</dt><dd className="mt-1 text-sm">{formatDate(message.updatedAt)}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-medium text-muted">Message body</dt><dd className="mt-1 whitespace-pre-wrap break-words rounded-md bg-canvas p-3 text-sm">{message.body}</dd></div></dl>
        <section aria-labelledby="history-heading" className="mt-6 border-t border-line pt-5"><h3 id="history-heading" className="text-sm font-semibold">Status history</h3><p className="mt-1 text-xs text-muted">Chronological status changes reported by the API.</p>{history.length === 0 ? <p className="mt-3 rounded-md border border-line bg-canvas p-3 text-sm text-muted">No status history is available for this message.</p> : <ol className="mt-3 space-y-3">{history.map((entry) => <li key={entry.id} className="flex flex-col gap-1 rounded-md border border-line p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{entry.previousStatus ? `${entry.previousStatus} → ` : ''}{entry.newStatus}</p><p className="mt-0.5 text-xs text-muted">Source: {entry.changeSource}</p></div><time className="text-xs text-muted" dateTime={entry.timestamp}>{formatDate(entry.timestamp)}</time></li>)}</ol>}</section>
      </>}
    </Dialog>
  )
}

export default function MessagesPage() {
  const { connected, connectionError, sessionRevision, listMessages, createMessage, listContacts, pendingMessageAttempt: pendingAttempt, setPendingMessageAttempt: setPendingAttempt } = useApiKeys()
  const [destination, setDestination] = useState('')
  const [body, setBody] = useState('')
  const destinationRef = useRef('')
  const bodyRef = useRef('')
  const submissionInFlightRef = useRef(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ApiField, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<MessageRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [abandonResolution, setAbandonResolution] = useState<AbandonResolution | null>(null)
  const [records, setRecords] = useState<MessageRecord[]>([])
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<'' | MessageStatus>('')
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [contactSearchInput, setContactSearchInput] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setContactSearch(contactSearchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [contactSearchInput])

  useEffect(() => {
    if (!connected) {
      setContacts([])
      setContactsError(null)
      setSelectedContactId('')
      return
    }
    let cancelled = false
    setContactsLoading(true)
    setContactsError(null)
    listContacts(0, 20, contactSearch || undefined)
      .then((result) => { if (!cancelled) setContacts(result.content) })
      .catch((reason: unknown) => { if (!cancelled) setContactsError(reason instanceof Error ? reason.message : 'Unable to load saved contacts.') })
      .finally(() => { if (!cancelled) setContactsLoading(false) })
    return () => { cancelled = true }
  }, [connected, contactSearch, listContacts, sessionRevision])

  useEffect(() => {
    if (!connected) {
      setRecords([])
      setTotalElements(0)
      setTotalPages(0)
      setListError(null)
      setSubmitted(null)
      setDetailId(null)
      setPendingAttempt(null)
      setAbandonResolution(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setListError(null)
    listMessages(page, pageSize, status || undefined)
      .then((result) => {
        if (cancelled) return
        setRecords(result.content)
        setTotalElements(result.totalElements)
        setTotalPages(result.totalPages)
        setHasNext(result.hasNext)
        setHasPrevious(result.hasPrevious)
      })
      .catch((reason: unknown) => { if (!cancelled) setListError(reason instanceof Error ? reason.message : 'Unable to load messages.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [connected, listMessages, page, reload, sessionRevision, status])

  const sendAttempt = async (attempt: PendingMessageAttempt) => {
    if (submissionInFlightRef.current) return
    submissionInFlightRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    setSubmitted(null)
    try {
      const result = await createMessage(attempt.request, attempt.idempotencyKey)
      setSubmitted(result)
      setPendingAttempt(null)
      if (destinationRef.current.trim() === attempt.request.destinationPhoneNumber && bodyRef.current === attempt.request.body) {
        destinationRef.current = ''
        bodyRef.current = ''
        setDestination('')
        setBody('')
        setSelectedContactId('')
      }
      setPage(0)
      setReload((value) => value + 1)
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.status === 409) {
        setPendingAttempt(null)
        setSubmitError('OpenSMS rejected this idempotency key because it is already associated with a different message. No new key was generated. Review the request before starting another attempt.')
      } else if (isAmbiguousSubmissionFailure(reason)) {
        setPendingAttempt(attempt)
        setSubmitError('OpenSMS could not confirm whether this request was accepted. The original request is available for a safe retry.')
      } else {
        setPendingAttempt(null)
        setSubmitError(reason instanceof ApiRequestError ? reason.message : 'Could not submit the message. Please review the request and try again.')
        if (reason instanceof ApiRequestError) setFieldErrors(reason.fieldErrors)
      }
    } finally {
      submissionInFlightRef.current = false
      setSubmitting(false)
    }
  }

  const startNewAttempt = (request: CreateMessageRequest) => {
    try {
      void sendAttempt({ idempotencyKey: createIdempotencyKey(), request })
    } catch {
      setSubmitError('Secure message submission is unavailable in this browser. No request was sent.')
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submissionInFlightRef.current) return
    const request: CreateMessageRequest = { destinationPhoneNumber: destination.trim(), body }
    const errors: Partial<Record<ApiField, string>> = {}
    if (!phonePattern.test(request.destinationPhoneNumber)) errors.destinationPhoneNumber = 'Use E.164 format: + followed by 8 to 15 digits.'
    if (!request.body.trim()) errors.body = 'Enter a message body.'
    setFieldErrors(errors)
    setSubmitError(null)
    setSubmitted(null)
    if (Object.keys(errors).length > 0) return

    if (pendingAttempt) {
      const samePayload = pendingAttempt.request.destinationPhoneNumber === request.destinationPhoneNumber
        && pendingAttempt.request.body === request.body
      if (samePayload) void sendAttempt(pendingAttempt)
      else setAbandonResolution({ kind: 'new', request })
      return
    }
    startNewAttempt(request)
  }

  const resolveAbandonment = () => {
    const resolution = abandonResolution
    setAbandonResolution(null)
    setPendingAttempt(null)
    if (resolution?.kind === 'new') startNewAttempt(resolution.request)
  }

  if (!connected) return <div className="space-y-6"><PageHeader title="Messages" description="Submit messages and review the status information reported by OpenSMS." /><section className="rounded-lg border border-line bg-white p-5"><h2 className="text-sm font-semibold">Connect to view messages</h2><p className="mt-1 text-sm text-muted">An existing tenant API key is required to access message records.{connectionError ? ` ${connectionError}` : ''}</p><Link to="/api-keys" className="mt-3 inline-flex rounded-md bg-navy-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Connect API key</Link></section></div>

  return (
    <div className="space-y-7 sm:space-y-8">
      <PageHeader title="Messages" description="Submit a message request and review the message records and statuses returned by OpenSMS." />
      <div className="rounded-md border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm leading-relaxed text-amber-950">A <strong>SIMULATED</strong> status means the mock gateway handled the request; it does not mean a message reached a mobile phone. Carrier delivery receipts are not available here.</div>

      <section aria-labelledby="send-message-heading" className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5">
        <h2 id="send-message-heading" className="text-sm font-semibold">Submit a message</h2>
        <p className="mt-1 text-sm text-muted">Destination must use E.164 format with 8 to 15 digits after the country code.</p>
        {submitError && !pendingAttempt && <div className="mt-4"><ErrorNotice message={submitError} /></div>}
        {submitted && <div role="status" className="mt-4 rounded-md border border-brand-100 bg-brand-50 px-3.5 py-3 text-sm text-ink"><p className="font-semibold">Message request accepted by OpenSMS — <MessageStatusBadge status={submitted.status} /></p><p className="mt-1">This confirms the API accepted the request; it does not confirm delivery. {statusDescription(submitted.status)}</p><p className="mt-1 break-all font-mono text-xs text-muted">Message ID: {submitted.id}</p></div>}
        {pendingAttempt && <section role="alert" aria-labelledby="pending-attempt-heading" className="mt-4 space-y-3 rounded-md border border-amber-200 bg-amber-50/70 p-3.5 text-sm text-amber-950">
          <div><h3 id="pending-attempt-heading" className="font-semibold">Submission outcome is unresolved</h3><p className="mt-1 leading-relaxed">{submitError ?? 'OpenSMS could not confirm whether this request was accepted.'} Retry the original attempt to reuse its key and exact payload. The backend will replay an accepted request rather than intentionally create another message.</p></div>
          <dl className="grid min-w-0 gap-2 rounded-md border border-amber-200/80 bg-white/70 p-3"><div><dt className="text-xs font-medium text-amber-900">Original destination</dt><dd className="mt-0.5 break-all text-sm">{pendingAttempt.request.destinationPhoneNumber}</dd></div><div><dt className="text-xs font-medium text-amber-900">Original message</dt><dd className="mt-0.5 whitespace-pre-wrap break-words text-sm">{pendingAttempt.request.body}</dd></div></dl>
          <div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={submitting} onClick={() => void sendAttempt(pendingAttempt)} className="inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">{submitting ? 'Retrying…' : 'Retry original attempt'}</button><button type="button" disabled={submitting} onClick={() => setAbandonResolution({ kind: 'discard' })} className="rounded-md border border-amber-300 bg-white px-3.5 py-2 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Abandon attempt</button></div>
          <p className="text-xs leading-relaxed">If you edit the composer and start a different submission, the earlier request may already have been accepted, so the new message could be a duplicate.</p>
        </section>}
        <form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="message-contact-search">Choose a saved contact <span className="font-normal text-muted">(optional)</span></label>
            <div className="grid gap-2 sm:grid-cols-2">
              <input id="message-contact-search" type="search" value={contactSearchInput} onChange={(event) => { setContactSearchInput(event.target.value); setSelectedContactId('') }} maxLength={150} placeholder="Search by name or phone number" className="h-10 min-w-0 rounded-md border border-line px-3 text-sm focus:border-brand-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />
              <select aria-label="Select a saved contact" value={selectedContactId} onChange={(event) => { const selected = contacts.find((contact) => contact.id === event.target.value); setSelectedContactId(event.target.value); if (selected) { destinationRef.current = selected.phoneNumber; setDestination(selected.phoneNumber); setFieldErrors((current) => ({ ...current, destinationPhoneNumber: undefined })) } }} disabled={contactsLoading || contacts.length === 0} className="h-10 min-w-0 rounded-md border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:bg-slate-50">
                <option value="">{contactsLoading ? 'Loading contacts…' : contacts.length === 0 ? 'No matching contacts' : 'Select a contact'}</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} · {contact.phoneNumber}</option>)}
              </select>
            </div>
            {contactsError ? <p role="status" className="mt-1.5 text-xs text-rose-700">Saved contacts could not be loaded. You can still enter a phone number manually.</p> : <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted"><ContactRound className="size-3.5" aria-hidden="true" />Selecting a contact fills the phone field; it does not confirm message delivery.</p>}
          </div>
          <label className="min-w-0 sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Destination phone number</span><input type="tel" inputMode="tel" autoComplete="tel" value={destination} onChange={(event) => { destinationRef.current = event.target.value; setDestination(event.target.value); setSelectedContactId(''); setFieldErrors((current) => ({ ...current, destinationPhoneNumber: undefined })) }} placeholder="+14155550123" aria-invalid={Boolean(fieldErrors.destinationPhoneNumber)} aria-describedby={fieldErrors.destinationPhoneNumber ? 'destination-error' : undefined} required pattern="\+[1-9][0-9]{7,14}" className="h-10 w-full min-w-0 rounded-md border border-line px-3 text-sm focus:border-brand-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />{fieldErrors.destinationPhoneNumber && <span id="destination-error" className="mt-1 block text-sm text-rose-700">{fieldErrors.destinationPhoneNumber}</span>}</label>
          <label className="min-w-0 sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Message body</span><textarea value={body} onChange={(event) => { bodyRef.current = event.target.value; setBody(event.target.value); setFieldErrors((current) => ({ ...current, body: undefined })) }} rows={4} required aria-invalid={Boolean(fieldErrors.body)} aria-describedby={fieldErrors.body ? 'body-error' : undefined} className="w-full resize-y rounded-md border border-line px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />{fieldErrors.body && <span id="body-error" className="mt-1 block text-sm text-rose-700">{fieldErrors.body}</span>}</label>
          <div className="sm:col-span-2"><button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">{submitting ? 'Submitting…' : pendingAttempt && pendingAttempt.request.destinationPhoneNumber === destination.trim() && pendingAttempt.request.body === body ? 'Retry same attempt' : pendingAttempt ? 'Start different submission' : 'Submit message'}</button></div>
        </form>
      </section>

      <section aria-labelledby="message-records-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="message-records-heading" className="text-sm font-semibold">Message records</h2><p className="mt-1 text-sm text-muted">{totalElements} record{totalElements === 1 ? '' : 's'} across all pages</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-sm"><span className="font-medium">Status</span><select value={status} onChange={(event) => { setStatus(event.target.value as '' | MessageStatus); setPage(0) }} className="h-9 rounded-md border border-line bg-white px-2.5 text-sm focus:border-brand-500 focus:outline-none"><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh</button></div></div>
        {listError && <ErrorNotice message={listError} />}
        {loading ? <div role="status" aria-label="Loading messages" className="space-y-3 rounded-lg border border-line bg-white p-5"><span className="block h-4 w-40 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-2/3 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-1/3 animate-pulse rounded bg-slate-100" /></div> : records.length === 0 ? <EmptyState icon={MessageSquareText} title="No messages found" description={status ? 'No message records match this status filter.' : 'Submitted message records will appear here.'} /> : <ul className="space-y-3">{records.map((message) => <li key={message.id} className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2.5"><h3 className="break-all text-sm font-semibold">{message.destinationPhoneNumber}</h3><MessageStatusBadge status={message.status} /></div><p className="mt-1 text-xs leading-relaxed text-muted">{statusDescription(message.status)}</p><p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-muted">{message.body}</p><p className="mt-2 text-xs text-muted">Created {formatDate(message.createdAt)} · ID <span className="break-all font-mono">{message.id}</span></p></div><button type="button" onClick={() => setDetailId(message.id)} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:self-center">View details <ArrowRight className="size-4" aria-hidden="true" /></button></div></li>)}</ul>}
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted">{totalPages === 0 ? 'No pages' : `Page ${page + 1} of ${totalPages}`}</span><div className="flex gap-2"><button type="button" disabled={!hasPrevious || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><ArrowLeft className="size-4" aria-hidden="true" /> Previous</button><button type="button" disabled={!hasNext || loading} onClick={() => setPage((value) => value + 1)} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Next <ArrowRight className="size-4" aria-hidden="true" /></button></div></div>
      </section>
      {detailId && <MessageDialog messageId={detailId} onClose={() => setDetailId(null)} />}
      {abandonResolution && <Dialog labelledBy="abandon-attempt-title" onClose={() => setAbandonResolution(null)} className="max-w-lg">
        <h2 id="abandon-attempt-title" className="text-lg font-semibold tracking-tight">{abandonResolution.kind === 'new' ? 'Start a different submission?' : 'Abandon this attempt?'}</h2>
        {abandonResolution.kind === 'new' ? <p className="mt-2 text-sm leading-relaxed text-muted">The earlier request may already have been accepted. Starting this new message with a fresh key could create a duplicate. The original safe retry will be discarded if you continue.</p> : <p className="mt-2 text-sm leading-relaxed text-muted">The earlier request may already have been accepted. Abandoning it removes the safe retry; review the message list before deciding whether to submit it again.</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setAbandonResolution(null)} className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Keep original attempt</button><button type="button" onClick={resolveAbandonment} className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">{abandonResolution.kind === 'new' ? 'Start new submission' : 'Abandon safe retry'}</button></div>
      </Dialog>}
    </div>
  )
}
