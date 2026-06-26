import { initDB, createModel } from 'lyzr-architect'

let _model: any = null
export default async function getDistributionConfigModel() {
  if (!_model) {
    await initDB()
    _model = createModel('DistributionConfig', {
      email_recipients: { type: [String], default: [] },
      slack_channel: { type: String, default: '' },
      schedule_time: { type: String, default: '08:00' },
      business_days_only: { type: Boolean, default: true },
    })
  }
  return _model
}
