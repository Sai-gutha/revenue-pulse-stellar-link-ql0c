import { initDB, createModel } from 'lyzr-architect'

let _model: any = null
export default async function getDistributionLogModel() {
  if (!_model) {
    await initDB()
    _model = createModel('DistributionLog', {
      snapshot_id: { type: String, index: true, default: '' },
      channel: { type: String, enum: ['email', 'slack'] },
      recipients: { type: String, default: '' },
      status: { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending' },
      message: { type: String, default: '' },
      sent_at: { type: Date, default: Date.now },
    })
  }
  return _model
}
