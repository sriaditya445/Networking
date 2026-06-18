import React from 'react';
import { FaEdit, FaTrash, FaEye, FaUpload, FaPlay } from 'react-icons/fa';

/**
 * Standard action buttons container.
 */
export default function ActionButtons({ actions = [] }) {
  return (
    <div className="flex items-center justify-end gap-2">
      {actions.map((act, idx) => {
        if (!act || act.show === false) return null;
        
        let icon;
        let colorClasses = '';
        
        switch (act.type) {
          case 'edit':
            icon = <FaEdit className="text-xs" />;
            colorClasses = 'bg-slate-100 hover:bg-slate-205 text-slate-700 border-slate-200';
            break;
          case 'delete':
            icon = <FaTrash className="text-xs" />;
            colorClasses = 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100';
            break;
          case 'view':
            icon = <FaEye className="text-xs" />;
            colorClasses = 'bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border-cyan-100';
            break;
          case 'upload':
            icon = <FaUpload className="text-xs" />;
            colorClasses = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100';
            break;
          case 'audit':
            icon = <FaPlay className="text-xs" />;
            colorClasses = 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-100';
            break;
          default:
            icon = act.icon;
            colorClasses = act.className || 'bg-slate-100 hover:bg-slate-200 text-slate-700';
        }

        return (
          <button
            key={act.type || idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (act.onClick) act.onClick();
            }}
            title={act.title || act.label}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-bold transition-all shadow-sm ${colorClasses}`}
          >
            {icon}
            {act.label && <span>{act.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
