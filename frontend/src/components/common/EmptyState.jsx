import React from 'react';
import { FaInbox } from 'react-icons/fa';

/**
 * Reusable EmptyState component.
 * 
 * @param {string} title - Main header message
 * @param {string} subtitle - Secondary descriptive prompt
 * @param {React.ReactNode} icon - Optional custom icon
 * @param {React.ReactNode} action - Optional action button or element
 */
export default function EmptyState({ 
  title = "No data available", 
  subtitle = "Get started by adding records or uploading new configuration files.", 
  icon,
  action
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-100 rounded-3xl shadow-sm max-w-lg mx-auto animate-fade-in my-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-2xl mb-4 border border-slate-100 shadow-inner">
        {icon || <FaInbox />}
      </div>
      <h3 className="font-bold text-slate-800 text-sm leading-snug">{title}</h3>
      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed px-4">{subtitle}</p>
      {action && (
        <div className="mt-5 w-full flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
