import React, { useState } from 'react';
import { FaPlus, FaBuilding } from 'react-icons/fa';

// Import Zustand stores
import { useVendorStore } from '../store/vendorStore';
import { useDeviceStore } from '../store/deviceStore';
import { useTemplateStore } from '../store/templateStore';

// Import reusable components
import PageHeader from './common/PageHeader';
import ReusableTable from './common/ReusableTable';
import StatusBadge from './common/StatusBadge';
import ActionButtons from './common/ActionButtons';

// Import modals
import AddVendorModal from './modals/AddVendorModal';

export default function VendorManagement() {
  const { vendors, addVendor, updateVendor, deleteVendor } = useVendorStore();
  const { devices, deleteDevice } = useDeviceStore();
  const { deleteTemplateByDevice } = useTemplateStore();

  const [editingVendor, setEditingVendor] = useState(null);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  // Handle Vendor Save (Add / Edit)
  const handleSaveVendor = (vendorData) => {
    if (editingVendor) {
      updateVendor(editingVendor.id, vendorData);
      setEditingVendor(null);
    } else {
      addVendor(vendorData);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Columns for Vendor Table
  const vendorColumns = [
    { key: 'name', label: 'Vendor Name', render: (val) => (
      <div className="flex items-center gap-2">
        <FaBuilding className="text-slate-450 text-xs shrink-0" />
        <span className="font-bold text-slate-800">{val}</span>
      </div>
    )},
    { key: 'code', label: 'Vendor Code', render: (val) => (
      <span className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
        {val}
      </span>
    )},
    { key: 'contact', label: 'Contact Person' },
    { key: 'email', label: 'Email', render: (val) => val ? <span className="text-xs text-slate-500">{val}</span> : 'N/A' },
    { key: 'phone', label: 'Phone', render: (val) => val ? <span className="text-xs text-slate-500">{val}</span> : 'N/A' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'createdAt', label: 'Created Date', render: (val) => <span className="text-xs text-slate-400">{formatDate(val)}</span> },
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_, row) => (
      <ActionButtons
        actions={[
          {
            type: 'edit',
            title: 'Edit Vendor Specifications',
            onClick: () => {
              setEditingVendor(row);
              setIsVendorModalOpen(true);
            },
          },
          {
            type: 'delete',
            title: 'Delete Vendor',
            onClick: () => {
              if (window.confirm(`Are you sure you want to delete vendor "${row.name}"? This will delete all associated devices and configuration templates.`)) {
                // Delete associated devices and their templates
                const associated = devices.filter(d => d.vendorId === row.id);
                associated.forEach(d => {
                  deleteDevice(d.id);
                  deleteTemplateByDevice(d.id);
                });
                deleteVendor(row.id);
              }
            },
          },
        ]}
      />
    )},
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader 
        title="Vendor Management" 
        subtitle="Catalog and maintain hardware vendors supplying routing, switching, and firewall assets."
      >
        <button
          onClick={() => {
            setEditingVendor(null);
            setIsVendorModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all animate-in fade-in duration-200"
        >
          <FaPlus />
          <span>Add Vendor</span>
        </button>
      </PageHeader>

      {/* Spacious Single Table Section */}
      <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FaBuilding className="text-cyan-500 text-xs" />
            <span>Hardware Vendor Directory</span>
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded font-bold">
            {vendors.length} Vendors
          </span>
        </div>

        <div className="overflow-hidden">
          <ReusableTable
            columns={vendorColumns}
            data={vendors}
            emptyMessage="No vendors cataloged. Click 'Add Vendor' above to register a new vendor."
          />
        </div>
      </div>

      {/* Add / Edit Vendor Modal */}
      <AddVendorModal
        isOpen={isVendorModalOpen}
        onClose={() => {
          setIsVendorModalOpen(false);
          setEditingVendor(null);
        }}
        onSave={handleSaveVendor}
        vendor={editingVendor}
      />
    </div>
  );
}
