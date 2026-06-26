import { initDB, createModel } from 'lyzr-architect'

let _model: any = null
export default async function getReportModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Report', {
      snapshot_id: { type: String, required: true, index: true },
      format: { type: String, enum: ['pdf', 'xlsx'] },
      file_url: { type: String, default: '' },
      file_name: { type: String, default: '' },
      generated_at: { type: Date, default: Date.now },
    })
  }
  return _model
}
