import { optionalAuth } from 'lyzr-architect'
import { NextRequest, NextResponse } from 'next/server'
import getDistributionConfigModel from '@/models/distributionConfig'

export const dynamic = 'force-dynamic'

export const GET = optionalAuth(async (_req: NextRequest) => {
  try {
    const Config = await getDistributionConfigModel()
    let config = await Config.findOne({})
    if (!config) {
      config = {
        email_recipients: [],
        slack_channel: '',
        schedule_time: '08:00',
        business_days_only: true,
      }
    }
    return NextResponse.json({ success: true, data: config })
  } catch (err: any) {
    console.error('[API] GET /api/distribution-config error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})

export const PUT = optionalAuth(async (req: NextRequest) => {
  try {
    const Config = await getDistributionConfigModel()
    const body = await req.json()
    const { getCurrentUserId } = await import('lyzr-architect')
    const update: any = {
      email_recipients: Array.isArray(body?.email_recipients) ? body.email_recipients : [],
      slack_channel: body?.slack_channel || '',
      schedule_time: body?.schedule_time || '08:00',
      business_days_only: body?.business_days_only !== false,
    }
    let config = await Config.findOne({})
    if (config) {
      Object.assign(config, update)
      await config.save()
    } else {
      config = await Config.create({ ...update, owner_user_id: getCurrentUserId() })
    }
    return NextResponse.json({ success: true, data: config })
  } catch (err: any) {
    console.error('[API] PUT /api/distribution-config error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
})
