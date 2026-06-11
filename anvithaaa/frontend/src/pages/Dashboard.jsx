import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDashboard } from '../api/client'
import ScoreGauge from '../components/ScoreGauge'
import { TrendLineChart } from '../components/Charts'

function StatCard({ label, value, sub }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  if (isLoading) return <div className="text-slate-500">Loading dashboard...</div>
  if (error) return <div className="text-red-600">Failed to load dashboard. Is the backend running?</div>

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500 mt-1">Network compliance overview and audit activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Devices" value={data.total_devices} />
        <StatCard label="Total Audits" value={data.total_audits} />
        <StatCard label="Avg Compliance" value={`${data.average_compliance}%`} />
        <StatCard label="Golden Templates" value={data.total_templates} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Average Compliance Score</h3>
          <ScoreGauge score={data.average_compliance} />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Compliance Trends</h3>
          <TrendLineChart trends={data.compliance_trends} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Device Inventory</h3>
          {data.device_inventory?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2">Vendor</th>
                  <th className="pb-2">Device Type</th>
                  <th className="pb-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.device_inventory.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2">{item.vendor}</td>
                    <td className="py-2 capitalize">{item.device_type}</td>
                    <td className="py-2 font-medium">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-500 text-sm">No devices uploaded yet.</p>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Audit Reports</h3>
            <Link to="/reports" className="text-brand-600 text-sm hover:underline">View all</Link>
          </div>
          {data.recent_reports?.length ? (
            <div className="space-y-3">
              {data.recent_reports.slice(0, 5).map((r) => (
                <Link
                  key={r.id}
                  to={`/reports/${r.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100"
                >
                  <div>
                    <p className="font-medium">{r.device_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{r.device_type} · {r.audit_mode}</p>
                  </div>
                  <span className={`font-bold ${r.overall_score >= 80 ? 'text-green-600' : r.overall_score >= 60 ? 'text-amber-500' : 'text-red-600'}`}>
                    {r.overall_score}%
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No audits run yet. <Link to="/upload" className="text-brand-600 hover:underline">Upload configs</Link> to get started.</p>
          )}
        </div>
      </div>
    </div>
  )
}
