import { optionalAuth } from 'lyzr-architect'
import { NextRequest, NextResponse } from 'next/server'
import getSnapshotModel from '@/models/snapshot'

export const dynamic = 'force-dynamic'

export const GET = optionalAuth(async (req: NextRequest) => {
  try {
    const Snapshot = await getSnapshotModel()
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const query: any = {}
    if (from || to) {
      query.snapshot_date = {}
      if (from) query.snapshot_date.$gte = from
      if (to) query.snapshot_date.$lte = to
    }
    const snapshots = await Snapshot.find(query).sort({ snapshot_date: -1 }).limit(limit)
    return NextResponse.json({ success: true, data: snapshots })
  } catch (err: any) {
    console.error('[API] GET /api/snapshots error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})

export const POST = optionalAuth(async (req: NextRequest) => {
  try {
    const Snapshot = await getSnapshotModel()
    const body = await req.json()
    const { getCurrentUserId } = await import('lyzr-architect')
    const safeBody: any = {
      snapshot_date: body?.snapshot_date || new Date().toISOString().split('T')[0],
      total_revenue: Number(body?.total_revenue) || 0,
      aum: Number(body?.aum) || 0,
      net_inflows: Number(body?.net_inflows) || 0,
      revenue_variance_pct: Number(body?.revenue_variance_pct) || 0,
      aum_variance_pct: Number(body?.aum_variance_pct) || 0,
      inflow_variance_pct: Number(body?.inflow_variance_pct) || 0,
      anomaly_count: Number(body?.anomaly_count) || 0,
      top_movers: Array.isArray(body?.top_movers) ? body.top_movers : [],
      anomalies: Array.isArray(body?.anomalies) ? body.anomalies : [],
      raw_sources: Array.isArray(body?.raw_sources) ? body.raw_sources : [],
      summary: body?.summary || '',
      owner_user_id: getCurrentUserId(),
    }
    const snapshot = await Snapshot.create(safeBody)
    return NextResponse.json({ success: true, data: snapshot }, { status: 201 })
  } catch (err: any) {
    console.error('[API] POST /api/snapshots error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})
