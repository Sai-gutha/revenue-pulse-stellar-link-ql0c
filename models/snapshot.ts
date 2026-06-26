import { initDB, createModel } from 'lyzr-architect'

let _model: any = null
export default async function getSnapshotModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Snapshot', {
      snapshot_date: { type: String, required: true, index: true },
      total_revenue: { type: Number, default: 0 },
      aum: { type: Number, default: 0 },
      net_inflows: { type: Number, default: 0 },
      revenue_variance_pct: { type: Number, default: 0 },
      aum_variance_pct: { type: Number, default: 0 },
      inflow_variance_pct: { type: Number, default: 0 },
      anomaly_count: { type: Number, default: 0 },
      top_movers: { type: Array, default: [] },
      anomalies: { type: Array, default: [] },
      raw_sources: { type: Array, default: [] },
      summary: { type: String, default: '' },
    })
  }
  return _model
}
