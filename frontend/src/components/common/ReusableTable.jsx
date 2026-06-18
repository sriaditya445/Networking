import React from 'react';
import EmptyState from './EmptyState';

/**
 * ReusableTable - A generic data table component with tailwind styling
 * 
 * @param {Array} columns - Array of column definitions: { key, label, render: (val, row) => ReactNode, className }
 * @param {Array} data - List of row data
 * @param {string} emptyMessage - Custom message if no data exists
 * @param {React.ReactNode} emptyIcon - Custom icon if no data exists
 */
export default function ReusableTable({ columns = [], data = [], emptyMessage = "No records found", emptyIcon }) {
  if (data.length === 0) {
    return <EmptyState message={emptyMessage} icon={emptyIcon} />;
  }

  return (
    <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold text-xs uppercase font-mono tracking-wider">
            {columns.map((col, idx) => (
              <th key={col.key || idx} className={`px-6 py-4 ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {data.map((row, rowIdx) => (
            <tr 
              key={row.id || row._id || rowIdx} 
              className="hover:bg-slate-50/40 transition-colors text-slate-700 font-medium"
            >
              {columns.map((col, colIdx) => {
                const cellValue = row[col.key];
                return (
                  <td key={col.key || colIdx} className={`px-6 py-4 whitespace-nowrap ${col.className || ''}`}>
                    {col.render ? col.render(cellValue, row) : (cellValue ?? 'N/A')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
