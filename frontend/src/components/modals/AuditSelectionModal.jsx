import React, { useState } from 'react';

const AUDIT_OPTIONS = [
  { id: 'Full Audit', label: 'Full Audit', desc: 'Comprehensive scan of all configurations, routing protocols, and device states.' },
  { id: 'Security Audit', label: 'Security Audit', desc: 'Validates port security, firewall ACLs, AAA credentials, and encryption.' },
  { id: 'Performance Audit', label: 'Performance Audit', desc: 'Checks bandwidth allocation, interface traffic stats, and load-balancing settings.' },
  { id: 'Compliance Audit', label: 'Compliance Audit', desc: 'Ensures standards alignment with CIS benchmarks and enterprise baselines.' },
  { id: 'Configuration Audit', label: 'Configuration Audit', desc: 'Compares active configurations against the device golden template.' },
  { id: 'Custom Audit', label: 'Custom Audit', desc: 'Runs customizable verification rules based on specific network mandates.' }
];

export default function AuditSelectionModal({ isOpen, onClose, onSelect, initialSelection = 'Full Audit', deviceName }) {
  const [selected, setSelected] = useState(initialSelection);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSelect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-150 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-800 text-base">
              Configure Audit Type
            </h3>
            {deviceName && (
              <p className="text-[10px] text-slate-400 font-medium">Device: <span className="font-semibold text-slate-650">{deviceName}</span></p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {AUDIT_OPTIONS.map((opt) => {
              const isChecked = selected === opt.id;
              return (
                <label 
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                    isChecked 
                      ? 'border-cyan-500 bg-cyan-50/20 shadow-[0_0_12px_rgba(6,182,212,0.08)]' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="auditType"
                    value={opt.id}
                    checked={isChecked}
                    onChange={() => setSelected(opt.id)}
                    className="mt-1 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800">{opt.label}</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{opt.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
            >
              Confirm Audit Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
