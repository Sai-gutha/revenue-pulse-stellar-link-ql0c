import { optionalAuth } from 'lyzr-architect'
import { NextRequest, NextResponse } from 'next/server'
import getSnapshotModel from '@/models/snapshot'

export const dynamic = 'force-dynamic'

export const GET = optionalAuth(async (_req: NextRequest, ctx: any) => {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const Snapshot = await getSnapshotModel()
    const snapshot = await Snapshot.findById(id)
    if (!snapshot) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: snapshot })
  } catch (err: any) {
    console.error('[API] GET /api/snapshots/[id] error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})

export const DELETE = optionalAuth(async (_req: NextRequest, ctx: any) => {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const Snapshot = await getSnapshotModel()
    await Snapshot.findByIdAndDelete(id)
    return NextResponse.json({ success: true, data: { id } })
  } catch (err: any) {
    console.error('[API] DELETE /api/snapshots/[id] error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})
