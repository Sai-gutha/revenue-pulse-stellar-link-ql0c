import { optionalAuth } from 'lyzr-architect'
import { NextRequest, NextResponse } from 'next/server'
import getReportModel from '@/models/report'

export const dynamic = 'force-dynamic'

export const GET = optionalAuth(async (req: NextRequest) => {
  try {
    const Report = await getReportModel()
    const { searchParams } = new URL(req.url)
    const snapshot_id = searchParams.get('snapshot_id')
    const query: any = {}
    if (snapshot_id) query.snapshot_id = snapshot_id
    const reports = await Report.find(query).sort({ generated_at: -1 }).limit(100)
    return NextResponse.json({ success: true, data: reports })
  } catch (err: any) {
    console.error('[API] GET /api/reports error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})

export const POST = optionalAuth(async (req: NextRequest) => {
  try {
    const Report = await getReportModel()
    const body = await req.json()
    const { getCurrentUserId } = await import('lyzr-architect')
    const report = await Report.create({
      snapshot_id: body?.snapshot_id || '',
      format: body?.format || 'pdf',
      file_url: body?.file_url || '',
      file_name: body?.file_name || '',
      owner_user_id: getCurrentUserId(),
    })
    return NextResponse.json({ success: true, data: report }, { status: 201 })
  } catch (err: any) {
    console.error('[API] POST /api/reports error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})
