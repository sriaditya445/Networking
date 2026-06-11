import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getDevices, runAudit, runBatchAudit } from '../api/client'
import ScoreGauge from '../components/ScoreGauge'
import { CategoryBarChart } from '../components/Charts'
import { exportExcel, exportPdf } from '../api/client'

const AUDIT_MODES = [
  { value: 'full', label: 'Full Audit' },
  { value: 'aaa', label: 'AAA' },
  { value: 'security', label: 'Security' },
  { value: 'snmp', label: 'SNMP' },
  { value: 'ntp', label: 'NTP' },
  { value: 'dns', label: 'DNS' },
  { value: 'logging', label: 'Logging' },
  { value: 'layer2', label: 'Layer2' },
  { value: 'layer3', label: 'Layer3' },
  { value: 'wireless', label: 'Wireless' },
  { value: 'performance', label: 'Performance' },
  { value: 'interfaces', label: 'Interfaces' },
]

export default function Audit() {
  const location = useLocation()
  const batch = location.state?.batch
  const [auditMode, setAuditMode] = useState('full')
  const [selectedDevices, setSelectedDevices] = useState([])
  const [report, setReport] = useState(null)

  const { data: devices = [] } = useQuery({ queryKey: ['devices'], queryFn: getDevices })

  const auditMutation = useMutation({
    mutationFn: async () => {
      const ids = selectedDevices.length ? selectedDevices : devices.map((d) => d.id)
      if (ids.length === 1) return runAudit(ids[0], auditMode)
      return runBatchAudit(ids, auditMode)
    },
    onSuccess: (data) => {
      setReport(Array.isArray(data) ? data[0] : data)
    },
  })

  const toggleDevice = (id) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const displayReport = report

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Compliance Audit</h2>
        <p className="text-slate-500 mt-1">Run full or section-wise compliance audits against golden templates</p>
      </div>

      {batch && (
        <div className="card mb-6 bg-green-50 border-green-200">
          <p className="text-green-800 font-medium">Upload complete: {batch.count} device(s) detected</p>
          <ul className="mt-2 text-sm text-green-700">
            {batch.devices?.map((d) => (
              <li key={d.config_id}>• {d.device_name} — {d.device_type} ({d.vendor}, {Math.round(d.confidence * 100)}% confidence)</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card lg:col-span-1">
          <h3 className="font-semibold mb-4">Audit Configuration</h3>
          <label className="block text-sm font-medium text-slate-700 mb-2">Audit Type</label>
          <select
            className="input mb-4"
            value={auditMode}
            onChange={(e) => setAuditMode(e.target.value)}
          >
            {AUDIT_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <label className="block text-sm font-medium text-slate-700 mb-2">Select Devices</label>
          <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
            {devices.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(d.id)}
                  onChange={() => toggleDevice(d.id)}
                  className="rounded border-slate-300"
                />
                <span>{d.device_name}</span>
                <span className="text-slate-400 capitalize">({d.device_type})</span>
              </label>
            ))}
            {!devices.length && <p className="text-slate-500 text-sm">No devices. Upload configs first.</p>}
          </div>

          <button
            className="btn-primary w-full"
            onClick={() => auditMutation.mutate()}
            disabled={auditMutation.isPending || !devices.length}
          >
            {auditMutation.isPending ? 'Running Audit...' : 'Generate Report'}
          </button>
          {auditMutation.isError && (
            <p className="text-red-600 text-sm mt-2">{auditMutation.error.message}</p>
          )}
        </div>

        {displayReport && (
          <div className="card lg:col-span-2">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold">{displayReport.device_name}</h3>
                <p className="text-slate-500 capitalize">{displayReport.device_type} · {displayReport.audit_mode} audit</p>
              </div>
              <div className="flex gap-2">
                <a href={exportPdf(displayReport.id)} className="btn-secondary text-sm" download>PDF</a>
                <a href={exportExcel(displayReport.id)} className="btn-secondary text-sm" download>Excel</a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScoreGauge score={displayReport.overall_score} />
              <CategoryBarChart categoryScores={displayReport.category_scores} />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{displayReport.passed?.length || 0}</p>
                <p className="text-xs text-green-600">Passed</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-700">{displayReport.failed?.length || 0}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-700">{displayReport.recommendations?.length || 0}</p>
                <p className="text-xs text-amber-600">Recommendations</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {displayReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4 text-green-700">Passed Rules ({displayReport.passed?.length})</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {displayReport.passed?.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 bg-green-50 rounded">
                  <span className="badge-pass">PASS</span>
                  <code className="text-xs break-all">{r.rule}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4 text-red-700">Failed Rules ({displayReport.failed?.length})</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {displayReport.failed?.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 bg-red-50 rounded">
                  <span className="badge-fail">FAIL</span>
                  <code className="text-xs break-all">{r.rule}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="card lg:col-span-2">
            <h3 className="font-semibold mb-4">Recommendations & Remediation</h3>
            <div className="space-y-4">
              {displayReport.recommendations?.map((r, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-fail">FAIL</span>
                    <code className="text-sm font-medium">{r.rule}</code>
                  </div>
                  <p className="text-sm text-slate-600"><strong>Issue:</strong> {r.recommendation}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    <strong>Remediation:</strong>{' '}
                    <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{r.remediation}</code>
                  </p>
                </div>
              ))}
              {!displayReport.recommendations?.length && (
                <p className="text-green-600 text-sm">All controls passed — no remediation needed.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
