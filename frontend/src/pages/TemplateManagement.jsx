import React, { useState, useRef, useEffect } from 'react';
import { FaPlus, FaFileAlt, FaCode, FaCloudUploadAlt, FaEye, FaEdit, FaTrash, FaBuilding } from 'react-icons/fa';

// Import Zustand stores
import { useVendorStore } from '../store/vendorStore';

// Import contexts
import { useToast } from '../contexts/ToastContext';
import { useModal } from '../contexts/ModalContext';

// Import reusable components
import PageHeader from '../components/common/PageHeader';
import ReusableTable from '../components/common/ReusableTable';
import ActionButtons from '../components/common/ActionButtons';
import Button from '../components/common/Button';

export default function TemplateManagement({ onSuccess }) {
  const { vendors } = useVendorStore();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { addToast } = useToast();
  const { showConfirm } = useModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);

  const mapDeviceTypeToBackend = (type) => {
    const t = type.toLowerCase();
    if (t.includes('switch')) return 'switch';
    if (t.includes('router')) return 'router';
    if (t.includes('firewall')) return 'firewall';
    if (t.includes('wlc')) return 'wlc';
    return 'unknown';
  };

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
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
      } else {
        setError("Failed to fetch templates.");
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Form Fields State
  const [vendorId, setVendorId] = useState('');
  const [deviceType, setDeviceType] = useState('L2 Switch');
  const [modelNumber, setModelNumber] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [inputMethod, setInputMethod] = useState('paste'); // 'upload' or 'paste'
  const [pastedContent, setPastedContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Drag and drop zone local UI state
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setVendorId('');
    setDeviceType('L2 Switch');
    setModelNumber('');
    setTemplateName('');
    setVersion('1.0.0');
    setInputMethod('paste');
    setPastedContent('');
    setUploadedFile(null);
    setEditingTemplate(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenView = async (template) => {
    try {
      const response = await fetch(`http://localhost:8000/api/templates/${template.id}`);
      if (response.ok) {
        const detailed = await response.json();
        setViewingTemplate({
          ...template,
          content: detailed.template_content || ''
        });
      } else {
        addToast("Failed to fetch template details.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error fetching template details.", "error");
    }
  };

  const handleOpenEdit = async (template) => {
    try {
      const response = await fetch(`http://localhost:8000/api/templates/${template.id}`);
      if (response.ok) {
        const detailed = await response.json();
        const mapped = {
          ...template,
          content: detailed.template_content || ''
        };
        setEditingTemplate(mapped);
        setVendorId(mapped.vendorId);
        setDeviceType(mapped.deviceType);
        setModelNumber(mapped.modelNumber);
        setTemplateName(mapped.name);
        setVersion(mapped.version || '1.0.0');
        setInputMethod(mapped.templateType.toLowerCase() === 'upload' ? 'upload' : 'paste');
        if (mapped.templateType.toLowerCase() === 'upload') {
          setUploadedFile({ name: mapped.fileName || 'uploaded_config_file', content: mapped.content });
        } else {
          setPastedContent(mapped.content);
        }
        setIsModalOpen(true);
      } else {
        addToast("Failed to fetch template details for editing.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error fetching template details.", "error");
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = await showConfirm({
      title: 'Delete Golden Template',
      description: `Are you sure you want to delete the template "${name}"? Network devices relying on this mapping will not run compliance audits until a new template is assigned.`,
      type: 'danger'
    });
    if (confirmed) {
      try {
        const response = await fetch(`http://localhost:8000/api/templates/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          addToast("Template deleted successfully!", "success");
          await fetchTemplates();
        } else {
          const err = await response.json();
          addToast(`Failed to delete template: ${err.message || 'Unknown error'}`, "error");
        }
      } catch (err) {
        console.error(err);
        addToast("Error deleting template.", "error");
      }
    }
  };

  // Drag & Drop event handlers
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
      validateFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFile(e.target.files[0]);
    }
  };

  const validateFile = (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'cfg', 'conf', 'j2'].includes(extension)) {
      addToast("Only .txt, .cfg, .conf, and .j2 files are supported.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFile({
        file,
        name: file.name,
        size: file.size,
        content: event.target.result
      });
      if (!templateName) {
        setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      addToast("Please select a vendor.", "warning");
      return;
    }

    const vendor = vendors.find(v => v.id === vendorId);
    const vendorName = vendor ? vendor.name : 'Unknown';

    let content = '';
    let fileName = '';

    if (inputMethod === 'upload') {
      if (!uploadedFile) {
        addToast("Please upload a config file.", "warning");
        return;
      }
      content = uploadedFile.content;
      fileName = uploadedFile.name;
    } else {
      if (!pastedContent.trim()) {
        addToast("Please paste the template content.", "warning");
        return;
      }
      content = pastedContent;
      fileName = `${templateName}.j2`;
    }

    try {
      if (editingTemplate) {
        // PUT /api/templates/:id
        const updatePayload = {
          vendor: vendorName,
          device_type: mapDeviceTypeToBackend(deviceType),
          model: modelNumber || null,
          template_name: templateName,
          template_type: 'jinja2',
          template_content: content
        };

        const response = await fetch(`http://localhost:8000/api/templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });

        if (response.ok) {
          addToast("Template updated successfully!", "success");
          await fetchTemplates();
          setIsModalOpen(false);
          resetForm();
          if (typeof onSuccess === 'function') {
            onSuccess();
          }
        } else {
          const err = await response.json();
          addToast(`Failed to update template: ${err.detail || 'Unknown error'}`, "error");
        }
      } else {
        // POST /api/templates/upload
        const formData = new FormData();
        formData.append("vendorId", vendorId);
        formData.append("vendorName", vendorName);
        formData.append("deviceType", deviceType);
        formData.append("modelNumber", modelNumber);
        formData.append("templateName", templateName);
        formData.append("version", version);

        formData.append("vendor", vendorName);
        formData.append("device_type", mapDeviceTypeToBackend(deviceType));
        formData.append("model", modelNumber || '');
        formData.append("template_name", templateName);

        if (inputMethod === 'upload') {
          if (uploadedFile?.file) {
            formData.append("file", uploadedFile.file);
          } else {
            const blob = new Blob([content], { type: 'text/plain' });
            formData.append("file", blob, fileName);
          }
        } else {
          formData.append("content", content);
          const blob = new Blob([content], { type: 'text/plain' });
          formData.append("file", blob, fileName);
        }

        const response = await fetch("http://localhost:8000/api/templates/upload", {
          method: "POST",
          body: formData
        });

        if (response.ok) {
          addToast("Template uploaded successfully!", "success");
          await fetchTemplates();
          setIsModalOpen(false);
          resetForm();
          if (typeof onSuccess === 'function') {
            onSuccess();
          }
        } else {
          const err = await response.json();
          addToast(`Failed to create template: ${err.detail || 'Unknown error'}`, "error");
        }
      }
    } catch (error) {
      console.error("Failed to submit template:", error);
      addToast("Error saving template.", "error");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString();
  };

  // Columns for template table
  const columns = [
    {
      key: 'name', label: 'Template Name', render: (val) => (
        <div className="flex items-center gap-2">
          <FaFileAlt className="text-cyan-550 text-xs shrink-0" />
          <span className="font-bold text-slate-800">{val}</span>
        </div>
      )
    },
    {
      key: 'vendorName', label: 'Vendor', render: (val) => (
        <div className="flex items-center gap-1.5">
          <FaBuilding className="text-slate-400 text-[10px]" />
          <span className="font-medium text-slate-700">{val}</span>
        </div>
      )
    },
    {
      key: 'deviceType', label: 'Device Type', render: (val) => (
        <span className="inline-block bg-slate-100 text-slate-650 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-150">
          {val}
        </span>
      )
    },
    { key: 'modelNumber', label: 'Model', render: (val) => <span className="font-mono text-xs font-semibold text-slate-605">{val || 'All Models'}</span> },
    {
      key: 'templateType', label: 'Method', render: (val) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${val === 'Upload' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
          }`}>
          {val === 'Upload' ? <FaCloudUploadAlt className="text-[9px]" /> : <FaCode className="text-[9px]" />}
          <span>{val}</span>
        </span>
      )
    },
    { key: 'version', label: 'Version', render: (val) => <span className="font-mono text-xs font-bold text-slate-500">v{val}</span> },
    { key: 'createdAt', label: 'Created Date', render: (val) => <span className="text-xs text-slate-400 font-mono">{formatDate(val)}</span> },
    {
      key: 'actions', label: 'Actions', className: 'text-right', render: (_, row) => (
        <ActionButtons
          actions={[
            {
              type: 'view',
              title: 'View Template Content',
              onClick: () => handleOpenView(row)
            },
            {
              type: 'edit',
              title: 'Edit Template Specifications',
              onClick: () => handleOpenEdit(row)
            },
            {
              type: 'delete',
              title: 'Delete Template',
              onClick: () => handleDelete(row.id, row.name)
            }
          ]}
        />
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page Header */}
      <PageHeader
        title="Template Management"
        subtitle="Upload or compose policy-compliant Golden config files. Associate them directly to Device Types and Models."
      >
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <FaPlus />
          <span>Add Template</span>
        </button>
      </PageHeader>

      {/* Main Table Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center border-b border-slate-55 pb-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
            <FaFileAlt className="text-cyan-505 text-xs" />
            <span>Golden Template Repository</span>
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded font-bold">
            {templates.length} Templates
          </span>
        </div>

        <div className="overflow-hidden">
          <ReusableTable
            columns={columns}
            data={templates}
            emptyMessage="No configuration templates registered. Click 'Add Template' to begin."
          />
        </div>
      </div>

      {/* Viewing Template Content Modal overlay */}
      {viewingTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl border border-slate-100 overflow-hidden animate-zoom-in">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-850 text-sm">{viewingTemplate.name}</h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {viewingTemplate.vendorName} • {viewingTemplate.deviceType} • {viewingTemplate.modelNumber || 'All Models'} (v{viewingTemplate.version})
                </p>
              </div>
              <button
                onClick={() => setViewingTemplate(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Template Body</label>
              <pre className="bg-slate-900 text-cyan-400 p-4 rounded-2xl font-mono text-[10px] overflow-auto max-h-[350px] leading-relaxed shadow-inner border border-slate-800">
                {viewingTemplate.content}
              </pre>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button
                onClick={() => setViewingTemplate(null)}
                variant="primary"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl border border-slate-100 overflow-hidden animate-zoom-in">

            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingTemplate ? 'Modify Golden Template' : 'Add Golden Template'}
              </h3>
              <button
                onClick={() => { resetForm(); setIsModalOpen(false); }}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Relationship settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vendor *</label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-805 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Device Type *</label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-805 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
                    required
                  >
                    <option value="Switch">Switch</option>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model *</label>
                  <input
                    type="text"
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="e.g. WS-C3650-24TD-S"
                    required
                  />
                </div>
              </div>

              {/* Template settings */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Template Name *</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="e.g. Cisco_C3650_Standard"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Version *</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="e.g. 1.0.0"
                    required
                  />
                </div>
              </div>

              {/* Input Method Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Input Method *</label>
                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="inputMethod"
                      value="paste"
                      checked={inputMethod === 'paste'}
                      onChange={() => setInputMethod('paste')}
                      className="text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>Paste Jinja2 Template</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="inputMethod"
                      value="upload"
                      checked={inputMethod === 'upload'}
                      onChange={() => setInputMethod('upload')}
                      className="text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>Upload Config File</span>
                  </label>
                </div>
              </div>

              {/* Conditional Content Inputs */}
              {inputMethod === 'paste' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jinja2 Template Body *</label>
                  <textarea
                    rows={8}
                    value={pastedContent}
                    onChange={(e) => setPastedContent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono text-slate-805 focus:outline-none focus:border-cyan-500 leading-relaxed shadow-inner"
                    placeholder={`e.g.\nhostname {{ hostname }}\nip domain-name {{ domain_name }}\nntp server {{ ntp_server }}`}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select/Drag File *</label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${isDragActive ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-200 hover:border-cyan-400 bg-slate-50'
                      }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <FaCloudUploadAlt className="text-slate-400 text-2xl" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700">Click or drag template config here</p>
                      <p className="text-[9px] text-slate-400">Supports .txt, .cfg, .conf, .j2 files</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".txt,.cfg,.conf,.j2"
                    />
                  </div>

                  {/* Uploaded file indicator */}
                  {uploadedFile && (
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-[10px]">
                      <div className="flex items-center gap-2">
                        <FaFileAlt className="text-cyan-500" />
                        <span className="font-semibold text-slate-700 truncate max-w-[200px]">{uploadedFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="text-rose-500 hover:text-rose-600 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="secondary"
                  onClick={() => { resetForm(); setIsModalOpen(false); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                >
                  Save Template
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
