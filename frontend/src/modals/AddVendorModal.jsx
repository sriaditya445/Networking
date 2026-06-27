import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/common/Button';

export default function AddVendorModal({ isOpen, onClose, onSave, vendor = null }) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact: '',
    email: '',
    phone: '',
    status: 'Active',
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || '',
        code: vendor.code || '',
        contact: vendor.contact || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        status: vendor.status || 'Active',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        contact: '',
        email: '',
        phone: '',
        status: 'Active',
      });
    }
  }, [vendor, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      addToast("Name and Code are required.", "warning");
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">
            {vendor ? 'Edit Vendor Specs' : 'Add New Network Vendor'}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vendor Name</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cisco"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vendor Code</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. CSCO"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Person</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</label>
              <input
                type="email"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. contact@cisco.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +1 (408) 555-0100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vendor Status</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {vendor ? 'Update Vendor' : 'Add Vendor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
