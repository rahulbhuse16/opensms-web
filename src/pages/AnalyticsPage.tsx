import { useEffect, useState } from 'react'
import { Activity, AlertCircle, BarChart3, CalendarDays, MessageSquareText, RefreshCw, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import { ApiRequestError, type DailyMessageVolume, type MessageAnalyticsSummary, type MessageStatus } from '../api/apiClient'
import { useApiKeys } from '../contexts/ApiKeyContext'

const statuses: MessageStatus[] = ['QUEUED', 'PROCESSING', 'SIMULATED', 'SENT', 'DELIVERED', 'FAILED']
const statusColors: Record<MessageStatus, string> = {
  QUEUED: '#5b6b82',
  PROCESSING: '#4f46e5',
  SIMULATED: '#d97706',
  SENT: '#0e8791',
  DELIVERED: '#15803d',
  FAILED: '#be123c',
}

type Preset = '7' | '30' | '90' | 'custom'
interface DateRange { from: string; to: string }
interface AnalyticsData { summary: MessageAnalyticsSummary; daily: DailyMessageVolume }

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function rangeForDays(days: number): DateRange {
  const to = utcToday()
  return { from: shiftDate(to, -(days - 1)), to }
}

function rangeError(from: string, to: string, today: string): string | null {
  if (!from || !to) return 'Choose both a start and end date.'
  if (from > to) return 'Start date must be on or before end date.'
  if (from > today || to > today) return 'Future dates are not available.'
  const start = Date.parse(`${from}T00:00:00.000Z`)
  const end = Date.parse(`${to}T00:00:00.000Z`)
  const inclusiveDays = Math.floor((end - start) / 86_400_000) + 1
  if (inclusiveDays > 366) return 'Choose a date range of 366 days or fewer.'
  return null
}

function formatDate(value: string, includeYear = false): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', ...(includeYear ? { year: 'numeric' as const } : {}), timeZone: 'UTC' }).format(date)
}

function AnalyticsError({ message }: { message: string }) {
  return <div role="alert" className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{message}</p></div>
}

function statusHint(status: MessageStatus): string {
  switch (status) {
    case 'QUEUED': return 'Accepted into the processing queue; not a delivery confirmation'
    case 'PROCESSING': return 'Currently being processed; not a delivery confirmation'
    case 'SIMULATED': return 'Mock gateway handling; not delivered to a mobile phone'
    case 'SENT': return 'Accepted by a non-simulated gateway; not delivery confirmation'
    case 'DELIVERED': return 'Backend status value only; no carrier delivery evidence is reported'
    case 'FAILED': return 'Processing or submission failed'
  }
}

function labelIndices(dates: string[]): number[] {
  if (dates.length <= 14) return dates.map((_, index) => index)
  if (dates.length <= 45) return dates.reduce<number[]>((items, _, index) => {
    if (index === 0 || index === dates.length - 1 || index % 7 === 0) items.push(index)
    return items
  }, [])
  if (dates.length <= 110) return dates.reduce<number[]>((items, _, index) => {
    if (index === 0 || index === dates.length - 1 || index % 14 === 0) items.push(index)
    return items
  }, [])
  return dates.reduce<number[]>((items, date, index) => {
    if (index === 0 || index === dates.length - 1 || date.slice(8, 10) === '01') items.push(index)
    return items
  }, [])
}

function DailyChart({ volume }: { volume: DailyMessageVolume }) {
  const width = 1000
  const height = 270
  const left = 42
  const right = 14
  const top = 16
  const bottom = 42
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const plotBottom = top + plotHeight
  const maxValue = Math.max(1, ...volume.days.map((day) => day.totalMessages))
  const slotWidth = volume.days.length > 0 ? plotWidth / volume.days.length : plotWidth
  const barWidth = Math.max(1, slotWidth * 0.68)
  const labelPositions = labelIndices(volume.days.map((day) => day.date))
  const gridValues = [0, Math.ceil(maxValue / 3), Math.ceil((maxValue * 2) / 3), maxValue]
    .filter((value, index, array) => array.indexOf(value) === index)

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Message status legend">
        {statuses.map((status) => <span key={status} className="inline-flex items-center gap-1.5 text-xs text-muted"><span className="size-2.5 rounded-sm" style={{ backgroundColor: statusColors[status] }} aria-hidden="true" />{status}</span>)}
      </div>
      <div className="mt-4 min-w-0">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="daily-chart-title daily-chart-description" className="block h-64 w-full overflow-visible">
          <title id="daily-chart-title">Daily messages by status</title>
          <desc id="daily-chart-description">Stacked daily message totals from {volume.periodStart} through {volume.periodEnd}. Hover a bar for its date and exact status counts. Values are message records, not confirmed mobile delivery.</desc>
          {gridValues.map((value) => {
            const y = plotBottom - (value / maxValue) * plotHeight
            return <g key={`grid-${value}`}><line x1={left} y1={y} x2={width - right} y2={y} stroke="#e3e8ef" strokeWidth="1" /><text x={left - 8} y={y + 4} textAnchor="end" fill="#5b6b82" fontSize="12">{value}</text></g>
          })}
          {volume.days.map((day, index) => {
            const x = left + index * slotWidth + (slotWidth - barWidth) / 2
            let currentY = plotBottom
            const countsDescription = statuses.map((status) => `${status} ${day.messagesByStatus[status] ?? 0}`).join(', ')
            return <g key={day.date}>
              <title>{`${day.date}: ${day.totalMessages} total messages. ${countsDescription}.`}</title>
              {statuses.map((status) => {
                const count = day.messagesByStatus[status] ?? 0
                if (count <= 0) return null
                const segmentHeight = (count / maxValue) * plotHeight
                currentY -= segmentHeight
                return <rect key={status} x={x} y={currentY} width={barWidth} height={Math.max(segmentHeight, 0.8)} fill={statusColors[status]} rx="1" />
              })}
            </g>
          })}
          <line x1={left} y1={plotBottom} x2={width - right} y2={plotBottom} stroke="#94a3b8" strokeWidth="1" />
          {labelPositions.map((index) => {
            const day = volume.days[index]
            const x = left + index * slotWidth + slotWidth / 2
            const monthly = volume.days.length > 110
            return <text key={day.date} x={x} y={height - 12} textAnchor="middle" fill="#5b6b82" fontSize="11">{formatDate(day.date, monthly)}</text>
          })}
        </svg>
      </div>
      <table className="sr-only"><caption>Daily message counts by status</caption><thead><tr><th>Date</th><th>Total messages</th>{statuses.map((status) => <th key={status}>{status}</th>)}</tr></thead><tbody>{volume.days.map((day) => <tr key={day.date}><th>{day.date}</th><td>{day.totalMessages}</td>{statuses.map((status) => <td key={status}>{day.messagesByStatus[status] ?? 0}</td>)}</tr>)}</tbody></table>
    </div>
  )
}

export default function AnalyticsPage() {
  const { connected, connectionError, getAnalyticsSummary, getDailyMessageVolume } = useApiKeys()
  const [preset, setPreset] = useState<Preset>('30')
  const [activeRange, setActiveRange] = useState<DateRange>(() => rangeForDays(30))
  const [draftFrom, setDraftFrom] = useState(() => rangeForDays(30).from)
  const [draftTo, setDraftTo] = useState(() => rangeForDays(30).to)
  const [dateError, setDateError] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!connected) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    let current = true
    setData(null)
    setLoading(true)
    setError(null)
    Promise.all([
      getAnalyticsSummary(activeRange.from, activeRange.to),
      getDailyMessageVolume(activeRange.from, activeRange.to),
    ])
      .then(([summary, daily]) => { if (current) setData({ summary, daily }) })
      .catch((reason: unknown) => {
        if (!current) return
        if (reason instanceof ApiRequestError && reason.status === 400) {
          setError('The API rejected this date range. Choose dates in the past, in chronological order, spanning no more than 366 days.')
        } else {
          setError(reason instanceof Error ? reason.message : 'Unable to load message analytics.')
        }
      })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [connected, getAnalyticsSummary, getDailyMessageVolume, activeRange.from, activeRange.to, reload])

  const choosePreset = (nextPreset: Preset) => {
    setDateError(null)
    setPreset(nextPreset)
    if (nextPreset === 'custom') {
      setDraftFrom(activeRange.from)
      setDraftTo(activeRange.to)
      return
    }
    const nextRange = rangeForDays(Number(nextPreset))
    setActiveRange(nextRange)
    setDraftFrom(nextRange.from)
    setDraftTo(nextRange.to)
  }

  const applyCustomRange = () => {
    const validation = rangeError(draftFrom, draftTo, utcToday())
    setDateError(validation)
    if (validation) return
    setActiveRange({ from: draftFrom, to: draftTo })
  }

  if (!connected) return <div className="space-y-6">
    <PageHeader title="Analytics" description="Explore tenant message volume and status counts over time." />
    <section className="rounded-lg border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,31,58,0.04)]">
      <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600"><BarChart3 className="size-[18px]" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">Connect to view analytics</h2><p className="mt-1 text-sm leading-relaxed text-muted">An existing tenant API key is required to load real message statistics. No sample analytics are shown.{connectionError ? ` ${connectionError}` : ''}</p><Link to="/api-keys" className="mt-3 inline-flex rounded-md bg-navy-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Connect API key</Link></div></div>
    </section>
  </div>

  const summary = data?.summary
  const statusMetrics: Array<{ label: string; status: MessageStatus; icon: LucideIcon }> = [
    { label: 'Queued', status: 'QUEUED', icon: Activity },
    { label: 'Processing', status: 'PROCESSING', icon: Activity },
    { label: 'Simulated', status: 'SIMULATED', icon: MessageSquareText },
    { label: 'Sent', status: 'SENT', icon: MessageSquareText },
    { label: 'Delivered', status: 'DELIVERED', icon: MessageSquareText },
    { label: 'Failed', status: 'FAILED', icon: Activity },
  ]

  return <div className="space-y-7 sm:space-y-8">
    <PageHeader title="Analytics" description="Review tenant message volume and status counts for a selected UTC date range." />

    <section aria-label="Analytics date range" className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <fieldset>
          <legend className="text-sm font-semibold">Date range (UTC)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['custom', 'Custom range']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={preset === value} onClick={() => choosePreset(value)} className={`rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${preset === value ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white text-ink hover:bg-slate-50'}`}>{label}</button>)}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-end gap-3">
          {preset === 'custom' ? <>
            <label className="min-w-[140px] flex-1 sm:flex-none"><span className="mb-1 block text-xs font-medium text-muted">From</span><input type="date" value={draftFrom} max={utcToday()} onChange={(event) => { setDraftFrom(event.target.value); setDateError(null) }} className="h-10 w-full rounded-md border border-line bg-white px-2.5 text-sm focus:border-brand-500 focus:outline-none" /></label>
            <label className="min-w-[140px] flex-1 sm:flex-none"><span className="mb-1 block text-xs font-medium text-muted">To</span><input type="date" value={draftTo} max={utcToday()} onChange={(event) => { setDraftTo(event.target.value); setDateError(null) }} className="h-10 w-full rounded-md border border-line bg-white px-2.5 text-sm focus:border-brand-500 focus:outline-none" /></label>
            <button type="button" onClick={applyCustomRange} className="h-10 rounded-md bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Apply</button>
          </> : <p className="pb-2 text-sm text-muted">{activeRange.from} – {activeRange.to}</p>}
          <button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh</button>
        </div>
      </div>
      {dateError && <p role="alert" className="mt-3 text-sm text-rose-700">{dateError}</p>}
    </section>

    {error && <AnalyticsError message={error} />}

    {loading ? <>
      <section aria-label="Loading summary metrics" role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="space-y-3 rounded-lg border border-line bg-white p-4"><span className="block h-3 w-24 animate-pulse rounded bg-slate-100" /><span className="block h-7 w-16 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-32 animate-pulse rounded bg-slate-100" /></div>)}</section>
      <div role="status" aria-label="Loading daily volume" className="space-y-3 rounded-lg border border-line bg-white p-5"><span className="block h-4 w-48 animate-pulse rounded bg-slate-100" /><span className="block h-52 w-full animate-pulse rounded bg-slate-100" /></div>
    </> : data && summary && <>
      <section aria-labelledby="summary-heading">
        <div className="mb-3"><h2 id="summary-heading" className="text-sm font-semibold">Message summary</h2><p className="mt-1 text-sm text-muted">Status counts cover {formatDate(summary.periodStart, true)} through {formatDate(summary.periodEnd, true)}. “Delivered” is the backend message status, not a carrier receipt.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total messages (all time)" icon={MessageSquareText} value={String(summary.totalMessages)} hint="All message records for this tenant" />
          <MetricCard label="Total messages (period)" icon={CalendarDays} value={String(summary.periodTotalMessages)} hint="Records within the selected date range" />
          {statusMetrics.map(({ label, status, icon }) => <MetricCard key={status} label={`${label} (period)`} icon={icon} value={String(summary.periodMessagesByStatus[status] ?? 0)} hint={statusHint(status)} />)}
        </div>
      </section>

      <section aria-labelledby="breakdown-heading" className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5">
        <div className="mb-4"><h2 id="breakdown-heading" className="text-sm font-semibold">Status breakdown</h2><p className="mt-1 text-sm text-muted">Message records grouped by their current backend status for this period.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{statuses.map((status) => <div key={status} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-line px-3.5 py-3"><span className="flex min-w-0 items-center gap-2.5"><span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: statusColors[status] }} aria-hidden="true" /><span className="truncate text-sm font-medium">{status}</span></span><span className="text-lg font-semibold tabular-nums">{summary.periodMessagesByStatus[status] ?? 0}</span></div>)}</div>
      </section>

      <section aria-labelledby="daily-heading" className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)] sm:p-5">
        <div className="mb-4"><h2 id="daily-heading" className="text-sm font-semibold">Daily message volume</h2><p className="mt-1 text-sm text-muted">Chronological daily totals stacked by status. Hover a bar for exact counts.</p></div>
        {data.daily.days.length === 0 ? <EmptyState icon={BarChart3} title="No daily volume available" description="The analytics endpoint returned no daily records for this range." /> : <>
          {summary.periodTotalMessages === 0 && <p className="mb-4 rounded-md border border-line bg-canvas px-3.5 py-3 text-sm text-muted">No messages in this period. The chart retains the returned dates with zero values.</p>}
          <DailyChart volume={data.daily} />
        </>}
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">SIMULATED records reflect mock gateway handling and do not indicate mobile network delivery. These endpoints do not report billing or carrier delivery receipts.</p>
      </section>
    </>}
  </div>
}
