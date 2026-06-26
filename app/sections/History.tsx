'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, TrendingDown, TrendingUp, GitCompare, X } from 'lucide-react'

interface HistoryProps {
  snapshots: any[]
  onOpenSnapshot: (s: any) => void
}

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return '—'
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}M`
}
function formatPct(n: number) {
  if (!Number.isFinite(n)) return '0%'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export default function History({ snapshots, onOpenSnapshot }: HistoryProps) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const filtered = useMemo(() => {
    return snapshots.filter((s: any) => {
      const date = s?.snapshot_date || ''
      if (from && date < from) return false
      if (to && date > to) return false
      if (search) {
        const q = search.toLowerCase()
        const summary = String(s?.summary || '').toLowerCase()
        if (!date.toLowerCase().includes(q) && !summary.includes(q)) return false
      }
      return true
    })
  }, [snapshots, from, to, search])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const compareSnaps = compareMode
    ? selected.map(id => filtered.find((s: any) => String(s?._id) === id)).filter(Boolean)
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and compare prior snapshots</p>
        </div>
        <Button
          variant={compareMode ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={() => { setCompareMode(v => !v); setSelected([]) }}
        >
          <GitCompare className="h-4 w-4" />
          {compareMode ? 'Exit compare' : 'Compare mode'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="search" className="text-xs">Search</Label>
            <div className="relative mt-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="search" placeholder="Search date or summary" value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {compareMode && compareSnaps.length === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Side-by-side comparison</CardTitle>
            <CardDescription>{compareSnaps[0]?.snapshot_date} vs {compareSnaps[1]?.snapshot_date}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {compareSnaps.map((s: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="text-sm font-semibold border-b border-border pb-2">{s?.snapshot_date}</div>
                  <Row label="Revenue" value={formatMoney(Number(s?.total_revenue) || 0)} pct={Number(s?.revenue_variance_pct) || 0} />
                  <Row label="AUM" value={formatMoney(Number(s?.aum) || 0)} pct={Number(s?.aum_variance_pct) || 0} />
                  <Row label="Net Inflows" value={formatMoney(Number(s?.net_inflows) || 0)} pct={Number(s?.inflow_variance_pct) || 0} />
                  <Row label="Anomalies" value={String(s?.anomaly_count ?? 0)} />
                </div>
              ))}
            </div>
            {(() => {
              const a: any = compareSnaps[0]
              const b: any = compareSnaps[1]
              const revDiff = (Number(b?.total_revenue) || 0) - (Number(a?.total_revenue) || 0)
              const aumDiff = (Number(b?.aum) || 0) - (Number(a?.aum) || 0)
              return (
                <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Revenue delta</div>
                    <div className={`text-lg font-semibold ${revDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {revDiff >= 0 ? '+' : ''}{formatMoney(revDiff)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">AUM delta</div>
                    <div className={`text-lg font-semibold ${aumDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {aumDiff >= 0 ? '+' : ''}{formatMoney(aumDiff)}
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Snapshots</CardTitle>
            <Badge variant="outline">{filtered.length} of {snapshots.length}</Badge>
          </div>
          {compareMode && (
            <CardDescription>Select up to two rows to compare ({selected.length}/2)</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No snapshots match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    {compareMode && <th className="py-2 w-8"></th>}
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium">Revenue</th>
                    <th className="py-2 font-medium">AUM</th>
                    <th className="py-2 font-medium">Inflows</th>
                    <th className="py-2 font-medium">Variance</th>
                    <th className="py-2 font-medium">Anomalies</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s: any) => {
                    const id = String(s?._id || s?.snapshot_date)
                    const isSel = selected.includes(id)
                    const revVar = Number(s?.revenue_variance_pct) || 0
                    const anomalyCount = Number(s?.anomaly_count) || 0
                    return (
                      <tr key={id} className={`border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors ${isSel ? 'bg-primary/10' : ''}`}>
                        {compareMode && (
                          <td className="py-2.5">
                            <Checkbox checked={isSel} onCheckedChange={() => toggleSelect(id)} />
                          </td>
                        )}
                        <td className="py-2.5 font-medium">{s?.snapshot_date || '—'}</td>
                        <td className="py-2.5">{formatMoney(Number(s?.total_revenue) || 0)}</td>
                        <td className="py-2.5">{formatMoney(Number(s?.aum) || 0)}</td>
                        <td className="py-2.5">{formatMoney(Number(s?.net_inflows) || 0)}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs ${revVar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {revVar >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {formatPct(revVar)}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {anomalyCount > 0
                            ? <Badge variant="destructive" className="text-xs">{anomalyCount}</Badge>
                            : <Badge variant="secondary" className="text-xs">0</Badge>}
                        </td>
                        <td className="py-2.5 text-right">
                          <Button size="sm" variant="ghost" onClick={() => onOpenSnapshot(s)}>View</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value, pct }: { label: string; value: string; pct?: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        {pct !== undefined && (
          <span className={`text-xs ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  )
}
