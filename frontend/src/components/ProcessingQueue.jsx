import React, { useState, useEffect, useRef } from 'react';
import {
  FaTrash,
  FaDownload,
  FaSpinner,
  FaExclamationCircle,
  FaFilter,
  FaCheckCircle,
  FaFilePdf,
  FaPlay,
  FaInfoCircle,
  FaFileAlt,
  FaBuilding,
  FaServer,
  FaShieldAlt,
  FaCloudUploadAlt
} from 'react-icons/fa';

function ProcessingQueue({
  jobs,
  handleDeleteJob,
  formatDate,
  renderStatusBadge,
  apiBaseUrl,
  setActiveTab,
  selectedUploadId,
  setSelectedUploadId,
  setOnTemplateUploadSuccess
}) {
  // Page states
  const [templates, setTemplates] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState('full');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Maps to track states per device
  const [auditStatusMap, setAuditStatusMap] = useState({});
  const [reportStatusMap, setReportStatusMap] = useState({});
  const [downloadStatusMap, setDownloadStatusMap] = useState({});

  const [loadingDevices, setLoadingDevices] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  const pollIntervalRef = useRef(null);

  // Map device type to backend format
  const mapDeviceTypeToBackend = (type) => {
    if (!type) return 'unknown';
    const t = type.toLowerCase();
    if (t.includes('switch')) return 'switch';
    if (t.includes('router')) return 'router';
    if (t.includes('firewall')) return 'firewall';
    if (t.includes('wlc')) return 'wlc';
    return 'unknown';
  };

  // Find job details
  const selectedJob = jobs.find(j => (j._id || j.id) === selectedUploadId) || null;

  // 1. Fetch Golden Templates on mount
  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);

      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 2. Fetch Devices & Reports when selected job changes
  const fetchDevicesAndReports = async (uploadId) => {
    if (!uploadId) {
      setDevices([]);
      return;
    }
    setLoadingDevices(true);
    try {
      // Fetch devices for the selected upload
      const devRes = await fetch(`${apiBaseUrl}/api/devices?upload_id=${uploadId}`);
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(devData);

        // Fetch reports to populate status maps
        const repRes = await fetch(`${apiBaseUrl}/api/audit/reports`);
        if (repRes.ok) {
          const repData = await repRes.json();

          const auditStatuses = {};
          const reportDetails = {};
          const downloadStatuses = {};

          devData.forEach(device => {
            const devId = device._id || device.id;

            // Match reports for this device
            const deviceReport = repData.find(r => r.device_id === devId);

            if (deviceReport) {
              auditStatuses[devId] = 'Completed';
              reportDetails[devId] = {
                status: 'Generated',
                id: deviceReport._id || deviceReport.id,
                templateName: deviceReport.template_name || 'Golden Template',
                auditMode: deviceReport.audit_mode,
                createdAt: deviceReport.created_at
              };
              // Default to Download Pending when report is available
              downloadStatuses[devId] = downloadStatusMap[devId] || 'Download Pending';
            } else if (device.display_status === 'AUDIT_IN_PROGRESS') {
              auditStatuses[devId] = 'Running';
              reportDetails[devId] = 'Pending';
              downloadStatuses[devId] = 'Pending';
            } else {
              auditStatuses[devId] = 'Pending';
              reportDetails[devId] = 'Pending';
              downloadStatuses[devId] = 'Pending';
            }
          });

          setAuditStatusMap(auditStatuses);
          setReportStatusMap(reportDetails);
          setDownloadStatusMap(prev => ({ ...downloadStatuses, ...prev }));
        }
      }
    } catch (err) {
      console.error("Error loading devices & reports:", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchDevicesAndReports(selectedUploadId);
    setCurrentPage(1);
  }, [selectedUploadId]);

  // Polling helper during audit runs
  const startPolling = (uploadId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setPollingActive(true);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const devRes = await fetch(`${apiBaseUrl}/api/devices?upload_id=${uploadId}`);
        const repRes = await fetch(`${apiBaseUrl}/api/audit/reports`);

        if (devRes.ok && repRes.ok) {
          const devData = await devRes.json();
          const repData = await repRes.json();

          let allFinished = true;
          const auditStatuses = {};
          const reportDetails = {};
          const downloadStatuses = {};

          devData.forEach(device => {
            const devId = device._id || device.id;
            const deviceReport = repData.find(r => r.device_id === devId);

            if (deviceReport) {
              auditStatuses[devId] = 'Completed';
              reportDetails[devId] = {
                status: 'Generated',
                id: deviceReport._id || deviceReport.id,
                templateName: deviceReport.template_name || 'Golden Template',
                auditMode: deviceReport.audit_mode,
                createdAt: deviceReport.created_at
              };
              downloadStatuses[devId] = downloadStatusMap[devId] === 'Downloaded' ? 'Downloaded' : 'Download Pending';
            } else if (device.display_status === 'AUDIT_IN_PROGRESS' || device.display_status === 'DEVICE_ANALYSIS_IN_PROGRESS') {
              auditStatuses[devId] = 'Running';
              reportDetails[devId] = 'Pending';
              downloadStatuses[devId] = 'Pending';
              allFinished = false;
            } else {
              auditStatuses[devId] = 'Pending';
              reportDetails[devId] = 'Pending';
              downloadStatuses[devId] = 'Pending';
            }
          });

          setAuditStatusMap(auditStatuses);
          setReportStatusMap(reportDetails);
          setDownloadStatusMap(prev => ({ ...downloadStatuses, ...prev }));
          setDevices(devData);

          if (allFinished) {
            clearInterval(pollIntervalRef.current);
            setPollingActive(false);
            setRunningAudit(false);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Check template existence locally
  const findMatchedTemplate = (device) => {
    if (!device) return null;
    const devType = mapDeviceTypeToBackend(device.device_type);
    return templates.find(t =>
      t.vendor?.toLowerCase() === device.vendor?.toLowerCase() &&
      t.device_type?.toLowerCase() === devType.toLowerCase() &&
      (t.model || '').toLowerCase() === (device.model || '').toLowerCase()
    );
  };

  // Sync selectedTemplateId with selectedDevice template_id or auto-match
  useEffect(() => {
    if (selectedDevice) {
      const devTemplateId = selectedDevice.template_id;
      if (devTemplateId) {
        setSelectedTemplateId(devTemplateId);
      } else {
        const matched = findMatchedTemplate(selectedDevice);
        setSelectedTemplateId(matched ? (matched._id || matched.id) : '');
      }
    } else {
      setSelectedTemplateId('');
    }
  }, [selectedDevice, templates]);

  const handleTemplateChange = async (templateId) => {
    setSelectedTemplateId(templateId);
    if (selectedDevice && selectedUploadId) {
      const devId = selectedDevice._id || selectedDevice.id;
      try {
        const res = await fetch(`${apiBaseUrl}/api/devices/${devId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template_id: templateId || null })
        });
        if (res.ok) {
          const updatedDevice = await res.json();
          setSelectedDevice(updatedDevice);
          fetchDevicesAndReports(selectedUploadId);
        } else {
          console.error("Failed to update device template ID on the backend");
        }
      } catch (err) {
        console.error("Error updating device template ID:", err);
      }
    }
  };

  // Redirection to upload template
  const handleUploadTemplateClick = (device) => {
    if (setOnTemplateUploadSuccess) {
      setOnTemplateUploadSuccess(() => () => {
        setActiveTab('queue');
      });
    }
    if (setSelectedUploadId) {
      setSelectedUploadId(device.upload_id);
    }
    setActiveTab('template_management');
  };

  // Generate audit handler
  const handleGenerateAudit = async () => {
    if (!selectedUploadId || !selectedDevice) return;

    setRunningAudit(true);

    // Set selected device to running state instantly
    const devId = selectedDevice._id || selectedDevice.id;
    setAuditStatusMap(prev => ({ ...prev, [devId]: 'Running' }));

    try {
      // 1. Get all audit options for this upload
      const optionsRes = await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}/audit-options`);
      if (!optionsRes.ok) {
        throw new Error("Failed to get audit options");
      }
      const optionsData = await optionsRes.json();

      // 2. Build audit selection requests for all groups that have a template
      const selections = [];
      optionsData.groups.forEach(group => {
        const matchedTemp = templates.find(t =>
          t.vendor?.toLowerCase() === group.vendor?.toLowerCase() &&
          t.device_type?.toLowerCase() === mapDeviceTypeToBackend(group.device_type).toLowerCase() &&
          (t.model || '').toLowerCase() === (group.model || '').toLowerCase()
        );
        const tId = group.template_id || matchedTemp?.id || matchedTemp?._id;

        if (tId) {
          selections.push({
            vendor: group.vendor,
            device_type: mapDeviceTypeToBackend(group.device_type),
            model: group.model || null,
            template_id: tId,
            audit_mode: selectedReportType,
            selected_sections: []
          });
        }
      });

      if (selections.length === 0) {
        alert("No templates available for any device in this upload batch. Please upload templates first.");
        setRunningAudit(false);
        return;
      }

      // 3. Save selections & trigger audit execution
      const saveRes = await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}/audit-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections })
      });

      if (saveRes.ok) {
        // Start polling to detect completion
        startPolling(selectedUploadId);
      } else {
        const err = await saveRes.json();
        alert(`Failed to save selections: ${err.detail || 'Unknown Error'}`);
        setRunningAudit(false);
      }
    } catch (err) {
      console.error("Error generating audit:", err);
      alert("Error starting audit execution loop.");
      setRunningAudit(false);
    }
  };

  // Download PDF report handler
  const handleDownloadPDF = async (device, reportId) => {
    const devId = device._id || device.id;
    setDownloadStatusMap(prev => ({ ...prev, [devId]: 'Download Pending' }));

    try {
      const res = await fetch(`${apiBaseUrl}/api/audit/reports/${reportId}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${device.device_name}_audit_report.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        setDownloadStatusMap(prev => ({ ...prev, [devId]: 'Downloaded' }));
      } else {
        alert("Failed to export PDF report from backend.");
        setDownloadStatusMap(prev => ({ ...prev, [devId]: 'Download Pending' }));
      }
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Error downloading PDF report.");
      setDownloadStatusMap(prev => ({ ...prev, [devId]: 'Download Pending' }));
    }
  };

  // Matched template for top display
  const topMatchedTemplate = selectedDevice ? findMatchedTemplate(selectedDevice) : null;

  const itemsPerPage = 10;
  const indexOfLastDevice = currentPage * itemsPerPage;
  const indexOfFirstDevice = indexOfLastDevice - itemsPerPage;
  const paginatedDevices = devices.slice(indexOfFirstDevice, indexOfLastDevice);
  const totalPages = Math.ceil(devices.length / itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Top Banner / Heading */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FaShieldAlt className="text-cyan-400" />
            <span>Audit Workflow Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Designate golden policies, process parsed configurations, and generate high-fidelity PDF compliance matrices.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700/60 font-mono text-[10px] text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Engine Online</span>
        </div>
      </div>

      {/* Grid: Left - Top Configuration Center, Right - Folder Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Main Workflow Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
            <span>Audit Configuration Panel</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Selected Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Selected Batch / Folder</label>
              <select
                className="w-full bg-white border border-slate-205 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer font-semibold shadow-sm"
                value={selectedUploadId || ''}
                onChange={(e) => {
                  setSelectedUploadId(e.target.value || null);
                  setSelectedDevice(null);
                }}
              >
                <option value="">Select a batch...</option>
                {jobs.map((job) => (
                  <option key={job._id || job.id} value={job._id || job.id}>
                    {job.folder_name} ({job.total_devices || 0} files)
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Selected Device */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Selected Device</label>
              <select
                className="w-full bg-white border border-slate-205 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer font-semibold shadow-sm"
                value={selectedDevice ? (selectedDevice._id || selectedDevice.id) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const dev = devices.find(d => (d._id || d.id) === val);
                  setSelectedDevice(dev || null);
                }}
                disabled={!selectedUploadId}
              >
                <option value="">Select a device...</option>
                {devices.map((device) => (
                  <option key={device._id || device.id} value={device._id || device.id}>
                    {device.device_name || 'Unknown'} ({device.device_type || 'N/A'} - {device.vendor || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Golden Template */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Golden Template</label>
              <select
                className="w-full bg-white border border-slate-205 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer font-semibold shadow-sm"
                value={selectedTemplateId || ''}
                onChange={(e) => handleTemplateChange(e.target.value)}
                disabled={!selectedDevice}
              >
                <option value="">Select a template...</option>
                {templates.map((temp) => (
                  <option key={temp._id || temp.id} value={temp._id || temp.id}>
                    {temp.template_name || temp.name} ({temp.vendor} - {temp.device_type})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Audit Report Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Audit Report Type</label>
              <select
                className="w-full bg-white border border-slate-202 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer font-semibold shadow-sm"
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
              >
                <option value="full">Full Compliance Report</option>
                <option value="security">Security Report</option>
                <option value="performance">Performance Report</option>
                <option value="wireless">Wireless Report</option>
                <option value="aaa">AAA Report</option>
                <option value="dns">Network Services Report</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleGenerateAudit}
              disabled={!selectedJob || !selectedDevice || !selectedTemplateId || runningAudit}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold shadow-sm transition-all text-white ${(!selectedJob || !selectedDevice || !selectedTemplateId || runningAudit)
                ? 'bg-slate-350 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-750 hover:shadow-md'
                }`}
            >
              {runningAudit ? <FaSpinner className="animate-spin text-sm" /> : <FaPlay className="text-[10px]" />}
              <span>{runningAudit ? 'Executing Audit...' : 'Generate Audit'}</span>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Quick Folder Selection & Batch Metrics */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FaFilter className="text-cyan-500 text-xs" />
            <span>Staged Batch Filter</span>
          </h3>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-500">Choose Active Upload Batch:</label>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {jobs.map((job) => {
                const isSelected = (job._id || job.id) === selectedUploadId;
                return (
                  <button
                    key={job._id || job.id}
                    onClick={() => {
                      setSelectedUploadId(job._id || job.id);
                      setSelectedDevice(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between gap-2 ${isSelected
                      ? 'bg-cyan-50 border-cyan-300 text-cyan-800 font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                  >
                    <span className="truncate max-w-[150px]">{job.folder_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-slate-500">
                      {job.total_devices} files
                    </span>
                  </button>
                );
              })}
              {jobs.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No uploads staged yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Discovered Devices Table Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FaServer className="text-cyan-500 text-xs" />
              <span>Discovered Devices List</span>
            </h3>
            <p className="text-[10px] text-slate-450 mt-0.5">Click a row to select the device for compliance audit configuration.</p>
          </div>
          {selectedJob && (
            <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded font-bold">
              {devices.length} Devices
            </span>
          )}
        </div>

        {loadingDevices ? (
          <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center gap-2">
            <FaSpinner className="animate-spin text-3xl text-cyan-500" />
            <p className="text-xs font-medium">Fetching discovered devices...</p>
          </div>
        ) : !selectedUploadId ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <FaInfoCircle className="text-3xl text-slate-300" />
            <p className="text-sm font-medium">Please select an Upload Batch above to view discovered assets.</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-medium">No assets successfully extracted from this batch.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-650 font-bold text-xs uppercase font-mono tracking-wider">
                  <th className="px-5 py-3">Hostname</th>
                  <th className="px-5 py-3">Device Type</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Model</th>
                  <th className="px-5 py-3">File Name</th>
                  <th className="px-5 py-3">Template Status</th>
                  <th className="px-5 py-3">Audit Status</th>
                  <th className="px-5 py-3">Report Status</th>
                  <th className="px-5 py-3">Download Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedDevices.map((device) => {
                  const devId = device._id || device.id;
                  const isSelected = selectedDevice && (selectedDevice._id || selectedDevice.id) === devId;
                  const matchedTemp = device.template_id ? templates.find(t => (t._id || t.id) === device.template_id) : findMatchedTemplate(device);

                  const auditState = auditStatusMap[devId] || 'Pending';
                  const reportState = reportStatusMap[devId] || 'Pending';
                  const downloadState = downloadStatusMap[devId] || 'Pending';

                  return (
                    <tr
                      key={devId}
                      onClick={() => setSelectedDevice(device)}
                      className={`cursor-pointer transition-colors ${isSelected
                        ? 'bg-cyan-50/60 font-semibold border-l-4 border-cyan-500'
                        : 'hover:bg-slate-50/50'
                        }`}
                    >
                      <td className="px-5 py-4 font-bold text-slate-900">{device.device_name || 'Unknown'}</td>
                      <td className="px-5 py-4">
                        <span className="inline-block bg-slate-100 text-slate-650 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-150 uppercase font-mono">
                          {device.device_type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">{device.vendor || 'N/A'}</td>
                      <td className="px-5 py-4 text-slate-600 font-mono">{device.model || 'N/A'}</td>
                      <td className="px-5 py-4 text-slate-500 font-mono truncate max-w-[120px]" title={device.file_path}>
                        {device.file_path ? device.file_path.split('/').pop() : 'Direct Upload'}
                      </td>

                      {/* Template Status */}
                      <td className="px-5 py-4">
                        {matchedTemp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                            <FaCheckCircle className="text-[9px]" />
                            <span>Available</span>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUploadTemplateClick(device);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors shadow-sm"
                          >
                            <FaCloudUploadAlt className="text-xs" />
                            <span>Upload Template</span>
                          </button>
                        )}
                      </td>

                      {/* Audit Status */}
                      <td className="px-5 py-4">
                        {auditState === 'Running' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-250">
                            <FaSpinner className="animate-spin text-[9px]" />
                            <span>Running</span>
                          </span>
                        ) : auditState === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                            <FaCheckCircle className="text-[9px]" />
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <span>Audit Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Report Status */}
                      <td className="px-5 py-4 font-medium">
                        {reportState.status === 'Generated' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>Generated</span>
                            </span>
                            <p className="text-[8px] text-slate-450 font-mono truncate max-w-[100px]" title={reportState.templateName}>
                              {reportState.templateName}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>

                      {/* Download Status */}
                      <td className="px-5 py-4">
                        {downloadState === 'Downloaded' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                            <FaCheckCircle className="text-[9px]" />
                            <span>Downloaded</span>
                          </span>
                        ) : downloadState === 'Download Pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-250">
                            <span>Download Pending</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {reportState.status === 'Generated' ? (
                          <button
                            onClick={() => handleDownloadPDF(device, reportState.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm"
                          >
                            <FaFilePdf className="text-xs" />
                            <span>Download PDF</span>
                          </button>
                        ) : (
                          <button
                            disabled={!matchedTemp || runningAudit}
                            onClick={() => {
                              setSelectedDevice(device);
                              handleGenerateAudit();
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all text-white ${!matchedTemp || runningAudit
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-900 shadow-sm'
                              }`}
                          >
                            <FaPlay className="text-[8px]" />
                            <span>Audit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
                <span className="text-xs text-slate-500">
                  Showing {indexOfFirstDevice + 1} to {Math.min(indexOfLastDevice, devices.length)} of {devices.length} devices
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-650 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        currentPage === page
                          ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm'
                          : 'border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-650 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default ProcessingQueue;
