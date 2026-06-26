'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import {
  Play, TrendingUp, TrendingDown, AlertTriangle, FileText, Mail, MessageSquare,
  Activity, DollarSign, Wallet, ArrowDownToLine, Loader2, AlertCircle, CheckCircle2,
  Clock, ExternalLink,
} from 'lucide-react'
import { callAIAgent } from '@/lib/aiAgent'

interface Snapshot {
  _id?: string
  snapshot_date: string
  total_revenue: number
  aum: number
  net_inflows: number
  revenue_variance_pct: number
  aum_variance_pct: number
  inflow_variance_pct: number
  anomaly_count: number
  top_movers?: any[]
  anomalies?: any[]
  raw_sources?: string[]
  summary?: string
}

interface DistConfig {
  email_recipients?: string[]
  slack_channel?: string
  schedule_time?: string
  business_days_only?: boolean
}

interface ScheduleInfo {
  is_active?: boolean
  cron_expression?: string
  next_run?: string
}

interface DashboardProps {
  snapshots: Snapshot[]
  todaySnapshot: Snapshot | null
  onRunAnalysis: () => Promise<void>
  running: boolean
  runError: string | null
  runStatus: string
  config: DistConfig
  schedule: ScheduleInfo | null
  distributionLogs: any[]
  onOpenSnapshot: (s: Snapshot) => void
  onGenerateReport: (format: 'pdf' | 'xlsx') => void
  onEmailReport: () => void
  onSlackPost: () => void
  reportLoading: boolean
  emailLoading: boolean
  slackLoading: boolean
  actionStatus: string | null
  actionError: string | null
}

function formatMoney(n: number, suffix = 'M') {
  if (!Number.isFinite(n)) return '$0' + suffix
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`
}

function formatPct(n: number) {
  if (!Number.isFinite(n)) return '0%'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function VarianceBadge({ pct }: { pct: number }) {
  const val = Number.isFinite(pct) ? pct : 0
  const up = val >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      <Icon className="h-3 w-3" />
      {formatPct(val)}
    </span>
  )
}

function TrendChart({ snapshots }: { snapshots: Snapshot[] }) {
  const data = useMemo(() => {
    const recent = [...snapshots].slice(0, 14).reverse()
    return recent.map((s) => ({
      date: s.snapshot_date,
      revenue: Number(s.total_revenue) || 0,
      aum: Number(s.aum) || 0,
    }))
  }, [snapshots])

  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        No trend data yet. Run an analysis to begin.
      </div>
    )
  }

  const maxRev = Math.max(...data.map(d => d.revenue), 1)
  const maxAum = Math.max(...data.map(d => d.aum), 1)
  const w = 600
  const h = 180
  const pad = 24

  const pathRev = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(data.length - 1, 1)
    const y = h - pad - (d.revenue / maxRev) * (h - pad * 2)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  const pathAum = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(data.length - 1, 1)
    const y = h - pad - (d.aum / maxAum) * (h - pad * 2)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(91 141 239)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(91 141 239)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathRev} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="url(#revFill)" />
        <path d={pathRev} fill="none" stroke="rgb(91 141 239)" strokeWidth="2" />
        <path d={pathAum} fill="none" stroke="rgb(52 211 153)" strokeWidth="2" strokeDasharray="4 4" />
        {data.map((d, i) => {
          const x = pad + (i * (w - pad * 2)) / Math.max(data.length - 1, 1)
          const y = h - pad - (d.revenue / maxRev) * (h - pad * 2)
          return <circle key={i} cx={x} cy={y} r="2.5" fill="rgb(91 141 239)" />
        })}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> Revenue</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> AUM</span>
      </div>
    </div>
  )
}

export default function Dashboard(props: DashboardProps) {
  const {
    snapshots, todaySnapshot, onRunAnalysis, running, runError, runStatus,
    config, schedule, distributionLogs, onOpenSnapshot,
    onGenerateReport, onEmailReport, onSlackPost,
    reportLoading, emailLoading, slackLoading, actionStatus, actionError,
  } = props

  const movers = Array.isArray(todaySnapshot?.top_movers) ? todaySnapshot!.top_movers : []
  const anomalies = Array.isArray(todaySnapshot?.anomalies) ? todaySnapshot!.anomalies : []
  const recipientsCount = Array.isArray(config?.email_recipients) ? config.email_recipients!.length : 0
  const slackChannel = config?.slack_channel || ''

  const todayStr = new Date().toISOString().split('T')[0]
  const emailsSentToday = distributionLogs.filter(l => l?.channel === 'email').length
  const slackSentToday = distributionLogs.filter(l => l?.channel === 'slack').length

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s Market Snapshot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {todaySnapshot
              ? `Last run for ${todaySnapshot.snapshot_date}`
              : 'No snapshot for today yet. Trigger a fresh run to pull live data.'}
          </p>
        </div>
        <Button onClick={onRunAnalysis} disabled={running} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Running pipeline…' : 'Run Analysis Now'}
        </Button>
      </div>

      {running && (
        <Alert>
          <Spinner className="h-4 w-4" />
          <AlertTitle>Coordinator running</AlertTitle>
          <AlertDescription>{runStatus || 'Scraping market data and computing variance…'}</AlertDescription>
        </Alert>
      )}

      {runError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{runError}</AlertDescription>
        </Alert>
      )}

      {actionStatus && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{actionStatus}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Total Revenue</CardDescription>
              <VarianceBadge pct={todaySnapshot?.revenue_variance_pct ?? 0} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {todaySnapshot ? formatMoney(Number(todaySnapshot.total_revenue) || 0) : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs prior snapshot</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> AUM</CardDescription>
              <VarianceBadge pct={todaySnapshot?.aum_variance_pct ?? 0} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {todaySnapshot ? formatMoney(Number(todaySnapshot.aum) || 0) : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Assets under management</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1.5"><ArrowDownToLine className="h-3.5 w-3.5" /> Net Inflows</CardDescription>
              <VarianceBadge pct={todaySnapshot?.inflow_variance_pct ?? 0} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {todaySnapshot ? formatMoney(Number(todaySnapshot.net_inflows) || 0) : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Day-over-day flows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Anomalies</CardDescription>
              {todaySnapshot && (todaySnapshot.anomaly_count ?? 0) > 0 ? (
                <Badge variant="destructive" className="text-xs">Attention</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Clear</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {todaySnapshot ? (todaySnapshot.anomaly_count ?? 0) : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Flagged today</p>
          </CardContent>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">14-Day Trend</CardTitle>
                  <CardDescription>Revenue and AUM trajectory</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">{snapshots.length} snapshots</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <TrendChart snapshots={snapshots} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Movers</CardTitle>
              <CardDescription>Notable tickers from today&apos;s scan</CardDescription>
            </CardHeader>
            <CardContent>
              {movers.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No movers reported in the latest snapshot.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="py-2 font-medium">Ticker</th>
                        <th className="py-2 font-medium">Change</th>
                        <th className="py-2 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movers.map((m: any, i: number) => {
                        const change = Number(m?.change_pct) || 0
                        const up = change >= 0
                        return (
                          <tr key={i} className="border-b border-border/40 last:border-0">
                            <td className="py-2.5 font-medium">{m?.ticker || '—'}</td>
                            <td className="py-2.5">
                              <span className={up ? 'text-emerald-400' : 'text-red-400'}>
                                {formatPct(change)}
                              </span>
                            </td>
                            <td className="py-2.5 text-muted-foreground">{m?.note || ''}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Anomalies
                </CardTitle>
                <CardDescription>Flagged by the analyzer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {anomalies.map((a: any, i: number) => {
                  const sev = String(a?.severity || 'info').toLowerCase()
                  const sevVariant: any = sev === 'high' || sev === 'critical' ? 'destructive' : sev === 'medium' ? 'default' : 'secondary'
                  return (
                    <div key={i} className="p-3 rounded-md border border-border bg-muted/30">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{a?.label || 'Anomaly'}</div>
                        <Badge variant={sevVariant} className="text-xs uppercase">{a?.severity || 'info'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a?.explanation || ''}</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {todaySnapshot?.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coordinator Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{todaySnapshot.summary}</p>
                {todaySnapshot && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => onOpenSnapshot(todaySnapshot)}>
                    View full details
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Scheduled Run
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={schedule?.is_active ? 'default' : 'secondary'}>
                  {schedule?.is_active ? 'Active' : 'Paused'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cadence</span>
                <span className="font-medium">Weekdays 8:00 AM ET</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last snapshot</span>
                <span className="font-medium">{snapshots[0]?.snapshot_date || '—'}</span>
              </div>
              <Separator />
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recipients</span>
                  <span className="font-medium">{recipientsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Slack channel</span>
                  <span className="font-medium">{slackChannel || 'not set'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribution Today</CardTitle>
              <CardDescription>{todayStr}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> Emails sent
                </span>
                <Badge variant="outline">{emailsSentToday}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" /> Slack posts
                </span>
                <Badge variant="outline">{slackSentToday}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
              <CardDescription>Distribute the latest snapshot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => onGenerateReport('pdf')}
                disabled={!todaySnapshot || reportLoading}
              >
                {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Generate PDF Report
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => onGenerateReport('xlsx')}
                disabled={!todaySnapshot || reportLoading}
              >
                {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Generate XLSX Report
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onEmailReport}
                disabled={!todaySnapshot || emailLoading || recipientsCount === 0}
              >
                {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Email Report
              </Button>
              {recipientsCount === 0 && (
                <p className="text-xs text-muted-foreground pl-1">Add recipients in Settings first.</p>
              )}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onSlackPost}
                disabled={!todaySnapshot || slackLoading || !slackChannel}
              >
                {slackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Post to Slack
              </Button>
              {!slackChannel && (
                <p className="text-xs text-muted-foreground pl-1">Set Slack channel in Settings.</p>
              )}
            </CardContent>
          </Card>

          {Array.isArray(todaySnapshot?.raw_sources) && todaySnapshot!.raw_sources!.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todaySnapshot!.raw_sources!.map((s: string, i: number) => (
                  <a
                    key={i}
                    href={s}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:underline truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
