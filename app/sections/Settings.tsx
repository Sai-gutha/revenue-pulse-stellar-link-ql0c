'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  X, Plus, CheckCircle2, AlertCircle, Clock, Calendar, Mail, MessageSquare,
  Play, Pause, Loader2, History,
} from 'lucide-react'
import {
  getSchedule, pauseSchedule, resumeSchedule, cronToHuman, getScheduleLogs,
} from '@/lib/scheduler'

interface SettingsProps {
  config: any
  onSaveConfig: (cfg: any) => Promise<{ ok: boolean; error?: string }>
  scheduleId: string
}

export default function Settings({ config, onSaveConfig, scheduleId }: SettingsProps) {
  const [emails, setEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [slackChannel, setSlackChannel] = useState('')
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [businessDays, setBusinessDays] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  const [schedule, setSchedule] = useState<any>(null)
  const [scheduleLogs, setScheduleLogs] = useState<any[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    setEmails(Array.isArray(config?.email_recipients) ? config.email_recipients : [])
    setSlackChannel(config?.slack_channel || '')
    setScheduleTime(config?.schedule_time || '08:00')
    setBusinessDays(config?.business_days_only !== false)
  }, [config])

  const loadSchedule = async () => {
    setScheduleLoading(true)
    setScheduleError(null)
    try {
      const sch: any = await getSchedule(scheduleId)
      setSchedule(sch || null)
      const logs: any = await getScheduleLogs(scheduleId, { limit: 10 })
      const logArr = Array.isArray(logs) ? logs : (Array.isArray(logs?.logs) ? logs.logs : (Array.isArray(logs?.data) ? logs.data : []))
      setScheduleLogs(logArr)
    } catch (err: any) {
      setScheduleError(err?.message || 'Failed to load schedule')
    } finally {
      setScheduleLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId])

  const addEmail = () => {
    const v = newEmail.trim()
    if (!v) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setSaveErr('Please enter a valid email address')
      return
    }
    if (emails.includes(v)) return
    setEmails(prev => [...prev, v])
    setNewEmail('')
    setSaveErr(null)
  }

  const removeEmail = (e: string) => setEmails(prev => prev.filter(x => x !== e))

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    setSaveErr(null)
    const res = await onSaveConfig({
      email_recipients: emails,
      slack_channel: slackChannel,
      schedule_time: scheduleTime,
      business_days_only: businessDays,
    })
    setSaving(false)
    if (res.ok) {
      setSaveMsg('Settings saved successfully')
      setTimeout(() => setSaveMsg(null), 4000)
    } else {
      setSaveErr(res.error || 'Failed to save settings')
    }
  }

  const handleToggleSchedule = async () => {
    if (!schedule) return
    setToggling(true)
    setScheduleError(null)
    try {
      if (schedule?.is_active) {
        await pauseSchedule(scheduleId)
      } else {
        if (emails.length === 0) {
          setScheduleError('Add at least one recipient email before activating the schedule')
          setToggling(false)
          return
        }
        await resumeSchedule(scheduleId)
      }
      await loadSchedule()
    } catch (err: any) {
      setScheduleError(err?.message || 'Failed to update schedule')
    } finally {
      setToggling(false)
    }
  }

  const cronHuman = schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'Weekdays at 8:00 AM ET'
  const canActivate = emails.length > 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage distribution targets and scheduled runs</p>
      </div>

      {saveMsg && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{saveMsg}</AlertDescription>
        </Alert>
      )}

      {saveErr && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{saveErr}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Recipients
          </CardTitle>
          <CardDescription>Who receives the daily report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="analyst@firm.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail() } }}
            />
            <Button onClick={addEmail} variant="outline" className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          {emails.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recipients yet. Add at least one before scheduled runs can send.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {emails.map((e) => (
                <Badge key={e} variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1">
                  {e}
                  <button onClick={() => removeEmail(e)} className="ml-1 hover:bg-muted rounded p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Slack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="slack" className="text-xs">Channel</Label>
          <Input id="slack" placeholder="#market-ops" value={slackChannel}
            onChange={(e) => setSlackChannel(e.target.value)} className="mt-1 max-w-md" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </CardTitle>
          <CardDescription>Daily run cadence preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="time" className="text-xs">Preferred run time</Label>
              <Input id="time" type="time" value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-3">
                <Switch id="bizdays" checked={businessDays} onCheckedChange={setBusinessDays} />
                <Label htmlFor="bizdays" className="text-sm cursor-pointer">Business days only</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule Activation
              </CardTitle>
              <CardDescription className="mt-1">Toggle the daily automated run</CardDescription>
            </div>
            <Badge variant={schedule?.is_active ? 'default' : 'secondary'}>
              {schedule?.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {scheduleError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{scheduleError}</AlertDescription>
            </Alert>
          )}

          {scheduleLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Cadence</div>
                  <div className="font-medium mt-0.5">{cronHuman}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Cron expression</div>
                  <div className="font-mono text-xs mt-0.5">{schedule?.cron_expression || '0 8 * * 1-5'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Timezone</div>
                  <div className="font-medium mt-0.5">{schedule?.timezone || 'America/New_York'}</div>
                </div>
              </div>

              {!canActivate && !schedule?.is_active && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Recipients required</AlertTitle>
                  <AlertDescription>
                    Add at least one email recipient and save before activating the schedule. Scheduled runs distribute the daily report by email.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleToggleSchedule}
                disabled={toggling || scheduleLoading || (!schedule?.is_active && !canActivate)}
                variant={schedule?.is_active ? 'outline' : 'default'}
                className="gap-2"
              >
                {toggling ? <Loader2 className="h-4 w-4 animate-spin" />
                  : schedule?.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {schedule?.is_active ? 'Pause Schedule' : 'Resume Schedule'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Scheduled Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduleLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled executions logged yet.</p>
          ) : (
            <div className="space-y-2">
              {scheduleLogs.map((log: any, i: number) => (
                <div key={log?._id || i} className="flex items-center justify-between p-2.5 rounded-md border border-border">
                  <div className="text-xs">
                    <div className="font-medium">{log?.executed_at || log?.created_at || log?.timestamp || 'Execution'}</div>
                    <div className="text-muted-foreground mt-0.5">{log?.status || log?.message || ''}</div>
                  </div>
                  <Badge variant={String(log?.status).toLowerCase() === 'success' ? 'default' : 'secondary'} className="text-xs">
                    {log?.status || 'logged'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
