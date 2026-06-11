import { useQuery } from '@tanstack/react-query'
import { getDevices } from '../api/client'

export default function Inventory() {
  const { data: devices = [], isLoading } = useQuery({ queryKey: ['devices'], queryFn: getDevices })

  const byType = devices.reduce((acc, d) => {
    acc[d.device_type] = (acc[d.device_type] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Device Inventory</h2>
        <p className="text-slate-500 mt-1">All uploaded network device configurations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="card text-center">
            <p className="text-2xl font-bold text-brand-600">{count}</p>
            <p className="text-sm text-slate-500 capitalize">{type}</p>
          </div>
        ))}
      </div>

      <div className="card">
        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : devices.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3">Device Name</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Vendor</th>
                <th className="pb-3">File</th>
                <th className="pb-3">Detected At</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-3 font-medium">{d.device_name}</td>
                  <td className="py-3 capitalize">{d.device_type}</td>
                  <td className="py-3">{d.vendor}</td>
                  <td className="py-3 text-slate-500 font-mono text-xs">{d.file_path?.split('/').pop()}</td>
                  <td className="py-3 text-slate-500">
                    {d.detected_at ? new Date(d.detected_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500">No devices in inventory. Upload configurations to populate.</p>
        )}
      </div>
    </div>
  )
}
