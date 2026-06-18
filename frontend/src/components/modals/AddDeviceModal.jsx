import React, { useState, useEffect } from 'react';

export default function AddDeviceModal({ isOpen, onClose, onSave, vendors = [], device = null, defaultVendorId = '' }) {
  const [formData, setFormData] = useState({
    vendorId: '',
    deviceName: '',
    deviceType: 'L2 Switch',
    modelNumber: '',
    description: '',
    status: 'Active',
  });

  useEffect(() => {
    if (device) {
      setFormData({
        vendorId: device.vendorId || '',
        deviceName: device.deviceName || '',
        deviceType: device.deviceType || 'L2 Switch',
        modelNumber: device.modelNumber || '',
        description: device.description || '',
        status: device.status || 'Active',
      });
    } else {
      setFormData({
        vendorId: defaultVendorId || (vendors[0]?.id || ''),
        deviceName: '',
        deviceType: 'L2 Switch',
        modelNumber: '',
        description: '',
        status: 'Active',
      });
    }
  }, [device, isOpen, defaultVendorId, vendors]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.deviceName || !formData.vendorId) {
      alert("Device Name and Vendor are required.");
      return;
    }
    
    // Find the vendor name
    const selectedVendor = vendors.find(v => v.id === formData.vendorId);
    const vendorName = selectedVendor ? selectedVendor.name : 'Unknown';

    onSave({
      ...formData,
      vendorName
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-150 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base">
            {device ? 'Edit Device Details' : 'Add New Network Device'}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Vendor</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-850 focus:outline-none focus:border-cyan-500 cursor-pointer"
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              required
              disabled={!!defaultVendorId}
            >
              <option value="">Select Vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Device Name / Hostname</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                value={formData.deviceName}
                onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                placeholder="e.g. branch-sw-01"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Model Number</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                placeholder="e.g. WS-C3650-24TD-S"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Device Type</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-850 focus:outline-none focus:border-cyan-500 cursor-pointer"
                value={formData.deviceType}
                onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
              >
                <option value="L2 Switch">L2 Switch</option>
                <option value="L3 Switch">L3 Switch</option>
                <option value="Core Switch">Core Switch</option>
                <option value="Router">Router</option>
                <option value="Firewall">Firewall</option>
                <option value="Access Point">Access Point</option>
                <option value="WLC">WLC</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Status</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-850 focus:outline-none focus:border-cyan-500 cursor-pointer"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Description</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors h-20 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide a short description of the device deployment location or role..."
            />
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
              {device ? 'Update Device' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
