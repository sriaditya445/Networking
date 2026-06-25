

import React, { useState, useRef, useEffect } from 'react';
import {
  FaCloudUploadAlt,
  FaFolderOpen,
  FaFileAlt,
  FaEye,
  FaTrash,
  FaSync,
  FaInfoCircle,
  FaFolder,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaSpinner
} from 'react-icons/fa';

export default function UploadCenter({
  setActiveTab,
  setSelectedUploadId,
  setSelectedFolderName,
}) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [uploadingFileName, setUploadingFileName] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Fetch uploads from API
  const fetchUploads = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/uploads");
      if (res.ok) {
        const data = await res.json();
        // Sort by created_at descending
        const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setUploads(sorted);
      }
    } catch (error) {
      console.error("Failed to fetch uploads in UploadCenter", error);
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteUpload = async (uploadId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this upload?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/uploads/${uploadId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      fetchUploads();

    } catch (error) {
      console.error(error);
      alert("Failed to delete upload");
    }
  };

  useEffect(() => {
    fetchUploads();
    // Poll uploads list
    const interval = setInterval(fetchUploads, 5000);
    return () => clearInterval(interval);
  }, []);

  // Format Date to: Jun 24, 2026 07:33 AM
  const formatLongDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      await performUpload(filesArray);
    }
  };

  const handleFileChange = async (e, mode) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      await performUpload(filesArray, mode);
    }
  };

  // Perform upload logic
  const performUpload = async (files, mode) => {
    if (!files || files.length === 0) return;

    // Filter out system files or directory metadata (like .DS_Store, __MACOSX)
    const filteredFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      const path = (file.webkitRelativePath || '').toLowerCase();
      return !name.startsWith('.') && !name.startsWith('__macosx') && !path.includes('__macosx');
    });

    if (filteredFiles.length === 0) {
      setUploadError("No valid configuration files selected.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(15);

    // Determine folder name from Zip file or relative folder path or generate one
    let determinedFolderName = 'configs';
    const firstFile = filteredFiles[0];
    if (firstFile.name.toLowerCase().endsWith('.zip')) {
      determinedFolderName = firstFile.name.replace(/\.[^/.]+$/, "");
    } else if (firstFile.webkitRelativePath) {
      determinedFolderName = filteredFiles[0].webkitRelativePath.split('/')[0];
    } else {
      determinedFolderName = 'upload_' + new Date().toISOString().slice(0, 10).replace(/-/g, '_') + '_' + Math.random().toString(36).substring(2, 6);
    }

    setUploadingFileName(determinedFolderName);
    setUploadProgress(35);
    const formData = new FormData();
    formData.append('folder_name', determinedFolderName);
    filteredFiles.forEach((file) => {
      formData.append('files', file, file.webkitRelativePath || file.name);
    });

    setUploadProgress(60);

    try {
      const response = await fetch("http://localhost:8000/api/upload", {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload files.');
      }

      await response.json();
      setUploadProgress(100);

      // Trigger immediate refresh of table
      await fetchUploads();

      // Show success toast
      setToastMessage("Upload completed successfully.");
      setTimeout(() => setToastMessage(null), 3000);

      // Close modal automatically after brief success delay
      setTimeout(() => {
        setShowUploadModal(false);
        setUploading(false);
        setUploadProgress(0);
        setUploadingFileName(null);
      }, 500);

    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message);
      setUploading(false);
      setUploadProgress(0);
      setUploadingFileName(null);
    }
  };

  // Render Status Badge
  const renderStatus = (status) => {
    switch (status) {
      case 'WAITING_TEMPLATE_CREATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-amber-50 text-amber-600 border border-amber-200">
            <FaClock className="text-[10px]" />
            <span>Waiting Template Creation</span>
          </span>
        );
      case 'WAITING_AUDIT_SELECTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-orange-50 text-orange-600 border border-orange-200">
            <FaClock className="text-[10px]" />
            <span>Waiting Audit Selection</span>
          </span>
        );
      case 'READY_FOR_AUDIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
            <FaCheckCircle className="text-[10px]" />
            <span>Ready for Audit</span>
          </span>
        );
      case 'AUDIT_IN_PROGRESS':
      case 'PROCESSING':
      case 'PENDING_EXTRACTION':
      case 'ANALYZING_DEVICES':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-blue-50 text-blue-600 border border-blue-200">
            <FaSpinner className="animate-spin text-[10px]" />
            <span>{status}</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
            <FaCheckCircle className="text-[10px]" />
            <span>Completed</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-rose-50 text-rose-600 border border-rose-250">
            <FaExclamationTriangle className="text-[10px]" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-slate-50 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Pagination calculations
  const totalUploads = uploads.length;
  const totalPages = Math.ceil(totalUploads / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUploads = uploads.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-200">

      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Upload Center & Audit</h2>
          <p className="text-xs font-medium text-slate-500 mt-1">Upload network configuration files and folders for analysis and audit.</p>
        </div>
        <button
          onClick={() => {
            setUploadError(null);
            setShowUploadModal(true);
          }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md inline-flex items-center gap-2 transition shrink-0"
        >
          <FaCloudUploadAlt className="text-sm" />
          <span>Upload Configs</span>
        </button>
      </div>

      {/* Card 2: Uploads Table */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FaFileAlt className="text-slate-400" />
              <span>Uploads</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">View and track all your uploaded files and folders.</p>
          </div>

          <button
            onClick={fetchUploads}
            disabled={loading}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <FaSync className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold text-[10px] uppercase font-mono tracking-wider">
                <th className="px-5 py-3.5">Folder Name</th>
                <th className="px-5 py-3.5">Total Devices</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Uploaded By</th>
                <th className="px-5 py-3.5">Created At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading && uploads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                    <FaSpinner className="animate-spin text-lg text-blue-500 mx-auto mb-2" />
                    <span>Loading uploads list...</span>
                  </td>
                </tr>
              ) : uploads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-16 text-center text-slate-400">
                    <span className="text-3xl block mb-2">📂</span>
                    <span>No uploads found. Drag and drop files above to start auditing.</span>
                  </td>
                </tr>
              ) : (
                paginatedUploads.map((job) => (
                  <tr key={job._id || job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800 flex items-center gap-2">
                      <FaFolder className="text-blue-400 text-sm shrink-0" />
                      <span>{job.folder_name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-650 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        {job.total_devices}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {renderStatus(job.status)}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-500">
                      {job.created_by || 'system'}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-505">
                      {formatLongDate(job.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">

                        <button
                          onClick={() => {
                            setSelectedUploadId(job._id || job.id);
                            setSelectedFolderName(job.folder_name);
                            setActiveTab('queue');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs"
                        >
                          <FaEye />
                          <span>View</span>
                        </button>

                        {job.status === "COMPLETED" && (
                          <button
                            onClick={() => {
                              window.open(
                                `http://localhost:8000/api/uploads/${job._id || job.id}/download`,
                                "_blank"
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 rounded-xl text-xs"
                          >
                            <FaDownload />
                            <span>Download</span>
                          </button>
                        )}

                        <button
                          onClick={() =>
                            handleDeleteUpload(job._id || job.id)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-xl text-xs"
                        >

                          <FaTrash />
                          <span>Delete</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalUploads > 0 && (
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
            <span>
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, totalUploads)} of {totalUploads} uploads
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  className="p-2 border border-slate-205 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <FaChevronLeft className="text-[10px]" />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const page = idx + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold transition border ${currentPage === page
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-slate-200 hover:bg-slate-55 text-slate-700'
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  className="p-2 border border-slate-205 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <FaChevronRight className="text-[10px]" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Info Banner */}
      <div className="flex items-center gap-2.5 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs text-blue-700 font-medium shadow-sm">
        <FaInfoCircle className="text-blue-500 text-sm shrink-0" />
        <span>Click on 'View' to see the processing queue and detailed analysis progress for this upload.</span>
      </div>

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-emerald-500 text-white rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-emerald-400 animate-in slide-in-from-top-5 fade-in duration-300">
          <FaCheckCircle className="text-base shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Upload Modal Dialog ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative animate-in slide-in-from-bottom-5 duration-300">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FaCloudUploadAlt className="text-blue-500 text-base" />
                <span>Upload Configurations</span>
              </h3>
              {!uploading && (
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-slate-650 p-1.5 rounded-lg hover:bg-slate-50 transition"
                  aria-label="Close dialog"
                >
                  <span className="text-sm font-bold">✕</span>
                </button>
              )}
            </div>

            {/* Error Alert inside Modal */}
            {uploadError && (
              <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 font-semibold leading-normal animate-in fade-in duration-150">
                <FaExclamationTriangle className="text-rose-500 text-sm shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Upload Failed</p>
                  <p className="text-[11px] font-medium opacity-90">{uploadError}</p>
                </div>
              </div>
            )}

            {/* Drag & Drop Area inside Modal */}
            <div
              className={`border-2 border-dashed rounded-2xl py-8 px-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${isDragActive
                ? 'border-blue-500 bg-blue-500/5 shadow-inner scale-[0.99]'
                : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50/20'
                } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-sm border border-blue-100">
                <FaCloudUploadAlt />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  Drag & drop ZIP file or folder here
                </p>
                <p className="text-[10px] text-slate-400">
                  Supports multiple .cfg, .txt, .conf files inside
                </p>
              </div>
            </div>

            {/* Select Buttons (Select ZIP / Select Folder) */}
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <span>Select ZIP File</span>
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => folderInputRef.current?.click()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <FaFolderOpen />
                <span>Select Folder</span>
              </button>
            </div>

            {/* Hidden native input elements inside the modal */}
            <input
              aria-label="Upload ZIP File"
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => handleFileChange(e, 'file')}
              accept=".zip,.cfg,.txt,.conf"
              multiple
            />
            <input
              aria-label="Upload Folder"
              type="file"
              ref={folderInputRef}
              className="hidden"
              onChange={(e) => handleFileChange(e, 'folder')}
              webkitdirectory=""
              directory=""
              multiple
            />

            {/* Progress bar inside Modal */}
            {uploading && (
              <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                <div className="flex justify-between text-xs font-bold text-slate-655">
                  <span className="flex items-center gap-1.5 truncate max-w-[80%]">
                    <FaSpinner className="animate-spin text-blue-500 shrink-0" />
                    <span className="truncate">Uploading: {uploadingFileName || 'Files...'}</span>
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Cancel Footer button */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={uploading}
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs transition disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
