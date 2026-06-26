'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  FileText, Mail, MessageSquare, ExternalLink, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react'

interface SnapshotDetailProps {
  snapshot: any | null
  open: boolean
  onClose: () => void
  distributionLogs: any[]
  onGenerateReport: (format: 'pdf' | 'xlsx') => void
  onEmailReport: () => void
  onSlackPost: () => void
  reportLoading: boolean
  emailLoading: boolean
  slackLoading: boolean
  recipientsCount: number
  slackChannel: string
}

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return '$0M'
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}M`
}
function formatPct(n: number) {
  if (!Number.isFinite(n)) return '0%'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export default function SnapshotDetail(props: SnapshotDetailProps) {
  const { snapshot, open, onClose, distributionLogs, onGenerateReport, onEmailReport, onSlackPost,
    reportLoading, emailLoading, slackLoading, recipientsCount, slackChannel } = props

  if (!snapshot) return null

  const movers = Array.isArray(snapshot?.top_movers) ? snapshot.top_movers : []
  const anomalies = Array.isArray(snapshot?.anomalies) ? snapshot.anomalies : []
  const sources = Array.isArray(snapshot?.raw_sources) ? snapshot.raw_sources : []
  const logs = distributionLogs.filter(l => l?.snapshot_id === String(snapshot?._id))

  const Row = ({ label, value, pct }: { label: string; value: string; pct?: number }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{value}</span>
        {pct !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatPct(pct)}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Snapshot — {snapshot?.snapshot_date || '—'}</SheetTitle>
          <SheetDescription>Full KPI breakdown, anomalies, and distribution timeline</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">KPI Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="py-0">
              <Row label="Total Revenue" value={formatMoney(Number(snapshot?.total_revenue) || 0)} pct={Number(snapshot?.revenue_variance_pct) || 0} />
              <Row label="AUM" value={formatMoney(Number(snapshot?.aum) || 0)} pct={Number(snapshot?.aum_variance_pct) || 0} />
              <Row label="Net Inflows" value={formatMoney(Number(snapshot?.net_inflows) || 0)} pct={Number(snapshot?.inflow_variance_pct) || 0} />
              <Row label="Anomalies" value={String(snapshot?.anomaly_count ?? 0)} />
            </CardContent>
          </Card>

          {snapshot?.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{snapshot.summary}</p>
              </CardContent>
            </Card>
          )}

          {movers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Movers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {movers.map((m: any, i: number) => {
                    const change = Number(m?.change_pct) || 0
                    return (
                      <div key={i} className="flex items-start justify-between p-2.5 rounded-md bg-muted/40">
                        <div>
                          <div className="text-sm font-medium">{m?.ticker || '—'}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{m?.note || ''}</div>
                        </div>
                        <span className={`text-sm font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPct(change)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {anomalies.map((a: any, i: number) => {
                  const sev = String(a?.severity || 'info').toLowerCase()
                  const sevVariant: any = sev === 'high' || sev === 'critical' ? 'destructive' : sev === 'medium' ? 'default' : 'secondary'
                  return (
                    <div key={i} className="p-3 rounded-md border border-border">
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

          {sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Raw Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sources.map((s: string, i: number) => (
                  <a key={i} href={s} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:underline truncate">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => onGenerateReport('pdf')} disabled={reportLoading} className="gap-2">
                {reportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => onGenerateReport('xlsx')} disabled={reportLoading} className="gap-2">
                {reportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                XLSX
              </Button>
              <Button variant="outline" size="sm" onClick={onEmailReport} disabled={emailLoading || recipientsCount === 0} className="gap-2">
                {emailLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Email
              </Button>
              <Button variant="outline" size="sm" onClick={onSlackPost} disabled={slackLoading || !slackChannel} className="gap-2">
                {slackLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                Slack
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Distribution Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No distribution events for this snapshot yet.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((l: any, i: number) => {
                    const ok = l?.status === 'sent'
                    return (
                      <div key={l?._id || i} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5">
                          {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{l?.channel || '—'}</span>
                            <Badge variant={ok ? 'default' : 'destructive'} className="text-xs">{l?.status || 'pending'}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {l?.recipients || ''}
                          </div>
                          {l?.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.message}</p>}
                          <div className="text-xs text-muted-foreground mt-1">
                            {l?.sent_at ? new Date(l.sent_at).toLocaleString() : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
