import { useEffect, useState } from 'react'
import { Activity, ArrowRight, BarChart3, Code2, KeyRound, MessageSquare, PlugZap, Send, Webhook } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import { useApiKeys } from '../contexts/ApiKeyContext'
import type { TenantRecord } from '../api/apiClient'

interface OverviewData {
  tenant: TenantRecord
  messageCount: number
  webhookCount: number
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

export default function OverviewPage() {
  const { connected, keys, getTenant, listMessages, listWebhooks } = useApiKeys()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryIndex, setRetryIndex] = useState(0)

  useEffect(() => {
    if (!connected) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getTenant(), listMessages(0, 1), listWebhooks()])
      .then(([tenant, messages, webhooks]) => {
        if (!cancelled) setData({ tenant, messageCount: messages.totalElements, webhookCount: webhooks.length })
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load account overview.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [connected, getTenant, listMessages, listWebhooks, retryIndex])

  const metrics = [
    { label: 'API keys', icon: KeyRound, value: String(keys.length), hint: 'Total key records, including revoked keys' },
    { label: 'Message records', icon: MessageSquare, value: data ? String(data.messageCount) : '—', hint: 'Includes simulated and queued messages' },
    { label: 'Webhook subscriptions', icon: Webhook, value: data ? String(data.webhookCount) : '—', hint: 'Subscriptions configured for this tenant' },
  ]

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        title="OpenSMS overview"
        description="Review your tenant and the messaging capabilities available in your workspace."
      />

      {!connected ? (
        <section className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
              <PlugZap className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Not connected to the API yet</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Connect with an existing tenant API key to load account information. If you do not have a key, ask your OpenSMS administrator to provision one.</p>
            </div>
          </div>
          <Link to="/api-keys" className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-md bg-navy-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:self-center">
            Connect API key <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <>
          {error && <div role="alert" className="flex flex-col gap-3 rounded-md border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><p>{error}</p><button type="button" onClick={() => { setData(null); setError(null); setRetryIndex((value) => value + 1) }} className="self-start rounded-md border border-rose-200 bg-white px-3 py-2 font-medium hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Retry</button></div>}
          <section aria-labelledby="tenant-heading" className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="tenant-heading" className="text-sm font-semibold">Tenant account</h2>
              {data && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${data.tenant.status === 'ACTIVE' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-800'}`}>{data.tenant.status}</span>}
            </div>
            {loading && !data ? <div role="status" aria-label="Loading tenant account" className="mt-4 space-y-2"><span className="block h-4 w-40 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-64 animate-pulse rounded bg-slate-100" /></div> : data && <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="min-w-0"><dt className="text-xs font-medium text-muted">Name</dt><dd className="mt-1 break-words text-sm font-medium">{data.tenant.name}</dd></div>
              <div className="min-w-0"><dt className="text-xs font-medium text-muted">Tenant ID</dt><dd className="mt-1 break-all font-mono text-xs text-ink">{data.tenant.id}</dd></div>
              <div><dt className="text-xs font-medium text-muted">Created</dt><dd className="mt-1 text-sm">{formatDate(data.tenant.createdAt)}</dd></div>
            </dl>}
          </section>

          <section aria-labelledby="activity-heading">
            <div className="mb-3"><h2 id="activity-heading" className="text-sm font-semibold">Account activity</h2><p className="mt-1 text-sm text-muted">Counts reflect records returned by the OpenSMS APIs.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((metric) => <MetricCard key={metric.label} {...metric} value={loading && metric.value === '—' ? '…' : metric.value} />)}
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="capabilities-heading" className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
        <h2 id="capabilities-heading" className="text-sm font-semibold">Current service boundaries</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">Message statuses may be <strong className="font-semibold text-ink">SIMULATED</strong>; that does not mean a message reached a mobile phone. Webhook events are recorded in a queue, but outbound callbacks are not sent yet.</p>
      </section>

      <section aria-labelledby="start-heading">
        <div className="mb-3"><h2 id="start-heading" className="text-sm font-semibold">Workspace</h2><p className="mt-1 text-sm text-muted">Open an area to manage your current account setup.</p></div>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { icon: KeyRound, title: 'API Keys', text: 'Create, review, and revoke tenant keys.', to: '/api-keys' },
            { icon: Send, title: 'Messages', text: 'Submit messages and review their reported statuses.', to: '/messages' },
            { icon: Webhook, title: 'Webhooks', text: 'Configure subscriptions for queued event records.', to: '/webhooks' },
            { icon: BarChart3, title: 'Analytics', text: 'View tenant message counts by date and status.', to: '/analytics' },
            { icon: Activity, title: 'Settings & account', text: 'View authenticated tenant information.', to: '/settings' },
            { icon: Code2, title: 'Developers', text: 'Developer reference is coming soon.', to: '/developers' },
          ].map(({ icon: Icon, title, text, to }) => (
            <li key={to} className="min-w-0"><Link to={to} className="group flex h-full items-start gap-3 rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] transition-colors hover:border-brand-100 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600"><Icon className="size-[18px]" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{title}</span><ArrowRight className="size-4 shrink-0 text-muted" aria-hidden="true" /></span><span className="mt-1 block text-sm leading-relaxed text-muted">{text}</span></span>
            </Link></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
