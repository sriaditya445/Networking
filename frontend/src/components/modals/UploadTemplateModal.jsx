import React, { useState, useRef } from 'react';
import { FaCloudUploadAlt, FaFileAlt, FaTrash } from 'react-icons/fa';

export default function UploadTemplateModal({ isOpen, onClose, onUpload, deviceName }) {
  const [templateName, setTemplateName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

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
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'cfg', 'conf', 'j2'].includes(extension)) {
      alert("Only .txt, .cfg, .conf, and .j2 files are supported.");
      return;
    }
    setSelectedFile(file);
    if (!templateName) {
      setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile || !templateName) {
      alert("Please specify a template name and choose a valid template file.");
      return;
    }

    // Read file content as mock or save details
    const reader = new FileReader();
    reader.onload = (event) => {
      onUpload({
        name: templateName,
        version: version || '1.0.0',
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileContent: event.target.result,
      });
      resetForm();
      onClose();
    };
    reader.readAsText(selectedFile);
  };

  const resetForm = () => {
    setTemplateName('');
    setVersion('1.0.0');
    setSelectedFile(null);
  };

  const triggerInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-150 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-800 text-base">
              Upload Golden Template
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Device: <span className="font-semibold text-slate-600">{deviceName}</span></p>
          </div>
          <button 
            onClick={() => { resetForm(); onClose(); }}
            className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Template Name</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. branch_switch_v1"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Version</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.0.0"
                required
              />
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${isDragActive
              ? 'border-cyan-500 bg-cyan-500/5'
              : 'border-slate-200 hover:border-cyan-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            onClick={triggerInputClick}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-10 h-10 rounded-full bg-cyan-50 text-cyan-500 flex items-center justify-center text-lg shadow-sm border border-cyan-100">
              <FaCloudUploadAlt />
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-700">
                Click or drag template file here
              </p>
              <p className="text-[10px] text-slate-400">
                Supports .txt, .cfg, .conf, and .j2 files
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept=".txt,.cfg,.conf,.j2"
            />
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150 font-mono text-[11px]">
              <div className="flex items-center gap-2 min-w-0">
                <FaFileAlt className="text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700 truncate">{selectedFile.name}</span>
                <span className="text-[9px] text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
              >
                <FaTrash className="text-[10px]" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
