import { optionalAuth } from 'lyzr-architect'
import { NextRequest, NextResponse } from 'next/server'
import getDistributionLogModel from '@/models/distributionLog'

export const dynamic = 'force-dynamic'

export const GET = optionalAuth(async (req: NextRequest) => {
  try {
    const Log = await getDistributionLogModel()
    const { searchParams } = new URL(req.url)
    const snapshot_id = searchParams.get('snapshot_id')
    const query: any = {}
    if (snapshot_id) query.snapshot_id = snapshot_id
    const logs = await Log.find(query).sort({ sent_at: -1 }).limit(200)
    return NextResponse.json({ success: true, data: logs })
  } catch (err: any) {
    console.error('[API] GET /api/distribution-log error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})

export const POST = optionalAuth(async (req: NextRequest) => {
  try {
    const Log = await getDistributionLogModel()
    const body = await req.json()
    const { getCurrentUserId } = await import('lyzr-architect')
    const log = await Log.create({
      snapshot_id: body?.snapshot_id || '',
      channel: body?.channel || 'email',
      recipients: body?.recipients || '',
      status: body?.status || 'pending',
      message: body?.message || '',
      owner_user_id: getCurrentUserId(),
    })
    return NextResponse.json({ success: true, data: log }, { status: 201 })
  } catch (err: any) {
    console.error('[API] POST /api/distribution-log error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})
