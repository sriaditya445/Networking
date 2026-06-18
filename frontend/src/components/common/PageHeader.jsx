import React from 'react';

/**
 * PageHeader component for standard tab headers.
 * 
 * @param {string} title - Page or section title
 * @param {string} subtitle - Explanatory text below the title
 * @param {React.ReactNode} children - Optional components to render on the right (e.g. action buttons)
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-100 pb-5 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </div>
  );
}
