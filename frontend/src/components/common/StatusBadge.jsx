import React from 'react';

/**
 * StatusBadge component.
 * 
 * @param {string} status - Status value (Active, Inactive, Success, Pending, Failed, Processing, Uploaded, Not Uploaded)
 */
export default function StatusBadge({ status = '' }) {
  const norm = (status || '').toLowerCase().trim();

  switch (norm) {
    case 'active':
    case 'success':
    case 'uploaded':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{status}</span>
        </span>
      );
    case 'inactive':
    case 'failed':
    case 'not uploaded':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-rose-50 text-rose-600 border border-rose-100">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>{status}</span>
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-600 border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>{status}</span>
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-cyan-50 text-cyan-600 border border-cyan-100">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          <span>{status}</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-50 text-slate-600 border border-slate-200">
          <span>{status || 'Unknown'}</span>
        </span>
      );
  }
}
