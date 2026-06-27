import React, { useState } from 'react';

/**
 * Donut Chart Component
 * @param {Array} data - Array of objects: { label, value, color }
 */
export function SVGDonutChart({ data = [], title, subtitle }) {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0) || 1;
  const [hoveredIdx, setHoveredIdx] = useState(null);

  let accumulatedAngle = 0;

  const slices = data.map((item, idx) => {
    const value = item.value || 0;
    const percentage = (value / total) * 100;
    const strokeDash = `${percentage} ${100 - percentage}`;
    const strokeOffset = 100 - accumulatedAngle + 25; // start from top
    accumulatedAngle += percentage;

    return {
      ...item,
      percentage,
      strokeDash,
      strokeOffset,
    };
  });

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div>
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h4>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
        {/* SVG Circle */}
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="3.5"
            />
            {/* Slices */}
            {slices.map((slice, idx) => {
              if (slice.value === 0) return null;
              const isHovered = hoveredIdx === idx;
              return (
                <circle
                  key={idx}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isHovered ? '4.5' : '3.5'}
                  strokeDasharray={slice.strokeDash}
                  strokeDashoffset={slice.strokeOffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>
          <div className="absolute text-center flex flex-col pointer-events-none">
            {hoveredIdx !== null ? (
              <>
                <span className="text-lg font-black text-slate-800">
                  {slices[hoveredIdx].percentage.toFixed(0)}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[80px]">
                  {slices[hoveredIdx].label}
                </span>
              </>
            ) : (
              <>
                <span className="text-xl font-black text-slate-800">
                  {total}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Total
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5 overflow-y-auto max-h-36 pr-1">
          {slices.map((slice, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between text-[11px] p-1 rounded-lg transition-colors cursor-pointer ${
                hoveredIdx === idx ? 'bg-slate-50' : ''
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-slate-650 font-medium truncate" title={slice.label}>
                  {slice.label}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-800">
                {slice.value} ({slice.percentage.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Bar Chart Component
 * @param {Array} data - Array of objects: { label, value, color }
 */
export function SVGBarChart({ data = [], title, subtitle }) {
  const maxVal = Math.max(...data.map(item => item.value || 0), 1);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div>
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h4>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="space-y-3 mt-4">
        {data.map((item, idx) => {
          const val = item.value || 0;
          const percentage = (val / maxVal) * 100;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className="space-y-1"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex justify-between items-center text-[11px] font-sans">
                <span className="text-slate-600 font-semibold">{item.label}</span>
                <span className="text-slate-800 font-mono font-bold">
                  {val} {val === 1 ? 'record' : 'records'}
                </span>
              </div>
              <div className="w-full bg-slate-50 border border-slate-100 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-500 cursor-pointer"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                    filter: isHovered ? 'brightness(0.9)' : 'none',
                    boxShadow: isHovered ? `0 0 8px ${item.color}50` : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Area/Line Chart Component
 * @param {Array} data - Array of values or data points: e.g. [12, 19, 3, 5, 2, 3] or { label, value }
 */
export function SVGAreaChart({ data = [], title, subtitle, color = '#06b6d4', height = 120 }) {
  const points = data.map((d) => (typeof d === 'object' ? d.value : d)) || [];
  const labels = data.map((d, i) => (typeof d === 'object' ? d.label : `P${i + 1}`)) || [];
  const maxVal = Math.max(...points, 1);
  const minVal = 0;
  const range = maxVal - minVal;
  
  const width = 500;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Build SVG Path
  const svgPoints = points.map((val, idx) => {
    const x = padding + (idx / (points.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y, value: val, label: labels[idx] };
  });

  const pathD = svgPoints.reduce((acc, p, idx) => {
    return acc + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y} `;
  }, '');

  const areaD = pathD
    ? pathD +
      `L ${svgPoints[svgPoints.length - 1].x} ${height - padding} ` +
      `L ${svgPoints[0].x} ${height - padding} Z`
    : '';

  const [activePoint, setActivePoint] = useState(null);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h4>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {activePoint && (
          <div className="text-right font-mono text-[10px]">
            <span className="text-slate-400 mr-1.5">{activePoint.label}:</span>
            <span className="font-bold text-slate-800">{activePoint.value}</span>
          </div>
        )}
      </div>

      <div className="relative mt-4">
        {points.length <= 1 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Insufficient timeline data.
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
            <defs>
              <linearGradient id={`area-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid Line */}
            <line
              x1={padding}
              y1={padding + chartHeight}
              x2={padding + chartWidth}
              y2={padding + chartHeight}
              stroke="#f1f5f9"
              strokeWidth="1.5"
            />
            <line
              x1={padding}
              y1={padding}
              x2={padding + chartWidth}
              y2={padding}
              stroke="#f1f5f9"
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Area Path */}
            <path d={areaD} fill={`url(#area-grad-${color})`} />

            {/* Line Path */}
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Dots */}
            {svgPoints.map((p, idx) => {
              const isActive = activePoint && activePoint.idx === idx;
              return (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 5.5 : 3.5}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setActivePoint({ ...p, idx })}
                    onMouseLeave={() => setActivePoint(null)}
                  />
                  {isActive && (
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={p.x}
                      y2={height - padding}
                      stroke={color}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
