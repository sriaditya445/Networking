import React, { useState, useEffect } from 'react';
import { FaPlus, FaHdd, FaBuilding, FaFilter, FaHistory, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

// Import Zustand stores
import { useVendorStore } from '../store/vendorStore';
import { useDeviceStore } from '../store/deviceStore';
import { useAuditStore } from '../store/auditStore';

// Import reusable components
import PageHeader from './common/PageHeader';
import ReusableTable from './common/ReusableTable';
import StatusBadge from './common/StatusBadge';
import ActionButtons from './common/ActionButtons';

// Import modals
import AddDeviceModal from './modals/AddDeviceModal';
import UploadTemplateModal from './modals/UploadTemplateModal';
import AuditSelectionModal from './modals/AuditSelectionModal';

export default function DeviceManagement() {
  const { vendors } = useVendorStore();
  const { devices, addDevice, updateDevice, deleteDevice } = useDeviceStore();
  const [templates, setTemplates] = useState([]);
  const { auditResults, selectedAuditType, setAuditType, runAudit } = useAuditStore();

  const fetchTemplates = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/templates");
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map(t => ({
          id: t.id,
          name: t.template_name,
          vendorName: t.vendor,
          vendorId: vendors.find(v => v.name.toLowerCase() === t.vendor.toLowerCase())?.id || 'v1',
          deviceType: t.device_type,
          modelNumber: t.model || '',
          templateType: t.template_type === 'jinja2' ? 'Paste' : 'Upload',
          version: t.version || '1.0.0',
          content: t.template_content || '',
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
        setTemplates(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch templates", e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const [selectedVendorFilter, setSelectedVendorFilter] = useState('');
  const [editingDevice, setEditingDevice] = useState(null);
  const [targetTemplateDevice, setTargetTemplateDevice] = useState(null);
  const [targetAuditDevice, setTargetAuditDevice] = useState(null);

  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Filter devices based on chosen vendor
  const filteredDevices = selectedVendorFilter
    ? devices.filter(d => d.vendorId === selectedVendorFilter)
    : devices;

  // Handle Save Device (Add / Edit)
  const handleSaveDevice = (deviceData) => {
    if (editingDevice) {
      updateDevice(editingDevice.id, deviceData);
      setEditingDevice(null);
    } else {
      addDevice(deviceData);
    }
  };

  // Handle Template Upload
  const handleUploadTemplate = async (templateData) => {
    if (targetTemplateDevice) {
      try {
        const formData = new FormData();
        const mapDeviceTypeToBackend = (type) => {
          const t = type.toLowerCase();
          if (t.includes('switch')) return 'switch';
          if (t.includes('router')) return 'router';
          if (t.includes('firewall')) return 'firewall';
          if (t.includes('wlc')) return 'wlc';
          return 'unknown';
        };

        formData.append('vendorId', targetTemplateDevice.vendorId);
        formData.append('vendorName', targetTemplateDevice.vendorName);
        formData.append('deviceType', targetTemplateDevice.deviceType);
        formData.append('modelNumber', targetTemplateDevice.modelNumber);
        formData.append('templateName', templateData.name);
        formData.append('version', templateData.version || '1.0.0');

        formData.append('vendor', targetTemplateDevice.vendorName);
        formData.append('device_type', mapDeviceTypeToBackend(targetTemplateDevice.deviceType));
        formData.append('model', targetTemplateDevice.modelNumber || '');
        formData.append('template_name', templateData.name);

        const blob = new Blob([templateData.fileContent], { type: 'text/plain' });
        formData.append('file', blob, templateData.fileName);

        const response = await fetch("http://localhost:8000/api/templates/upload", {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          alert("Template uploaded successfully!");
          await fetchTemplates();
        } else {
          const err = await response.json();
          alert(`Failed to upload template: ${err.detail || 'Unknown error'}`);
        }
      } catch (error) {
        console.error(error);
        alert("Error uploading template.");
      }

      // Auto trigger audit configuration immediately for single-screen flow guidance
      const dev = targetTemplateDevice;
      setTimeout(() => {
        setTargetAuditDevice(dev);
        setIsAuditModalOpen(true);
      }, 500);

      setTargetTemplateDevice(null);
    }
  };

  // Handle Audit Confirmation
  const handleConfirmAudit = async (auditType) => {
    if (targetAuditDevice) {
      setAuditType(auditType);

      const templateSummary = templates.find(t =>
        t.vendorName.toLowerCase() === targetAuditDevice.vendorName.toLowerCase() &&
        t.deviceType.toLowerCase() === targetAuditDevice.deviceType.toLowerCase() &&
        t.modelNumber.toLowerCase() === targetAuditDevice.modelNumber.toLowerCase()
      ) || null;

      let detailedTemplate = null;
      if (templateSummary) {
        try {
          const response = await fetch(`http://localhost:8000/api/templates/${templateSummary.id}`);
          if (response.ok) {
            const detailed = await response.json();
            detailedTemplate = {
              ...templateSummary,
              content: detailed.template_content || ''
            };
          }
        } catch (e) {
          console.error("Failed to fetch detailed template in handleConfirmAudit", e);
        }
      }

      runAudit(targetAuditDevice.id, targetAuditDevice.deviceName, auditType, detailedTemplate);
      setTargetAuditDevice(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Columns for Device Table
  const deviceColumns = [
    { key: 'deviceName', label: 'Device Name', render: (val) => (
      <div className="flex items-center gap-2">
        <FaHdd className="text-slate-400 text-xs shrink-0" />
        <span className="font-bold text-slate-800 truncate max-w-[130px]">{val}</span>
      </div>
    )},
    { key: 'vendorName', label: 'Vendor', render: (val) => (
      <div className="flex items-center gap-1.5">
        <FaBuilding className="text-slate-400 text-[10px]" />
        <span className="font-medium text-slate-700">{val}</span>
      </div>
    )},
    { key: 'deviceType', label: 'Device Type', render: (val) => (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
        val.includes('Switch') ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' :
        val === 'Router' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
        val === 'Firewall' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
        val === 'Access Point' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
        'bg-slate-100 text-slate-650 border border-slate-150'
      }`}>
        {val}
      </span>
    )},
    { key: 'modelNumber', label: 'Model' },
    { key: 'template', label: 'Golden Template', render: (_, row) => {
      const template = templates.find(t =>
        t.vendorName.toLowerCase() === row.vendorName.toLowerCase() &&
        t.deviceType.toLowerCase() === row.deviceType.toLowerCase() &&
        t.modelNumber.toLowerCase() === row.modelNumber.toLowerCase()
      );
      if (template) {
        return (
          <div className="flex flex-col gap-0.5 max-w-[130px]">
            <span className="text-xs font-bold text-slate-700 truncate" title={template.name}>{template.name}</span>
            <span className="text-[9px] text-slate-400 font-mono">v{template.version} • {new Date(template.createdAt || Date.now()).toLocaleDateString()}</span>
          </div>
        );
      }
      return <StatusBadge status="Not Uploaded" />;
    }},
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_, row) => {
      const template = templates.find(t =>
        t.vendorName.toLowerCase() === row.vendorName.toLowerCase() &&
        t.deviceType.toLowerCase() === row.deviceType.toLowerCase() &&
        t.modelNumber.toLowerCase() === row.modelNumber.toLowerCase()
      );
      return (
        <ActionButtons
          actions={[
            {
              type: 'upload',
              title: 'Upload Golden Template',
              label: template ? 'Update Template' : 'Upload Template',
              onClick: () => {
                setTargetTemplateDevice(row);
                setIsTemplateModalOpen(true);
              }
            },
            {
              type: 'audit',
              title: 'Run Config Audit',
              label: 'Audit',
              show: !!template, // Only show audit button if template is uploaded
              onClick: () => {
                setTargetAuditDevice(row);
                setIsAuditModalOpen(true);
              }
            },
            {
              type: 'edit',
              title: 'Edit Device Details',
              onClick: () => {
                setEditingDevice(row);
                setIsDeviceModalOpen(true);
              }
            },
            {
              type: 'delete',
              title: 'Delete Device',
              onClick: () => {
                if (window.confirm(`Are you sure you want to delete device "${row.deviceName}"?`)) {
                  deleteDevice(row.id);
                }
              }
            }
          ]}
        />
      );
    }}
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Device Management" 
        subtitle="View and manage all network devices, bind golden configuration files, and execute targeted audits."
      >
        <button
          onClick={() => {
            setEditingDevice(null);
            setIsDeviceModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <FaPlus />
          <span>Add Device</span>
        </button>
      </PageHeader>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Device List Column (8 Cols) */}
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* Filter controls */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FaFilter className="text-slate-400 text-xs" />
                <span className="text-xs font-bold text-slate-500">Filter by Vendor:</span>
                <select
                  value={selectedVendorFilter}
                  onChange={(e) => setSelectedVendorFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded font-bold">
                {filteredDevices.length} Devices
              </span>
            </div>

            {/* ReusableTable of Devices */}
            <div className="overflow-hidden">
              <ReusableTable
                columns={deviceColumns}
                data={filteredDevices}
                emptyMessage="No devices match the criteria. Click 'Add Device' to create one."
              />
            </div>

          </div>
        </div>

        {/* Audit Queue History Column (4 Cols) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FaHistory className="text-slate-450 text-xs" />
                <span>Audit Execution Logs</span>
              </h3>
              {auditResults.length > 0 && (
                <button 
                  onClick={() => {
                    if (window.confirm("Clear all audit run logs?")) {
                      useAuditStore.getState().clearAuditHistory();
                    }
                  }}
                  className="text-[10px] text-rose-500 font-semibold hover:underline"
                >
                  Clear Logs
                </button>
              )}
            </div>

            {auditResults.length === 0 ? (
              <div className="text-center py-8 text-slate-450 text-xs italic">
                No active or historic audits triggered.
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {auditResults.map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-700 truncate">{audit.deviceName}</span>
                        <span className="text-[9px] bg-slate-200/60 text-slate-500 font-bold px-1.5 py-0.5 rounded font-mono uppercase shrink-0">
                          {audit.auditType.split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{formatDate(audit.runDate)}</span>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {audit.status === 'Processing' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-full">
                          <FaSpinner className="animate-spin text-[9px]" />
                          <span>Auditing...</span>
                        </span>
                      ) : audit.status === 'Success' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          <FaCheckCircle className="text-[9px]" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                          <FaTimesCircle className="text-[9px]" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Add / Edit Device Modal */}
      <AddDeviceModal
        isOpen={isDeviceModalOpen}
        onClose={() => {
          setIsDeviceModalOpen(false);
          setEditingDevice(null);
        }}
        onSave={handleSaveDevice}
        vendors={vendors}
        device={editingDevice}
      />

      {/* Upload Golden Template Modal */}
      <UploadTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          setTargetTemplateDevice(null);
        }}
        onUpload={handleUploadTemplate}
        deviceName={targetTemplateDevice?.deviceName || ''}
      />

      {/* Audit Configuration / Selection Modal */}
      <AuditSelectionModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setTargetAuditDevice(null);
        }}
        onSelect={handleConfirmAudit}
        initialSelection={selectedAuditType}
        deviceName={targetAuditDevice?.deviceName || ''}
      />
    </div>
  );
}
