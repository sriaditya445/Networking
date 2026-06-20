import React, { useState, useRef, useEffect } from 'react';
import { 
  FaCloudUploadAlt, 
  FaFolderOpen, 
  FaFileAlt, 
  FaTrash, 
  FaCheckCircle, 
  FaSpinner, 
  FaHistory, 
  FaEye, 
  FaPlay, 
  FaFilter,
  FaFileInvoice
} from 'react-icons/fa';

// Import Zustand stores
import { useVendorStore } from '../store/vendorStore';
import { useAuditStore } from '../store/auditStore';

// Import Modals & Reusable Components
import AuditSelectionModal from './modals/AuditSelectionModal';
import TypeDevicesModal from './TypeDevicesModal';
import StatusBadge from './common/StatusBadge';
import ActionButtons from './common/ActionButtons';

function UploadCenter({
  folderName,
  setFolderName,
  selectedFiles,
  setSelectedFiles,
  uploadMode,
  setUploadMode,
  uploading,
  uploadProgress,
  backendOnline,
  handleUploadSubmit,
  jobs,
  devices,
  formatDate,
  renderStatusBadge
}) {
  // Zustand stores
  const { vendors } = useVendorStore();
  const [templates, setTemplates] = useState([]);
  const { auditResults, runAudit } = useAuditStore();

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
        console.error("Failed to fetch templates in UploadCenter", error);
      }
    };
    fetchTemplates();
  }, [vendors]);

  // Local UI State
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [processingState, setProcessingState] = useState({}); // { [deviceType]: 'Pending'|'Processing'|'Success'|'Failed' }
  const [auditTypes, setAuditTypes] = useState({}); // { [deviceType]: 'Full Audit' }
  const [deletedTypes, setDeletedTypes] = useState([]);

  // Modal target states
  const [showTypeDevicesModal, setShowTypeDevicesModal] = useState(false);
  const [selectedTypeDevices, setSelectedTypeDevices] = useState([]);
  const [selectedTypeName, setSelectedTypeName] = useState("");
  const [targetAuditType, setTargetAuditType] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Set default selected job when jobs list updates
  useEffect(() => {
    if (jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0]);
    }
  }, [jobs, selectedJob]);

  // Reset deleted types when changing selected job
  useEffect(() => {
    setDeletedTypes([]);
  }, [selectedJob]);

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(filesArray);
      if (folderName === 'configs') {
        setFolderName('batch_' + new Date().toISOString().slice(0, 10).replace(/-/g, ''));
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);

      if (uploadMode === 'folder' && filesArray.length > 0 && filesArray[0].webkitRelativePath) {
        const rootFolder = filesArray[0].webkitRelativePath.split('/')[0];
        setFolderName(rootFolder);
      } else if (filesArray.length > 0 && folderName === 'configs') {
        setFolderName('batch_' + new Date().toISOString().slice(0, 10).replace(/-/g, ''));
      }
    }
  };

  const triggerInputClick = () => {
    if (uploadMode === 'file' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (uploadMode === 'folder' && folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  // Remove single file from queue
  const removeFile = (idxToRemove) => {
    setSelectedFiles(selectedFiles.filter((_, idx) => idx !== idxToRemove));
  };

  // Get devices for selected history job
  const allStagedDevices = selectedJob
    ? devices.filter((device) => device.upload_id === (selectedJob._id || selectedJob.id))
    : [];

  const filteredDevices = allStagedDevices.filter(d => !deletedTypes.includes(d.device_type));

  // Group devices by type and count them
  const deviceCounts = filteredDevices.reduce((acc, device) => {
    const type = device.device_type || "Unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Compute table data based on deviceCounts
  const detectedDeviceRows = Object.entries(deviceCounts).map(([type, count]) => {
    const typeDevices = filteredDevices.filter(d => d.device_type === type);
    const hasMatchedTemplate = typeDevices.some(d => {
      return templates.some(t => 
        t.vendorName.toLowerCase() === (d.vendor || 'Cisco').toLowerCase() &&
        t.deviceType.toLowerCase() === (d.device_type || 'L2 Switch').toLowerCase() &&
        t.modelNumber.toLowerCase() === (d.model_number || 'Unknown').toLowerCase()
      );
    });

    return {
      type,
      count,
      auditType: auditTypes[type] || 'Full Audit',
      templateStatus: hasMatchedTemplate ? 'Uploaded' : 'Not Uploaded',
      processingStatus: processingState[type] || 'Pending'
    };
  });

  // Action handlers
  const handleViewType = (type) => {
    const typeDevices = filteredDevices.filter(d => d.device_type === type);
    setSelectedTypeName(type);
    setSelectedTypeDevices(typeDevices);
    setShowTypeDevicesModal(true);
  };

  const handleAuditConfigClick = (type) => {
    setTargetAuditType(type);
    setIsAuditModalOpen(true);
  };

  const handleSaveAuditType = (selectedType) => {
    if (targetAuditType) {
      setAuditTypes(prev => ({
        ...prev,
        [targetAuditType]: selectedType
      }));
      setTargetAuditType(null);
    }
  };

  const runAuditForType = async (type) => {
    setProcessingState(prev => ({
      ...prev,
      [type]: 'Processing'
    }));

    // Trigger simulation store run
    const typeDevices = filteredDevices.filter(d => d.device_type === type);
    for (const d of typeDevices) {
      const templateSummary = templates.find(t =>
        t.vendorName.toLowerCase() === (d.vendor || 'Cisco').toLowerCase() &&
        t.deviceType.toLowerCase() === (d.device_type || 'L2 Switch').toLowerCase() &&
        t.modelNumber.toLowerCase() === (d.model_number || 'Unknown').toLowerCase()
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
          console.error("Failed to fetch detailed template in runAuditForType", e);
        }
      }
      runAudit(d._id || d.id, d.device_name, auditTypes[type] || 'Full Audit', detailedTemplate);
    }

    // Simulate completion
    setTimeout(() => {
      setProcessingState(prev => ({
        ...prev,
        [type]: Math.random() > 0.3 ? 'Success' : 'Failed'
      }));
    }, 1500);
  };

  const handleProcessAll = async () => {
    for (const type of Object.keys(deviceCounts)) {
      await runAuditForType(type);
    }
  };

  const handleDeleteType = (type) => {
    if (window.confirm(`Delete all ${type} devices from this staged configuration?`)) {
      setDeletedTypes(prev => [...prev, type]);
    }
  };

  const uploadHistory = [...jobs].slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Upload Center & Audit</h2>
        <p className="text-xs text-slate-500">Staging network configuration text documents and auditing them against policies.</p>
      </div>

      {/* Main Single Screen Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Upload Console Panel (Left side - 8 columns) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Top Stage Form Block */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-5">
            
            {/* Top configuration options row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Folder Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Folder Name
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors font-medium"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. branch_configs"
                  required
                />
              </div>

              {/* Template selection dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Select Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
                >
                  <option value="">No Template (Generic Audit)</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>
                  ))}
                </select>
              </div>

              {/* Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Upload Mode
                </label>
                <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${uploadMode === 'file'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                    onClick={() => { setUploadMode('file'); setSelectedFiles([]); }}
                  >
                    Files Mode
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${uploadMode === 'folder'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                    onClick={() => { setUploadMode('folder'); setSelectedFiles([]); }}
                  >
                    Folder Mode
                  </button>
                </div>
              </div>

            </div>

            {/* Drag & Drop zone */}
            <div
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${isDragActive
                ? 'border-cyan-500 bg-cyan-500/5'
                : 'border-slate-200 hover:border-cyan-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              onClick={triggerInputClick}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-10 h-10 rounded-full bg-cyan-55/60 text-cyan-500 flex items-center justify-center text-lg shadow-sm border border-cyan-100">
                {uploadMode === 'file' ? <FaCloudUploadAlt /> : <FaFolderOpen />}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-700">
                  {uploadMode === 'file' ? 'Click to select config files' : 'Click to select config directory'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Supports multiple .cfg, .txt, .conf configuration documents
                </p>
              </div>

              {uploadMode === 'file' ? (
                <input
                  aria-label="Upload configuration files"
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                  required
                />
              ) : (
                <input
                  aria-label="Upload folder of configuration files"
                  type="file"
                  ref={folderInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  required
                />
              )}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleUploadSubmit}
                disabled={selectedFiles.length === 0 || uploading || !backendOnline}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2 px-4 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
              >
                {uploading ? (
                  <>
                    <FaSpinner className="animate-spin text-xs" />
                    <span>Uploading staged files ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <FaCloudUploadAlt className="text-sm" />
                    <span>Upload & Parse Selected Files</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleProcessAll}
                disabled={detectedDeviceRows.length === 0}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <FaPlay className="text-[10px]" />
                <span>Process & Audit All Types</span>
              </button>
            </div>

            {/* Progress indicator */}
            {uploading && (
              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

          </div>

          {/* Redesigned Detected Devices Table Block */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FaFileInvoice className="text-cyan-500 text-xs" />
                  <span>Staged Detected Devices Analysis</span>
                </h3>
                {selectedJob && (
                  <p className="text-[10px] text-slate-400 font-medium">Selected Batch: <span className="font-semibold text-slate-600">{selectedJob.folder_name}</span></p>
                )}
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded font-bold">
                {detectedDeviceRows.length} device types
              </span>
            </div>

            {detectedDeviceRows.length === 0 ? (
              <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">🗂️</span>
                <p className="text-xs font-semibold">No staged device batches selected or parsed.</p>
                <p className="text-[10px] text-slate-400">Choose a history upload job or stage new configs to analyze.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold text-[10px] uppercase font-mono tracking-wider">
                      <th className="px-5 py-3">Device Type</th>
                      <th className="px-5 py-3">Count</th>
                      <th className="px-5 py-3">Audit Type</th>
                      <th className="px-5 py-3">Template Status</th>
                      <th className="px-5 py-3">Processing Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {detectedDeviceRows.map((row) => (
                      <tr key={row.type} className="hover:bg-slate-50/40 transition-colors text-slate-700">
                        <td className="px-5 py-3.5 font-bold text-slate-850">
                          {row.type}
                        </td>
                        <td className="px-5 py-3.5 font-mono">
                          {row.count} devices
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 border border-slate-200 rounded-lg">
                            {row.auditType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={row.templateStatus} />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={row.processingStatus} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <ActionButtons
                            actions={[
                              {
                                type: 'view',
                                title: 'View Staged Hostnames',
                                onClick: () => handleViewType(row.type)
                              },
                              {
                                type: 'audit',
                                label: 'Configure',
                                title: 'Configure Audit Parameters',
                                onClick: () => handleAuditConfigClick(row.type)
                              },
                              {
                                type: 'custom',
                                icon: <FaPlay className="text-[10px] text-emerald-600" />,
                                className: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100',
                                label: 'Run',
                                title: 'Run Staged Verification',
                                onClick: () => runAuditForType(row.type)
                              },
                              {
                                type: 'delete',
                                title: 'Delete Group',
                                onClick: () => handleDeleteType(row.type)
                              }
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

        {/* Side Pane: Selected Files Queue & Upload History (Right side - 4 columns) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Staged Files Queue */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FaFileAlt className="text-slate-450 text-xs shrink-0" />
              <span>Queue Files Staging ({selectedFiles.length})</span>
            </h3>

            {selectedFiles.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic">
                Staging queue is currently empty.
              </div>
            ) : (
              <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 group">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-slate-700 truncate" title={file.webkitRelativePath || file.name}>
                        {file.webkitRelativePath || file.name}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FaTrash className="text-[10px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staged Upload Batches History */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FaHistory className="text-slate-450 text-xs shrink-0" />
              <span>Staged Jobs History</span>
            </h3>

            {uploadHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                No history uploads recorded.
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {uploadHistory.map((job) => {
                  const isCurrent = selectedJob?._id === job._id || selectedJob?.id === job.id;
                  return (
                    <div
                      key={job._id || job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`cursor-pointer border-b border-slate-100 pb-2.5 last:border-0 last:pb-0 rounded-xl p-2.5 transition flex items-start justify-between gap-2 border ${
                        isCurrent
                          ? "bg-cyan-50/35 border-cyan-300 shadow-sm"
                          : "border-transparent hover:bg-slate-55"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-750 truncate">{job.folder_name}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                          {job.files_count} configs • {formatDate(job.created_at)}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {renderStatusBadge(job.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Selected Type Devices Modal Viewer */}
      {showTypeDevicesModal && (
        <TypeDevicesModal
          type={selectedTypeName}
          devices={selectedTypeDevices}
          onClose={() => setShowTypeDevicesModal(false)}
          onViewDevice={() => {}}
        />
      )}

      {/* Audit Configuration Selection Modal */}
      <AuditSelectionModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setTargetAuditType(null);
        }}
        onSelect={handleSaveAuditType}
        initialSelection={auditTypes[targetAuditType] || 'Full Audit'}
        deviceName={`All ${targetAuditType} Devices`}
      />
    </div>
  );
}

export default UploadCenter;
