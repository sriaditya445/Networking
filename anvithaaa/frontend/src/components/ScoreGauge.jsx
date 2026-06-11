export default function ScoreGauge({ score, size = 'lg' }) {
  const numScore = Number(score) || 0
  const color =
    numScore >= 80 ? 'text-green-600' : numScore >= 60 ? 'text-amber-500' : 'text-red-600'
  const ringColor =
    numScore >= 80 ? 'stroke-green-500' : numScore >= 60 ? 'stroke-amber-500' : 'stroke-red-500'
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (numScore / 100) * circumference
  const dim = size === 'lg' ? 'w-36 h-36' : 'w-24 h-24'
  const textSize = size === 'lg' ? 'text-3xl' : 'text-xl'

  return (
    <div className={`relative ${dim} mx-auto`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          className={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center ${textSize} font-bold ${color}`}>
        {numScore.toFixed(0)}%
      </div>
    </div>
  )
}
