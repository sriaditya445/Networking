import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getReports } from '../api/client'

export default function Reports() {
  const { data: reports = [], isLoading } = useQuery({ queryKey: ['reports'], queryFn: getReports })

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Audit Reports</h2>
        <p className="text-slate-500 mt-1">Historical compliance audit reports</p>
      </div>

      <div className="card">
        {isLoading ? (
          <p className="text-slate-500">Loading reports...</p>
        ) : reports.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3">Device</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Audit Mode</th>
                <th className="pb-3">Score</th>
                <th className="pb-3">Failed</th>
                <th className="pb-3">Date</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 font-medium">{r.device_name}</td>
                  <td className="py-3 capitalize">{r.device_type}</td>
                  <td className="py-3 capitalize">{r.audit_mode}</td>
                  <td className="py-3">
                    <span className={`font-bold ${r.overall_score >= 80 ? 'text-green-600' : r.overall_score >= 60 ? 'text-amber-500' : 'text-red-600'}`}>
                      {r.overall_score}%
                    </span>
                  </td>
                  <td className="py-3 text-red-600">{r.failed?.length || 0}</td>
                  <td className="py-3 text-slate-500">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="py-3">
                    <Link to={`/audit?report=${r.id}`} className="text-brand-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500">No audit reports yet.</p>
        )}
      </div>
    </div>
  )
}
