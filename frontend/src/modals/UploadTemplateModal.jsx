import React, { useState, useRef } from 'react';
import { FaCloudUploadAlt, FaFileAlt, FaTrash } from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/common/Button';

export default function UploadTemplateModal({ isOpen, onClose, onUpload, deviceName }) {
  const { addToast } = useToast();
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
      addToast("Only .txt, .cfg, .conf, and .j2 files are supported.", "warning");
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
      addToast("Please specify a template name and choose a valid template file.", "warning");
      return;
    }

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-800 text-sm">
              Upload Golden Template
            </h3>
            {deviceName && (
              <p className="text-[10px] text-slate-400 font-medium">Device: <span className="font-semibold text-slate-600">{deviceName}</span></p>
            )}
          </div>
          <button 
            onClick={() => { resetForm(); onClose(); }}
            className="text-slate-400 hover:text-slate-650 transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Template Name</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. branch_switch_v1"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Version</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
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
              ? 'border-cyan-505 bg-cyan-500/5'
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
              <p className="text-xs font-bold text-slate-705">
                Click or drag template file here
              </p>
              <p className="text-[9px] text-slate-400">
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
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-mono text-[10px]">
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
            <Button
              variant="secondary"
              onClick={() => { resetForm(); onClose(); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!selectedFile}
            >
              Upload Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
