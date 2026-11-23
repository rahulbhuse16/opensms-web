import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, Check, Copy, KeyRound, LoaderCircle, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import Dialog from '../components/ui/Dialog'
import { useApiKeys } from '../contexts/ApiKeyContext'
import { ApiRequestError, type ApiKeyRecord, type CreatedApiKey } from '../api/apiClient'

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function StatusBadge({ status }: { status: ApiKeyRecord['status'] }) {
  const active = status === 'ACTIVE'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
      {active ? 'Active' : 'Revoked'}
    </span>
  )
}

function Alert({ children }: { children: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

function CreatedKeyDialog({ apiKey, onClose }: { apiKey: CreatedApiKey; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const copyKey = async () => {
    setCopyError(false)
    try {
      await navigator.clipboard.writeText(apiKey.apiKey)
      setCopied(true)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <Dialog labelledBy="created-key-title" onClose={onClose} layer="top">
        <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <h2 id="created-key-title" className="mt-4 text-lg font-semibold tracking-tight">API key created</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Copy and store this key somewhere secure. It will not be shown again after you close this dialog.
        </p>
        <div className="mt-4 flex min-w-0 items-center gap-2 rounded-md border border-line bg-canvas p-2.5">
          <code className="min-w-0 flex-1 break-all text-xs text-ink sm:text-sm">{apiKey.apiKey}</code>
          <button type="button" onClick={() => void copyKey()} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-2 text-xs font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {copyError && <p role="status" className="mt-2 text-sm text-rose-700">Copy was unavailable. Select the key and copy it manually.</p>}
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
            Done
          </button>
        </div>
    </Dialog>
  )
}

export default function ApiKeysPage() {
  const {
    connected,
    connecting,
    connectionError,
    sessionRevision,
    keys,
    loading,
    listError,
    connect,
    disconnect,
    refresh,
    createKey,
    revokeKey,
  } = useApiKeys()

  const [keyDraft, setKeyDraft] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [keyNameError, setKeyNameError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const busy = loading || creating || revokingId !== null

  useEffect(() => {
    setCreatedKey(null)
  }, [sessionRevision])

  const submitConnection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const candidate = keyDraft.trim()
    setKeyDraft('')
    if (candidate) await connect(candidate)
  }

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActionError(null)
    setKeyNameError(null)
    setCreating(true)
    try {
      const result = await createKey(keyName.trim())
      setCreatedKey(result)
      setCreateOpen(false)
      setKeyName('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not create the API key. Please try again.')
      if (error instanceof ApiRequestError) setKeyNameError(error.fieldErrors.name ?? null)
    } finally {
      setCreating(false)
    }
  }

  const confirmRevoke = async (id: string) => {
    setActionError(null)
    setRevokingId(id)
    try {
      await revokeKey(id)
      setPendingRevokeId(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not revoke the API key. Please try again.')
    } finally {
      setRevokingId(null)
    }
  }

  const closeCreatedKey = () => setCreatedKey(null)

  return (
    <div className="space-y-7 sm:space-y-8">
      <PageHeader
        title="API Keys"
        description="Connect to your OpenSMS tenant to view and manage its API keys. Keys are only available after authentication."
      />

      <section aria-labelledby="connection-title" className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md ${connected ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-muted'}`}>
              {connected ? <ShieldCheck className="size-[18px]" aria-hidden="true" /> : <KeyRound className="size-[18px]" aria-hidden="true" />}
            </span>
            <div>
              <h2 id="connection-title" className="text-sm font-semibold">{connected ? 'Connected to OpenSMS API' : 'Connect to your tenant'}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                {connected
                  ? 'Your credential stays in memory for this session and is not shown after connecting.'
                  : 'Enter an existing tenant API key to verify access. If you do not have one, ask your OpenSMS administrator to provision a key.'}
              </p>
            </div>
          </div>
          {connected && (
            <button type="button" disabled={busy} onClick={disconnect} className="shrink-0 self-start rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
              Disconnect
            </button>
          )}
        </div>

        {!connected && (
          <>
            {connectionError && <div className="mt-4"><Alert>{connectionError}</Alert></div>}
            <form onSubmit={(event) => void submitConnection(event)} className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <span className="mb-1.5 block text-sm font-medium">Existing tenant API key</span>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={keyDraft}
                  onChange={(event) => setKeyDraft(event.target.value)}
                  placeholder="Enter an existing API key"
                  required
                  className="h-10 w-full min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-muted/70 focus:border-brand-500 focus:outline-none"
                />
              </label>
              <button type="submit" disabled={connecting || !keyDraft.trim()} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                {connecting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            </form>
          </>
        )}
      </section>

      {connected && (
        <section aria-labelledby="keys-title" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="keys-title" className="text-sm font-semibold">Tenant API keys</h2>
              <p className="mt-1 text-sm text-muted">The full key is only available at creation. This list shows the returned key prefix.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void refresh()} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh
              </button>
              <button type="button" disabled={busy} onClick={() => { setActionError(null); setCreateOpen(true) }} className="inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-3 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                <Plus className="size-4" aria-hidden="true" />
                Create API key
              </button>
            </div>
          </div>

          {actionError && <Alert>{actionError}</Alert>}
          {listError && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Alert>{listError}</Alert>
              <button type="button" disabled={busy} onClick={() => void refresh()} className="shrink-0 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Retry</button>
            </div>
          )}

          {loading ? (
            <div role="status" aria-label="Loading API keys" className="space-y-3 rounded-lg border border-line bg-white p-4 sm:p-5">
              <span className="block h-4 w-36 animate-pulse rounded bg-slate-100" />
              <span className="block h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <span className="block h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          ) : keys.length === 0 ? (
            <EmptyState icon={KeyRound} title="No API keys yet" description="Create a named API key for a service that should access your tenant. The full key will appear once, immediately after creation." />
          ) : (
            <ul className="space-y-3">
              {keys.map((key) => (
                <li key={key.id} className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="max-w-full break-words text-sm font-semibold">{key.name}</h3>
                        <StatusBadge status={key.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        <span>Created {formatDate(key.createdAt)}</span>
                        {key.status === 'REVOKED' && key.revokedAt && <span>Revoked {formatDate(key.revokedAt)}</span>}
                      </div>
                      <code className="mt-2 block break-all text-xs text-muted">{key.keyPrefix}</code>
                    </div>
                    {key.status === 'ACTIVE' && (
                      <div className="shrink-0 sm:self-center">
                        {pendingRevokeId === key.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-xs text-muted">Revoke this key?</span>
                            <button type="button" disabled={revokingId === key.id} onClick={() => void confirmRevoke(key.id)} className="rounded-md bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                              {revokingId === key.id ? 'Revoking…' : 'Confirm revoke'}
                            </button>
                            <button type="button" disabled={revokingId === key.id} onClick={() => setPendingRevokeId(null)} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Cancel</button>
                          </div>
                        ) : (
                          <button type="button" disabled={busy} onClick={() => setPendingRevokeId(key.id)} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-rose-700 hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Revoke</button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {createOpen && (
        <Dialog labelledBy="create-key-title" onClose={() => { if (!creating) { setCreateOpen(false); setActionError(null); setKeyNameError(null) } }} className="max-w-md">
            <h2 id="create-key-title" className="text-lg font-semibold tracking-tight">Create API key</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">Choose a name to help identify where this key is used. You can revoke it later.</p>
            <form onSubmit={(event) => void submitCreate(event)}>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium">Key name</span>
                <input type="text" value={keyName} onChange={(event) => { setKeyName(event.target.value); setKeyNameError(null) }} maxLength={100} required autoFocus aria-invalid={keyNameError !== null} aria-describedby={keyNameError ? 'key-name-error' : undefined} className="h-10 w-full rounded-md border border-line px-3 text-sm focus:border-brand-500 focus:outline-none" />
                {keyNameError && <span id="key-name-error" className="mt-1 block text-sm text-rose-700">{keyNameError}</span>}
              </label>
              {actionError && <div className="mt-3"><Alert>{actionError}</Alert></div>}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={creating} onClick={() => { setCreateOpen(false); setActionError(null); setKeyNameError(null) }} className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Cancel</button>
                <button type="submit" disabled={creating || !keyName.trim()} className="inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                  {creating && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                  {creating ? 'Creating…' : 'Create key'}
                </button>
              </div>
            </form>
        </Dialog>
      )}

      {createdKey && <CreatedKeyDialog apiKey={createdKey} onClose={closeCreatedKey} />}
    </div>
  )
}
