import React, { useState, useEffect } from 'react';
import { FaPlay, FaEye, FaFilter, FaCheckCircle, FaTimesCircle, FaSpinner, FaHistory, FaBuilding, FaHdd, FaFileSignature } from 'react-icons/fa';

import { useModal } from '../contexts/ModalContext';

// Import stores
import { useVendorStore } from '../store/vendorStore';
import { useDeviceStore } from '../store/deviceStore';
import { useAuditStore } from '../store/auditStore';

// Import reusable components
import PageHeader from '../components/common/PageHeader';
import ReusableTable from '../components/common/ReusableTable';
import StatusBadge from '../components/common/StatusBadge';

export default function AuditDashboard({ devices: stagedDevices = [] }) {
  const { showConfirm } = useModal();
  const { vendors } = useVendorStore();
  const { devices: manualDevices } = useDeviceStore();
  const [templates, setTemplates] = useState([]);
  const { auditResults, runAudit, clearAuditHistory } = useAuditStore();

  useEffect(() => {
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
      } catch (error) {
        console.error("Failed to fetch templates in AuditDashboard", error);
      }
    };
    fetchTemplates();
  }, [vendors]);

  // Top Section Filters State
  const [vendorFilter, setVendorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState('Full Audit');

  // Selected audit for diff viewer drawer
  const [selectedAuditForDiff, setSelectedAuditForDiff] = useState(null);

  // Normalize and combine both uploaded staged devices and manually registered devices
  const allDevices = React.useMemo(() => {
    const stagedMapped = stagedDevices.map(d => ({
      id: d._id || d.id,
      hostname: d.device_name || d.hostname || 'staged-device',
      vendorName: d.vendor || 'Cisco',
      deviceType: d.device_type || 'L2 Switch',
      modelNumber: d.model_number || 'Unknown',
      isStaged: true,
      rawConfig: d.config_content || `hostname ${d.device_name || 'staged-device'}\nip domain-name staged.net\nntp server 10.0.0.1\nsnmp-server community read`
    }));

    const manualMapped = manualDevices.map(d => ({
      id: d.id,
      hostname: d.deviceName,
      vendorName: d.vendorName,
      deviceType: d.deviceType,
      modelNumber: d.modelNumber,
      isStaged: false,
      rawConfig: `hostname ${d.deviceName}\nip domain-name manual.net\nntp server 192.168.1.1\nsnmp-server community public`
    }));

    return [...stagedMapped, ...manualMapped];
  }, [stagedDevices, manualDevices]);

  // Apply filters
  const filteredDevices = React.useMemo(() => {
    return allDevices.filter(d => {
      const matchVendor = vendorFilter ? d.vendorName.toLowerCase() === vendorFilter.toLowerCase() : true;
      const matchType = typeFilter ? d.deviceType.toLowerCase() === typeFilter.toLowerCase() : true;
      const matchModel = modelFilter ? d.modelNumber.toLowerCase().includes(modelFilter.toLowerCase()) : true;
      return matchVendor && matchType && matchModel;
    });
  }, [allDevices, vendorFilter, typeFilter, modelFilter]);

  // Auto-match Template for each device
  const getMatchedTemplate = (device) => {
    return templates.find(t => 
      t.vendorName.toLowerCase() === device.vendorName.toLowerCase() &&
      t.deviceType.toLowerCase() === device.deviceType.toLowerCase() &&
      t.modelNumber.toLowerCase() === device.modelNumber.toLowerCase()
    ) || null;
  };

  const getLatestAudit = (deviceId) => {
    return auditResults.find(r => r.deviceId === deviceId) || null;
  };

  // Run audit for a single device
  const handleRunSingle = async (device) => {
    const templateSummary = getMatchedTemplate(device);
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
        console.error("Failed to fetch detailed template for audit", e);
      }
    }
    runAudit(device.id, device.hostname, auditTypeFilter, detailedTemplate);
  };

  // Run audit for all filtered devices
  const handleRunAll = async () => {
    for (const device of filteredDevices) {
      const latest = getLatestAudit(device.id);
      if (!latest || latest.status !== 'Processing') {
        await handleRunSingle(device);
      }
    }
  };

  // Calculate bottom summary statistics
  const summaryStats = React.useMemo(() => {
    let total = filteredDevices.length;
    let success = 0;
    let failed = 0;
    let pending = 0;

    filteredDevices.forEach(d => {
      const latest = getLatestAudit(d.id);
      const status = latest ? latest.status : 'Pending';

      if (status === 'Success') success++;
      else if (status === 'Failed') failed++;
      else pending++;
    });

    const compliance = total > 0 ? Math.round((success / total) * 100) : 100;

    return { total, success, failed, pending, compliance };
  }, [filteredDevices, auditResults]);

  // Columns for main table
  const tableColumns = [
    { key: 'hostname', label: 'Hostname', render: (val) => (
      <div className="flex items-center gap-2">
        <FaHdd className="text-slate-400 text-xs shrink-0" />
        <span className="font-bold text-slate-800">{val}</span>
      </div>
    )},
    { key: 'vendorName', label: 'Vendor', render: (val) => (
      <div className="flex items-center gap-1.5">
        <FaBuilding className="text-slate-450 text-[10px]" />
        <span className="font-semibold text-slate-700">{val}</span>
      </div>
    )},
    { key: 'deviceType', label: 'Type', render: (val) => (
      <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
        {val}
      </span>
    )},
    { key: 'modelNumber', label: 'Model', render: (val) => <span className="font-mono text-xs font-medium text-slate-500">{val}</span> },
    { key: 'template', label: 'Matched Template', render: (_, row) => {
      const template = getMatchedTemplate(row);
      return template ? (
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <FaFileSignature className="text-cyan-500 text-[10px]" />
          <span>{template.name}</span>
        </span>
      ) : (
        <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded font-medium">
          No Match
        </span>
      );
    }},
    { key: 'auditType', label: 'Audit Type', render: (_, row) => {
      const latest = getLatestAudit(row.id);
      return (
        <span className="text-xs text-slate-500 font-medium">
          {latest ? latest.auditType : auditTypeFilter}
        </span>
      );
    }},
    { key: 'status', label: 'Audit Status', render: (_, row) => {
      const latest = getLatestAudit(row.id);
      const status = latest ? latest.status : 'Pending';
      return <StatusBadge status={status} />;
    }},
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_, row) => {
      const latest = getLatestAudit(row.id);
      const status = latest ? latest.status : 'Pending';

      return (
        <div className="flex items-center justify-end gap-2">
          {status === 'Processing' ? (
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
              <FaSpinner className="animate-spin text-cyan-500" />
              <span>Running</span>
            </span>
          ) : (
            <button
              onClick={() => handleRunSingle(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-700 rounded-lg text-xs font-bold transition-all shadow-sm"
              title="Run Config Audit"
            >
              <FaPlay className="text-[9px]" />
              <span>Run</span>
            </button>
          )}

          {latest && (status === 'Success' || status === 'Failed') && (
            <button
              onClick={() => setSelectedAuditForDiff(latest)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-105 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm"
              title="View Template Comparison Diff"
            >
              <FaEye className="text-[9px]" />
              <span>Compare</span>
            </button>
          )}
        </div>
      );
    }}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <PageHeader 
        title="Audit Command Dashboard" 
        subtitle="Single-screen audit command console. Filter network assets, map templates, run validations, and review policy diffs."
      >
        <div className="flex gap-2">
          {auditResults.length > 0 && (
            <button
              onClick={async () => {
                const confirmed = await showConfirm({
                  title: "Clear Audit Logs",
                  description: "Are you sure you want to clear all historic audit command execution records?",
                  type: "danger"
                });
                if (confirmed) {
                  clearAuditHistory();
                }
              }}
              className="px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Clear Logs
            </button>
          )}
          <button
            onClick={handleRunAll}
            disabled={filteredDevices.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPlay className="text-[10px]" />
            <span>Audit All Matches</span>
          </button>
        </div>
      </PageHeader>

      {/* TOP SECTION: Filters Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FaFilter className="text-cyan-500 text-[10px]" />
          <span>Auditing Command Filters</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Vendor Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vendor</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
            >
              <option value="">All Vendors</option>
              {vendors.map(v => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Device Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Device Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
            >
              <option value="">All Types</option>
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

          {/* Model Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model Search</label>
            <input
              type="text"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-850 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="e.g. WS-C3650"
            />
          </div>

          {/* Audit Type Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Audit Policy Profile</label>
            <select
              value={auditTypeFilter}
              onChange={(e) => setAuditTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
            >
              <option value="Full Audit">Full Audit</option>
              <option value="Security Audit">Security Audit</option>
              <option value="Performance Audit">Performance Audit</option>
              <option value="Compliance Audit">Compliance Audit</option>
              <option value="Configuration Audit">Configuration Audit</option>
            </select>
          </div>

        </div>
      </div>

      {/* MIDDLE SECTION: Detected Devices Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm">Target Auditing Devices</h3>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded font-bold">
            {filteredDevices.length} Match{filteredDevices.length !== 1 && 'es'}
          </span>
        </div>

        <div className="overflow-hidden">
          <ReusableTable
            columns={tableColumns}
            data={filteredDevices}
            emptyMessage="No detected devices match current filters."
          />
        </div>
      </div>

      {/* BOTTOM SECTION: Audit Summary Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Live Auditing Compliance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Total Monitored</span>
            <span className="text-2xl font-extrabold text-slate-800">{summaryStats.total}</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center space-y-1">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide block">Passing (Success)</span>
            <span className="text-2xl font-extrabold text-emerald-700">{summaryStats.success}</span>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center space-y-1">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide block">Failing (Failed)</span>
            <span className="text-2xl font-extrabold text-rose-700">{summaryStats.failed}</span>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center space-y-1">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide block">Pending/Queued</span>
            <span className="text-2xl font-extrabold text-amber-700">{summaryStats.pending}</span>
          </div>

          <div className="col-span-2 md:col-span-1 bg-cyan-50 border border-cyan-100 rounded-2xl p-4 text-center space-y-1 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wide block">Compliance %</span>
            <span className="text-2xl font-extrabold text-cyan-700">{summaryStats.compliance}%</span>
          </div>

        </div>
      </div>

      {/* COMPONENT COMPARISON DIFF DRAWER / MODAL */}
      {selectedAuditForDiff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl border border-slate-150 overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <span>Configuration Comparison Diff</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    selectedAuditForDiff.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-150' : 'bg-rose-50 text-rose-600 border border-rose-150'
                  }`}>
                    {selectedAuditForDiff.status}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Device: <span className="font-semibold text-slate-600">{selectedAuditForDiff.deviceName}</span> • Template: <span className="font-semibold text-slate-600">{selectedAuditForDiff.templateName}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedAuditForDiff(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Diff content view */}
            <div className="p-6 space-y-3">
              <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Comparison Line Diff</label>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                  <span className="w-12 text-center">Line</span>
                  <span className="flex-1 pl-4">Configuration Syntax</span>
                </div>
                
                <div className="bg-slate-900 text-slate-100 font-mono text-xs overflow-y-auto max-h-[350px] divide-y divide-slate-800">
                  {selectedAuditForDiff.diffResult && selectedAuditForDiff.diffResult.length > 0 ? (
                    selectedAuditForDiff.diffResult.map((diffLine, idx) => {
                      let bgClass = 'bg-slate-900 text-slate-300';
                      let prefix = ' ';
                      
                      if (diffLine.type === 'added') {
                        bgClass = 'bg-emerald-950/80 text-emerald-350 font-bold';
                        prefix = '+';
                      } else if (diffLine.type === 'removed') {
                        bgClass = 'bg-rose-950/80 text-rose-350 font-bold';
                        prefix = '-';
                      } else if (diffLine.type === 'error') {
                        bgClass = 'bg-rose-950/90 text-rose-300 font-bold p-3';
                        prefix = '!';
                      }

                      return (
                        <div key={idx} className={`flex py-1 px-4 ${bgClass}`}>
                          <span className="w-12 text-center text-slate-500 border-r border-slate-800/60 shrink-0 select-none">
                            {diffLine.line || idx + 1}
                          </span>
                          <span className="flex-1 pl-4 whitespace-pre-wrap select-text">
                            {prefix} {diffLine.text}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-slate-500 italic">No comparison diff results generated.</div>
                  )}
                </div>
              </div>

              {selectedAuditForDiff.status === 'Failed' && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <FaTimesCircle className="shrink-0" />
                  <span>Config Policy Violation: The active configuration does not match the parameters of the golden template.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setSelectedAuditForDiff(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                Close Comparison
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
