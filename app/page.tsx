'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { getSchedule } from '@/lib/scheduler'
import Sidebar from './sections/Sidebar'
import Dashboard from './sections/Dashboard'
import SnapshotDetail from './sections/SnapshotDetail'
import History from './sections/History'
import Settings from './sections/Settings'
import { Badge } from '@/components/ui/badge'

const COORDINATOR_AGENT_ID = '6a3ee8b150540b159f3503a9'
const REPORT_AGENT_ID = '6a3ee89215ccc387243f7364'
const EMAIL_AGENT_ID = '6a3ee899ccf651cec4383948'
const SLACK_AGENT_ID = '6a3ee8a015ccc387243f7366'
const SCHEDULE_ID = '6a3ee8b5625044e1169dd75f'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Page() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [config, setConfig] = useState<any>({
    email_recipients: [],
    slack_channel: '',
    schedule_time: '08:00',
    business_days_only: true,
  })
  const [distributionLogs, setDistributionLogs] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any>(null)
  const [detailSnapshot, setDetailSnapshot] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState('')

  const [reportLoading, setReportLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [slackLoading, setSlackLoading] = useState(false)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0])
  }, [])

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/snapshots?limit=200')
      const json = await res.json()
      if (json?.success && Array.isArray(json.data)) setSnapshots(json.data)
    } catch (err) { console.error(err) }
  }, [])

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/distribution-config')
      const json = await res.json()
      if (json?.success && json.data) setConfig(json.data)
    } catch (err) { console.error(err) }
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/distribution-log')
      const json = await res.json()
      if (json?.success && Array.isArray(json.data)) setDistributionLogs(json.data)
    } catch (err) { console.error(err) }
  }, [])

  const loadScheduleInfo = useCallback(async () => {
    try {
      const sch: any = await getSchedule(SCHEDULE_ID)
      setSchedule(sch || null)
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => {
    loadSnapshots()
    loadConfig()
    loadLogs()
    loadScheduleInfo()
  }, [loadSnapshots, loadConfig, loadLogs, loadScheduleInfo])

  const todaySnapshot = useMemo(() => {
    if (!today) return null
    return snapshots.find((s: any) => s?.snapshot_date === today) || snapshots[0] || null
  }, [snapshots, today])

  const todayLogs = useMemo(() => {
    return distributionLogs.filter((l: any) => {
      if (!l?.sent_at) return false
      const d = new Date(l.sent_at).toISOString().split('T')[0]
      return d === today
    })
  }, [distributionLogs, today])

  const clearActionAlerts = () => {
    setActionError(null)
    setActionStatus(null)
  }

  const handleRunAnalysis = async () => {
    setRunning(true)
    setRunError(null)
    setRunStatus('Scraping market data and computing variance vs prior snapshot…')
    clearActionAlerts()

    const dateStr = new Date().toISOString().split('T')[0]
    const message = `Run the daily market revenue and AUM analysis for ${dateStr}. Pull latest revenue, AUM, net inflows from public sources. Compute variance vs the most recent prior snapshot. Flag anomalies. Return structured JSON matching the snapshot schema.`

    const result = await callAIAgent(message, COORDINATOR_AGENT_ID)

    if (!result?.success || result?.response?.status !== 'success') {
      setRunError(result?.response?.message || 'Coordinator did not return a successful response.')
      setRunning(false)
      return
    }

    const data = result.response.result
    if (!data || typeof data !== 'object') {
      setRunError('Coordinator returned an empty payload.')
      setRunning(false)
      return
    }

    try {
      const payload = {
        snapshot_date: data?.snapshot_date || dateStr,
        total_revenue: data?.total_revenue,
        aum: data?.aum,
        net_inflows: data?.net_inflows,
        revenue_variance_pct: data?.revenue_variance_pct,
        aum_variance_pct: data?.aum_variance_pct,
        inflow_variance_pct: data?.inflow_variance_pct,
        anomaly_count: data?.anomaly_count,
        top_movers: Array.isArray(data?.top_movers) ? data.top_movers : [],
        anomalies: Array.isArray(data?.anomalies) ? data.anomalies : [],
        raw_sources: Array.isArray(data?.raw_sources) ? data.raw_sources : [],
        summary: data?.summary || '',
      }
      const saveRes = await fetch('/api/snapshots', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const saveJson = await saveRes.json()
      if (!saveJson?.success) {
        setRunError(saveJson?.error || 'Failed to persist snapshot')
      } else {
        await loadSnapshots()
        setActionStatus(`Snapshot ${payload.snapshot_date} captured`)
      }
    } catch (err: any) {
      setRunError(err?.message || 'Failed to save snapshot')
    } finally {
      setRunning(false)
      setRunStatus('')
    }
  }

  const getActiveSnapshot = () => detailSnapshot || todaySnapshot

  const handleGenerateReport = async (format: 'pdf' | 'xlsx') => {
    const snap = getActiveSnapshot()
    if (!snap) {
      setActionError('No snapshot available to generate a report from.')
      return
    }
    setReportLoading(true)
    clearActionAlerts()

    const message = `Generate a ${format.toUpperCase()} report for the market snapshot dated ${snap?.snapshot_date}. KPIs: total revenue $${snap?.total_revenue}M (${snap?.revenue_variance_pct}% vs prior), AUM $${snap?.aum}M (${snap?.aum_variance_pct}%), net inflows $${snap?.net_inflows}M (${snap?.inflow_variance_pct}%). Anomalies flagged: ${snap?.anomaly_count}. Summary: ${snap?.summary || 'n/a'}.`

    const result = await callAIAgent(message, REPORT_AGENT_ID)

    if (!result?.success || result?.response?.status !== 'success') {
      setActionError(result?.response?.message || 'Report agent failed')
      setReportLoading(false)
      return
    }

    const file = result?.module_outputs?.artifact_files?.[0]
    const fileUrl = file?.file_url || result?.response?.result?.download_url || ''
    const fileName = file?.file_name || `report-${snap?.snapshot_date}.${format}`

    try {
      await fetch('/api/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot_id: String(snap?._id || ''),
          format,
          file_url: fileUrl,
          file_name: fileName,
        }),
      })
      if (fileUrl) {
        setActionStatus(`Report ready: ${fileName}`)
        try { window.open(fileUrl, '_blank') } catch {}
      } else {
        setActionStatus('Report generated (no file URL returned)')
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to persist report')
    } finally {
      setReportLoading(false)
    }
  }

  const handleEmailReport = async () => {
    const snap = getActiveSnapshot()
    if (!snap) { setActionError('No snapshot available.'); return }
    const recipients = Array.isArray(config?.email_recipients) ? config.email_recipients : []
    if (recipients.length === 0) {
      setActionError('Add recipients in Settings before sending email.')
      return
    }
    setEmailLoading(true)
    clearActionAlerts()

    const subject = `Daily Market Snapshot — ${snap?.snapshot_date}`
    const body = `Daily KPIs for ${snap?.snapshot_date}:\n\n- Total Revenue: $${snap?.total_revenue}M (${snap?.revenue_variance_pct}% DoD)\n- AUM: $${snap?.aum}M (${snap?.aum_variance_pct}% DoD)\n- Net Inflows: $${snap?.net_inflows}M (${snap?.inflow_variance_pct}% DoD)\n- Anomalies: ${snap?.anomaly_count}\n\nSummary: ${snap?.summary || 'n/a'}`
    const message = `Send an email to ${recipients.join(', ')} with subject "${subject}" and body: ${body}`

    const result = await callAIAgent(message, EMAIL_AGENT_ID)

    const ok = result?.success && result?.response?.status === 'success'
    try {
      await fetch('/api/distribution-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot_id: String(snap?._id || ''),
          channel: 'email',
          recipients: recipients.join(', '),
          status: ok ? 'sent' : 'failed',
          message: result?.response?.result?.message || result?.response?.message || subject,
        }),
      })
      await loadLogs()
    } catch {}

    if (ok) {
      setActionStatus(`Email sent to ${recipients.length} recipient(s)`)
    } else {
      setActionError(result?.response?.message || 'Email agent failed')
    }
    setEmailLoading(false)
  }

  const handleSlackPost = async () => {
    const snap = getActiveSnapshot()
    if (!snap) { setActionError('No snapshot available.'); return }
    const channel = config?.slack_channel || ''
    if (!channel) {
      setActionError('Set a Slack channel in Settings first.')
      return
    }
    setSlackLoading(true)
    clearActionAlerts()

    const text = `Today's snapshot (${snap?.snapshot_date}): Revenue $${snap?.total_revenue}M (${snap?.revenue_variance_pct}%), AUM $${snap?.aum}M (${snap?.aum_variance_pct}%), Net Inflows $${snap?.net_inflows}M. ${snap?.anomaly_count} anomalies flagged.`
    const message = `Post to Slack channel ${channel}: ${text}`

    const result = await callAIAgent(message, SLACK_AGENT_ID)
    const ok = result?.success && result?.response?.status === 'success'

    try {
      await fetch('/api/distribution-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot_id: String(snap?._id || ''),
          channel: 'slack',
          recipients: channel,
          status: ok ? 'sent' : 'failed',
          message: result?.response?.result?.message_posted || text,
        }),
      })
      await loadLogs()
    } catch {}

    if (ok) {
      setActionStatus(`Posted to ${channel}`)
    } else {
      setActionError(result?.response?.message || 'Slack agent failed')
    }
    setSlackLoading(false)
  }

  const handleSaveConfig = async (cfg: any) => {
    try {
      const res = await fetch('/api/distribution-config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      const json = await res.json()
      if (json?.success) {
        setConfig(json.data || cfg)
        return { ok: true }
      }
      return { ok: false, error: json?.error || 'Failed to save' }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to save' }
    }
  }

  const handleOpenSnapshot = (s: any) => {
    setDetailSnapshot(s)
    setDetailOpen(true)
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-14 border-b border-border bg-card/40 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tracking-tight">AUMate</span>
              <span className="text-xs text-muted-foreground">Daily Market Revenue & AUM Analyzer</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {today || '—'}
              </Badge>
              <Badge variant={schedule?.is_active ? 'default' : 'secondary'} className="text-xs">
                Schedule {schedule?.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'dashboard' && (
                <Dashboard
                  snapshots={snapshots}
                  todaySnapshot={todaySnapshot}
                  onRunAnalysis={handleRunAnalysis}
                  running={running}
                  runError={runError}
                  runStatus={runStatus}
                  config={config}
                  schedule={schedule}
                  distributionLogs={todayLogs}
                  onOpenSnapshot={handleOpenSnapshot}
                  onGenerateReport={handleGenerateReport}
                  onEmailReport={handleEmailReport}
                  onSlackPost={handleSlackPost}
                  reportLoading={reportLoading}
                  emailLoading={emailLoading}
                  slackLoading={slackLoading}
                  actionStatus={actionStatus}
                  actionError={actionError}
                />
              )}
              {activeTab === 'history' && (
                <History snapshots={snapshots} onOpenSnapshot={handleOpenSnapshot} />
              )}
              {activeTab === 'settings' && (
                <Settings config={config} onSaveConfig={handleSaveConfig} scheduleId={SCHEDULE_ID} />
              )}
            </div>
          </main>
        </div>

        <SnapshotDetail
          snapshot={detailSnapshot}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          distributionLogs={distributionLogs}
          onGenerateReport={handleGenerateReport}
          onEmailReport={handleEmailReport}
          onSlackPost={handleSlackPost}
          reportLoading={reportLoading}
          emailLoading={emailLoading}
          slackLoading={slackLoading}
          recipientsCount={Array.isArray(config?.email_recipients) ? config.email_recipients.length : 0}
          slackChannel={config?.slack_channel || ''}
        />
      </div>
    </ErrorBoundary>
  )
}
