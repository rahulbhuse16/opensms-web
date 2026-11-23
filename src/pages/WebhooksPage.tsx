import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, Check, Copy, ExternalLink, Plus, RefreshCw, Webhook as WebhookIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import Dialog from '../components/ui/Dialog'
import { ApiRequestError, type CreatedWebhookSubscription, type WebhookEventType, type WebhookStatus, type WebhookSubscription } from '../api/apiClient'
import { useApiKeys } from '../contexts/ApiKeyContext'

const eventTypes: WebhookEventType[] = ['message.queued', 'message.simulated', 'message.sent', 'message.failed']

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function validHttpsUrl(value: string): boolean {
  if (value.length === 0 || value.length > 2048) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !parsed.username && !parsed.password && !parsed.hash
  } catch {
    return false
  }
}

function ErrorNotice({ message }: { message: string }) {
  return <div role="alert" className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{message}</p></div>
}

function StatusBadge({ status }: { status: WebhookStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status === 'ACTIVE' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-700'}`}>{status}</span>
}

function SigningSecretDialog({ webhook, onClose }: { webhook: CreatedWebhookSubscription; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const copySecret = async () => {
    setCopyError(false)
    try {
      await navigator.clipboard.writeText(webhook.signingSecret)
      setCopied(true)
    } catch {
      setCopyError(true)
    }
  }
  return <Dialog labelledBy="webhook-secret-title" onClose={onClose} layer="top">
    <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><WebhookIcon className="size-5" aria-hidden="true" /></div>
    <h2 id="webhook-secret-title" className="mt-4 text-lg font-semibold tracking-tight">Webhook subscription created</h2>
    <p className="mt-1.5 text-sm leading-relaxed text-muted">Save this signing secret now. It cannot be retrieved later and will be cleared when this dialog closes.</p>
    <div className="mt-4 flex min-w-0 items-center gap-2 rounded-md border border-line bg-canvas p-2.5"><code className="min-w-0 flex-1 break-all text-xs text-ink sm:text-sm">{webhook.signingSecret}</code><button type="button" onClick={() => void copySecret()} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-2 text-xs font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">{copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copied ? 'Copied' : 'Copy'}</button></div>
    {copyError && <p role="status" className="mt-2 text-sm text-rose-700">Copy was unavailable. Select the secret and copy it manually.</p>}
    <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Done</button></div>
  </Dialog>
}

function WebhookFormDialog({ initial, onClose, onSaved }: {
  initial: WebhookSubscription | null
  onClose: () => void
  onSaved: (created: CreatedWebhookSubscription | null, updated: WebhookSubscription | null) => void
}) {
  const { createWebhook, updateWebhook } = useApiKeys()
  const [url, setUrl] = useState(initial?.url ?? '')
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(initial?.eventTypes ?? [])
  const [status, setStatus] = useState<WebhookStatus>(initial?.status ?? 'ACTIVE')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleEvent = (eventType: WebhookEventType) => {
    setSelectedEvents((current) => current.includes(eventType) ? current.filter((event) => event !== eventType) : [...current, eventType])
    setEventsError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const nextUrlError = validHttpsUrl(url.trim()) ? null : 'Enter a valid HTTPS URL without credentials or a fragment (maximum 2048 characters).'
    const nextEventsError = selectedEvents.length > 0 ? null : 'Select at least one supported event type.'
    setUrlError(nextUrlError)
    setEventsError(nextEventsError)
    if (nextUrlError || nextEventsError) return
    setSaving(true)
    try {
      if (initial) {
        const updated = await updateWebhook(initial.id, { url: url.trim(), eventTypes: selectedEvents, status })
        onSaved(null, updated)
      } else {
        const created = await createWebhook({ url: url.trim(), eventTypes: selectedEvents })
        onSaved(created, null)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this webhook subscription.')
      if (reason instanceof ApiRequestError) {
        setUrlError(reason.fieldErrors.url ?? null)
        setEventsError(reason.fieldErrors.eventTypes ?? null)
      }
    } finally {
      setSaving(false)
    }
  }

  return <Dialog labelledBy="webhook-form-title" onClose={() => { if (!saving) onClose() }} className="max-w-xl">
    <h2 id="webhook-form-title" className="text-lg font-semibold tracking-tight">{initial ? 'Update subscription' : 'Create webhook subscription'}</h2>
    <p className="mt-1.5 text-sm leading-relaxed text-muted">Configure an HTTPS endpoint and choose which message events to record for this subscription.</p>
    {error && <div className="mt-4"><ErrorNotice message={error} /></div>}
    <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4">
      <label className="block"><span className="mb-1.5 block text-sm font-medium">HTTPS destination URL</span><input type="url" value={url} onChange={(event) => { setUrl(event.target.value); setUrlError(null) }} maxLength={2048} required placeholder="https://example.com/webhooks/opensms" aria-invalid={Boolean(urlError)} aria-describedby={urlError ? 'webhook-url-error' : undefined} className="h-10 w-full rounded-md border border-line px-3 text-sm focus:border-brand-500 focus:outline-none" />{urlError && <span id="webhook-url-error" className="mt-1 block text-sm text-rose-700">{urlError}</span>}</label>
      <fieldset><legend className="text-sm font-medium">Events</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{eventTypes.map((eventType) => <label key={eventType} className="flex min-w-0 items-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm"><input type="checkbox" checked={selectedEvents.includes(eventType)} onChange={() => toggleEvent(eventType)} className="size-4 accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" /><code className="break-all text-xs sm:text-sm">{eventType}</code></label>)}</div>{eventsError && <span className="mt-1 block text-sm text-rose-700">{eventsError}</span>}</fieldset>
      {initial && <label className="block"><span className="mb-1.5 block text-sm font-medium">Subscription status</span><select value={status} onChange={(event) => setStatus(event.target.value as WebhookStatus)} className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none"><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select><span className="mt-1 block text-xs text-muted">Updating a subscription does not change its signing secret.</span></label>}
      {!initial && <p className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-950">OpenSMS records matching events in a queue but does not send outbound webhook requests yet.</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Cancel</button><button type="submit" disabled={saving} className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">{saving ? 'Saving…' : initial ? 'Save changes' : 'Create subscription'}</button></div>
    </form>
  </Dialog>
}

function WebhookDetailDialog({ subscriptionId, onClose, onEdit }: { subscriptionId: string; onClose: () => void; onEdit: (subscription: WebhookSubscription) => void }) {
  const { getWebhook } = useApiKeys()
  const [subscription, setSubscription] = useState<WebhookSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getWebhook(subscriptionId)
      .then((result) => { if (!cancelled) setSubscription(result) })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load subscription details.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [getWebhook, subscriptionId])
  return <Dialog labelledBy="webhook-detail-title" onClose={onClose} className="max-w-xl">
    <div className="flex items-start justify-between gap-3"><div><h2 id="webhook-detail-title" className="text-lg font-semibold tracking-tight">Webhook subscription</h2><p className="mt-1 break-all font-mono text-xs text-muted">{subscriptionId}</p></div><button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Close</button></div>
    {loading && <div role="status" aria-label="Loading subscription details" className="mt-5 space-y-3"><span className="block h-4 w-52 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-64 animate-pulse rounded bg-slate-100" /></div>}
    {error && <div className="mt-4"><ErrorNotice message={error} /></div>}
    {subscription && <><dl className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2"><div className="min-w-0 sm:col-span-2"><dt className="text-xs font-medium text-muted">Destination URL</dt><dd className="mt-1 break-all text-sm">{subscription.url}</dd></div><div><dt className="text-xs font-medium text-muted">Status</dt><dd className="mt-1"><StatusBadge status={subscription.status} /></dd></div><div><dt className="text-xs font-medium text-muted">Created</dt><dd className="mt-1 text-sm">{formatDate(subscription.createdAt)}</dd></div><div><dt className="text-xs font-medium text-muted">Updated</dt><dd className="mt-1 text-sm">{formatDate(subscription.updatedAt)}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-medium text-muted">Events</dt><dd className="mt-2 flex flex-wrap gap-2">{subscription.eventTypes.map((eventType) => <code key={eventType} className="rounded bg-canvas px-2 py-1 text-xs">{eventType}</code>)}</dd></div></dl><div className="mt-5 flex justify-end"><button type="button" onClick={() => onEdit(subscription)} className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Edit subscription</button></div></>}
  </Dialog>
}

export default function WebhooksPage() {
  const { connected, connectionError, sessionRevision, listWebhooks, deleteWebhook } = useApiKeys()
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [formInitial, setFormInitial] = useState<WebhookSubscription | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [secretDisclosure, setSecretDisclosure] = useState<CreatedWebhookSubscription | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setSecretDisclosure(null)
  }, [sessionRevision])

  useEffect(() => {
    if (!connected) {
      setSubscriptions([])
      setListError(null)
      setSelectedId(null)
      setSecretDisclosure(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setListError(null)
    listWebhooks()
      .then((result) => { if (!cancelled) setSubscriptions(result) })
      .catch((reason: unknown) => { if (!cancelled) setListError(reason instanceof Error ? reason.message : 'Unable to load webhook subscriptions.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [connected, listWebhooks, reload, sessionRevision])

  const openCreate = () => { setActionError(null); setFormInitial(null); setFormOpen(true) }
  const openUpdate = (subscription: WebhookSubscription) => { setActionError(null); setFormInitial(subscription); setSelectedId(null); setFormOpen(true) }
  const saved = (created: CreatedWebhookSubscription | null, updated: WebhookSubscription | null) => {
    setFormOpen(false)
    setFormInitial(null)
    setActionError(null)
    if (created) setSecretDisclosure(created)
    if (updated) setSubscriptions((current) => current.map((item) => item.id === updated.id ? updated : item))
    setReload((value) => value + 1)
  }

  const confirmDelete = async (id: string) => {
    setActionError(null)
    setDeletingId(id)
    try {
      await deleteWebhook(id)
      setSubscriptions((current) => current.filter((item) => item.id !== id))
      setConfirmDeleteId(null)
      if (selectedId === id) setSelectedId(null)
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Could not delete this subscription.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!connected) return <div className="space-y-6"><PageHeader title="Webhooks" description="Manage subscriptions for message lifecycle events." /><section className="rounded-lg border border-line bg-white p-5"><h2 className="text-sm font-semibold">Connect to manage webhooks</h2><p className="mt-1 text-sm text-muted">An existing tenant API key is required.{connectionError ? ` ${connectionError}` : ''}</p><Link to="/api-keys" className="mt-3 inline-flex rounded-md bg-navy-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Connect API key</Link></section></div>

  return <div className="space-y-7 sm:space-y-8">
    <PageHeader title="Webhooks" description="Configure HTTPS subscriptions for supported message events." />
    <section className="rounded-md border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm leading-relaxed text-amber-950"><strong>Outbound delivery is not active.</strong> OpenSMS records matching events in a queue. It does not send callback requests to your endpoint yet.</section>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-sm font-semibold">Subscriptions</h2><p className="mt-1 text-sm text-muted">Signing secrets are returned only once when a subscription is created.</p></div><div className="flex gap-2"><button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh</button><button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-navy-900 px-3 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><Plus className="size-4" aria-hidden="true" /> Create subscription</button></div></div>
    {actionError && <ErrorNotice message={actionError} />}
    {listError && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><ErrorNotice message={listError} /><button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Retry</button></div>}
    {loading ? <div role="status" aria-label="Loading webhook subscriptions" className="space-y-3 rounded-lg border border-line bg-white p-5"><span className="block h-4 w-48 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-2/3 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-1/3 animate-pulse rounded bg-slate-100" /></div> : subscriptions.length === 0 ? <EmptyState icon={WebhookIcon} title="No webhook subscriptions" description="Create an HTTPS subscription to record the message events you want to monitor." /> : <ul className="space-y-3">{subscriptions.map((subscription) => <li key={subscription.id} className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2.5"><StatusBadge status={subscription.status} /><span className="text-xs text-muted">Created {formatDate(subscription.createdAt)}</span></div><p className="mt-2 break-all text-sm font-medium">{subscription.url}</p><div className="mt-2 flex flex-wrap gap-1.5">{subscription.eventTypes.map((eventType) => <code key={eventType} className="rounded bg-canvas px-2 py-1 text-xs text-muted">{eventType}</code>)}</div></div><div className="flex flex-wrap gap-2 sm:justify-end"><button type="button" onClick={() => setSelectedId(subscription.id)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Details <ExternalLink className="size-3.5" aria-hidden="true" /></button><button type="button" onClick={() => openUpdate(subscription)} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Edit</button><button type="button" onClick={() => setConfirmDeleteId(subscription.id)} disabled={deletingId !== null} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-rose-700 hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Delete</button></div></div>{confirmDeleteId === subscription.id && <div className="mt-4 flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-rose-900">Delete this webhook subscription?</p><div className="flex gap-2"><button type="button" disabled={deletingId === subscription.id} onClick={() => void confirmDelete(subscription.id)} className="rounded-md bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">{deletingId === subscription.id ? 'Deleting…' : 'Confirm delete'}</button><button type="button" disabled={deletingId === subscription.id} onClick={() => setConfirmDeleteId(null)} className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Cancel</button></div></div>}</li>)}</ul>}
    {formOpen && <WebhookFormDialog initial={formInitial} onClose={() => { setFormOpen(false); setFormInitial(null) }} onSaved={saved} />}
    {selectedId && <WebhookDetailDialog subscriptionId={selectedId} onClose={() => setSelectedId(null)} onEdit={openUpdate} />}
    {secretDisclosure && <SigningSecretDialog webhook={secretDisclosure} onClose={() => setSecretDisclosure(null)} />}
  </div>
}
