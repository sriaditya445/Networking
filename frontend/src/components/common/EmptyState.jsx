import React from 'react';
import { FaInbox } from 'react-icons/fa';

/**
 * EmptyState placeholder component.
 * 
 * @param {string} message - Text describing that nothing is found
 * @param {React.ReactNode} icon - Optional custom icon
 */
export default function EmptyState({ message = "No data available", icon }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-150 rounded-2xl shadow-sm">
      <div className="w-14 h-14 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center text-xl mb-4 border border-slate-100">
        {icon || <FaInbox />}
      </div>
      <p className="text-sm font-semibold text-slate-700">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Get started by adding records or uploading new configuration files.</p>
    </div>
  );
}
