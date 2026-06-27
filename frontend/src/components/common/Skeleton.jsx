import React from 'react';

export default function Skeleton({ type = 'line', className = '' }) {
  const getSkeletonStyles = () => {
    switch (type) {
      case 'card':
        return 'h-32 w-full rounded-2xl bg-slate-200/60';
      case 'circle':
        return 'h-10 w-10 rounded-full bg-slate-200/60';
      case 'table-row':
        return 'h-12 w-full rounded-xl bg-slate-200/50';
      case 'line':
      default:
        return 'h-4 w-full rounded-lg bg-slate-200/60';
    }
  };

  return (
    <div 
      className={`
        animate-pulse 
        ${getSkeletonStyles()} 
        ${className}
      `}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton type="circle" />
        <div className="space-y-2 flex-1">
          <Skeleton type="line" className="w-1/3 h-3" />
          <Skeleton type="line" className="w-1/2 h-5" />
        </div>
      </div>
      <Skeleton type="line" className="h-1.5" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="border border-slate-100 rounded-3xl bg-white overflow-hidden p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-center pb-2">
        <Skeleton type="line" className="w-1/4 h-5" />
        <Skeleton type="line" className="w-1/12 h-6" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton 
                key={cIdx} 
                type="line" 
                className={`h-4 ${cIdx === 0 ? 'flex-1' : 'w-24'}`} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
