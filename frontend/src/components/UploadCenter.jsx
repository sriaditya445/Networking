import React, { useState, useRef, useEffect } from 'react';
import { FaCloudUploadAlt, FaFolderOpen, FaFileAlt, FaTrash, FaCheckCircle, FaSpinner, FaHistory, FaEye } from 'react-icons/fa';

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
  formatDate,
  renderStatusBadge
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedTypeDevices, setSelectedTypeDevices] = useState([]);
  const [selectedTypeName, setSelectedTypeName] = useState("");
  const [compareStatus, setCompareStatus] = useState({});


  // useEffect(() => {
  //   fetch("http://localhost:8000/api/templates")
  //     .then((res) => res.json())
  //     .then((data) => setTemplates(data))
  //     .catch((err) => console.error("Failed to load templates:", err));
  // }, []);


  const handleCompare = (type) => {

    setCompareStatus(prev => ({
      ...prev,
      [type]: "SUCCESS"
    }));

  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };


  const handleViewTypeDevices = (type) => {

    const typeDevices = filteredDevices.filter(
      d => d.device_type === type
    );

    setSelectedTypeDevices(typeDevices);
    setSelectedTypeName(type);
    setShowTypeModal(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(filesArray);

      // Auto suggest batch name
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

  const removeFile = (idxToRemove) => {
    setSelectedFiles(selectedFiles.filter((_, idx) => idx !== idxToRemove));
  };

  const triggerInputClick = () => {
    if (uploadMode === 'file' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (uploadMode === 'folder' && folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  // Get recent 5 jobs
  const uploadHistory = [...jobs].slice(0, 5);
  const filteredDevices = selectedJob
    ? devices.filter(
      (device) =>
        device.upload_id === (selectedJob._id || selectedJob.id)
    )
    : [];

  const deviceCounts = filteredDevices.reduce(
    (acc, device) => {
      const type = device.device_type || "Unknown";

      acc[type] = (acc[type] || 0) + 1;

      return acc;
    },
    {}
  );
  const totalDeviceTypes =
    Object.keys(deviceCounts).length;

  const completedDeviceTypes =
    Object.values(compareStatus).filter(
      status => status === "SUCCESS"
    ).length;

  const folderStatus =
    totalDeviceTypes > 0 &&
      completedDeviceTypes === totalDeviceTypes
      ? "SUCCESS"
      : "PENDING";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Upload Console */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Upload Center</h2>
          <p className="text-xs text-slate-500">Staging network configuration text documents into the database.</p>
        </div>

        {/* Upload Mode Toggles */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl max-w-sm">
          <button
            type="button"
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${uploadMode === 'file'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
            onClick={() => { setUploadMode('file'); setSelectedFiles([]); }}
          >
            Files Mode
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${uploadMode === 'folder'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
            onClick={() => { setUploadMode('folder'); setSelectedFiles([]); }}
          >
            Folder Mode
          </button>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {/* Label Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block" htmlFor="batchLabel">
              Batch / Folder Label
            </label>
            <input
              id="batchLabel"
              type="text"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-3 px-4 text-sm text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. branch_office_configs"
              required
            />



            <div className="space-y-2">


              {/* Detected Device Types */}

              {Object.keys(deviceCounts).length > 0 && (

                <div className="space-y-3">
                  {selectedJob && (
                    <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3">

                      <div className="text-xs text-slate-500">
                        Selected Upload
                      </div>

                      <div className="flex justify-between items-center">

                        <div className="font-semibold text-cyan-700">
                          {selectedJob.folder_name}
                        </div>

                        <div>
                          {folderStatus === "SUCCESS" ? (
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                              SUCCESS
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs">
                              PENDING
                            </span>
                          )}
                        </div>

                      </div>

                    </div>
                  )}

                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Detected Device Types
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                    {Object.entries(deviceCounts).map(
                      ([type, count]) => (

                        <div
                          key={type}
                          onClick={() => handleCompare(type)}
                          className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-cyan-400 transition-all"
                        >

                          <div className="flex justify-between items-center">

                            <div>
                              <div className="text-sm font-bold text-slate-800">
                                {type}
                              </div>

                              <div className="text-xs text-slate-500 mt-1">
                                {count} Devices
                              </div>

                              <div className="mt-2">
                                {compareStatus[type] === "SUCCESS" ? (
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-green-600 text-xs font-semibold">
                                      Success
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span className="text-red-600 text-xs font-semibold">
                                      Pending
                                    </span>
                                  </div>
                                )}

                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTypeDevices(type);
                              }}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-cyan-50"
                            >
                              <FaEye className="text-cyan-600" />
                            </button>

                          </div>

                        </div>

                      )
                    )}

                    <div className="mt-4 flex justify-end">

                      <button
                        type="button"
                        onClick={() => {

                          const updatedStatus = {};

                          Object.keys(deviceCounts).forEach(type => {
                            updatedStatus[type] = "SUCCESS";
                          });

                          setCompareStatus(updatedStatus);

                        }}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium"
                      >
                        Process All
                      </button>

                    </div>

                  </div>

                </div>

              )}
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Golden Template
              </label>

              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 focus:outline-none focus:border-cyan-500"
              // required
              >
                <option value="">
                  Select Template
                </option>

                {templates.map((template) => (
                  <option
                    key={template._id}
                    value={template._id}
                  >
                    {template.name}
                  </option>
                ))}
              </select>

              {selectedTemplate && (

                <div className="mt-3 bg-cyan-50 border border-cyan-100 rounded-xl p-4">

                  <h4 className="font-semibold text-cyan-700">
                    Selected Audit Template
                  </h4>

                  <div className="mt-2 text-sm text-slate-700">

                    <p>
                      Template:
                      <span className="font-mono ml-2">
                        {selectedTemplate}
                      </span>
                    </p>

                    <p className="mt-2 text-slate-500">
                      Only devices matching this template
                      will be audited.
                    </p>

                  </div>

                </div>

              )}
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${isDragActive
              ? 'border-cyan-500 bg-cyan-500/5'
              : 'border-slate-200 hover:border-cyan-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            onClick={triggerInputClick}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-14 h-14 rounded-full bg-cyan-50 text-cyan-500 flex items-center justify-center text-2xl shadow-sm border border-cyan-100">
              {uploadMode === 'file' ? <FaCloudUploadAlt /> : <FaFolderOpen />}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">
                {uploadMode === 'file' ? 'Click to select configuration files' : 'Click to select configuration folder'}
              </p>
              <p className="text-xs text-slate-400">
                {uploadMode === 'file' ? 'Supports multiple files (.cfg, .txt, .conf)' : 'This uploads all configuration files inside the chosen directory'}
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

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3 px-6 rounded-xl transition-all shadow-[0_4px_14px_rgba(6,182,212,0.25)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            disabled={selectedFiles.length === 0 || uploading || !backendOnline}
          >
            {uploading ? (
              <>
                <FaSpinner className="animate-spin text-sm" />
                <span>Uploading Configurations...</span>
              </>
            ) : (
              <span>Process Staged Configurations</span>
            )}
          </button>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium font-mono">Uploading files...</span>
                <span className="text-cyan-600 font-bold font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Side Pane: Selection Preview & Upload History */}
      <div className="space-y-6">
        {/* Selected Files List */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FaFileAlt className="text-slate-400 text-xs" />
            <span>Files Queue ({selectedFiles.length})</span>
          </h3>

          {selectedFiles.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              No files queued for upload.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100/50 group">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-slate-700 truncate" title={file.webkitRelativePath || file.name}>
                      {file.webkitRelativePath || file.name}
                    </p>
                    <p className="text-[9px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from queue"
                  >
                    <FaTrash className="text-[10px]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Upload History */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FaHistory className="text-slate-400 text-xs" />
            <span>Upload History</span>
          </h3>

          {uploadHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              No jobs in database.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {uploadHistory.map((job) => (


                <div
                  key={job._id || job.id}
                  onClick={() => {
                    setSelectedJob(job);
                    setCompareStatus({});
                  }}
                  className={`cursor-pointer flex justify-between items-start gap-2 border-b border-slate-50 pb-2.5 last:border-0 last:pb-0 rounded-lg p-2 transition

  ${selectedJob?._id === job._id
                      ? "bg-cyan-50 border border-cyan-200"
                      : "hover:bg-slate-50"
                    }
  `}
                >                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-700 truncate">{job.folder_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {job.files_count} files • {formatDate(job.created_at)}
                    </p>


                    <div className="flex items-center gap-1 mt-2">
                      <div
                        className={`w-2 h-2 rounded-full ${["PENDING", "PROCESSING", "COMPARING", "SUCCESS"].includes(job.status)
                          ? "bg-green-500"
                          : "bg-gray-300"
                          }`}
                      />

                      <div
                        className={`w-8 h-0.5 ${["PROCESSING", "COMPARING", "SUCCESS"].includes(job.status)
                          ? "bg-green-500"
                          : "bg-gray-300"
                          }`}
                      />

                      <div
                        className={`w-2 h-2 rounded-full ${["PROCESSING", "COMPARING", "SUCCESS"].includes(job.status)
                          ? "bg-green-500"
                          : "bg-gray-300"
                          }`}
                      />

                      <div
                        className={`w-8 h-0.5 ${["COMPARING", "SUCCESS"].includes(job.status)
                          ? "bg-green-500"
                          : "bg-gray-300"
                          }`}
                      />

                      <div
                        className={`w-2 h-2 rounded-full ${["COMPARING", "SUCCESS"].includes(job.status)
                          ? "bg-green-500"
                          : "bg-gray-300"
                          }`}
                      />

                      <div
                        className={`w-8 h-0.5 ${job.status === "SUCCESS"
                          ? "bg-green-500"
                          : "bg-gray-300"
                          }`}
                      />

                      <div
                        className={`w-2 h-2 rounded-full ${job.status === "SUCCESS"
                          ? "bg-green-500"
                          : "bg-gray-300"
                          }`}
                      />
                    </div>

                    
                  </div>
                  <div className="shrink-0">
                    {renderStatusBadge(job.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl p-6 w-[700px] max-h-[80vh] overflow-auto">

            <div className="flex justify-between mb-4">

              <h2 className="text-lg font-bold">
                {selectedTypeName} Devices
              </h2>

              <button
                onClick={() => setShowTypeModal(false)}
              >
                ✕
              </button>

            </div>

            <table className="w-full">

              <thead>
                <tr>
                  <th className="text-left">Hostname</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>

              <tbody>

                {selectedTypeDevices.map(device => (
                  <tr
                    key={device._id}
                    className="border-t"
                  >
                    <td className="py-2">
                      {device.device_name}
                    </td>

                    <td>
                      {device.device_type}
                    </td>

                    <td>
                      {compareStatus[selectedTypeName] === "SUCCESS" ? (

                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="text-green-600 text-xs font-semibold">
                            Success
                          </span>
                        </div>

                      ) : (

                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          <span className="text-red-600 text-xs font-semibold">
                            Pending
                          </span>
                        </div>

                      )}
                    </td>
                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>
      )}

    </div>
  );
}



export default UploadCenter;
