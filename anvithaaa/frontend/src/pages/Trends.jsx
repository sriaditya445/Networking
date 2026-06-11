import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/client'
import { TrendLineChart } from '../components/Charts'

export default function Trends() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Compliance Trends</h2>
        <p className="text-slate-500 mt-1">Track compliance scores over time</p>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Daily Compliance Score Trend</h3>
        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          <TrendLineChart trends={data?.compliance_trends} />
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Trend Data</h3>
        {data?.compliance_trends?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2">Date</th>
                <th className="pb-2">Avg Score</th>
                <th className="pb-2">Devices Audited</th>
              </tr>
            </thead>
            <tbody>
              {[...data.compliance_trends].reverse().map((t) => (
                <tr key={t.date} className="border-b border-slate-100">
                  <td className="py-2">{t.date}</td>
                  <td className="py-2 font-medium">{t.overall_score}%</td>
                  <td className="py-2">{t.device_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500">No trend data available. Run audits to generate trends.</p>
        )}
      </div>
    </div>
  )
}
