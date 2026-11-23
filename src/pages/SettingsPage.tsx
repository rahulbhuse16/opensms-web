import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Building2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { useApiKeys } from '../contexts/ApiKeyContext'
import type { TenantRecord } from '../api/apiClient'

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

export default function SettingsPage() {
  const { connected, getTenant } = useApiKeys()
  const [tenant, setTenant] = useState<TenantRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const load = useCallback(() => {
    if (!connected) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getTenant()
      .then((result) => { if (!cancelled) setTenant(result) })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load tenant information.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [connected, getTenant, reload])

  useEffect(() => {
    setTenant(null)
    setError(null)
    return load()
  }, [load])

  return (
    <div className="space-y-7">
      <PageHeader title="Settings & account" description="View the tenant account authenticated by your current OpenSMS API key." />
      {!connected ? (
        <section className="rounded-lg border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,31,58,0.04)]">
          <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600"><Building2 className="size-[18px]" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">Tenant account not connected</h2><p className="mt-1 text-sm leading-relaxed text-muted">Connect with an existing tenant key to view account details.</p><Link to="/api-keys" className="mt-3 inline-flex rounded-md bg-navy-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Connect API key</Link></div></div>
        </section>
      ) : (
        <section aria-labelledby="tenant-details" className="rounded-lg border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-md bg-brand-50 text-brand-600"><Building2 className="size-[18px]" aria-hidden="true" /></span><h2 id="tenant-details" className="text-sm font-semibold">Tenant details</h2></div><button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh</button></div>
          {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error}</div>}
          {loading && !tenant ? <div role="status" aria-label="Loading tenant details" className="mt-5 space-y-3"><span className="block h-4 w-40 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-64 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-52 animate-pulse rounded bg-slate-100" /></div> : tenant && <dl className="mt-5 grid min-w-0 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div><dt className="text-xs font-medium text-muted">Tenant name</dt><dd className="mt-1 break-words text-sm font-medium">{tenant.name}</dd></div>
            <div><dt className="text-xs font-medium text-muted">Status</dt><dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tenant.status === 'ACTIVE' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-800'}`}>{tenant.status}</span></dd></div>
            <div><dt className="text-xs font-medium text-muted">Tenant ID</dt><dd className="mt-1 break-all font-mono text-xs text-ink">{tenant.id}</dd></div>
            <div><dt className="text-xs font-medium text-muted">Created</dt><dd className="mt-1 text-sm">{formatDate(tenant.createdAt)}</dd></div>
            <div><dt className="text-xs font-medium text-muted">Last updated</dt><dd className="mt-1 text-sm">{formatDate(tenant.updatedAt)}</dd></div>
          </dl>}
        </section>
      )}
    </div>
  )
}
