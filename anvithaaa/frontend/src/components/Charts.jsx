import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

export function CategoryBarChart({ categoryScores }) {
  const data = Object.entries(categoryScores || {})
    .filter(([, v]) => v > 0)
    .map(([name, score]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      score,
    }))

  if (!data.length) return <p className="text-slate-500 text-sm">No category data available.</p>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
        <Bar dataKey="score" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TrendLineChart({ trends }) {
  const data = (trends || []).map((t) => ({
    date: t.date,
    score: t.overall_score,
    devices: t.device_count,
  }))

  if (!data.length) return <p className="text-slate-500 text-sm">No trend data yet. Run audits to populate.</p>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name="Compliance %" />
      </LineChart>
    </ResponsiveContainer>
  )
}
