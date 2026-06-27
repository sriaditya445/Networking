
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FaFolder,
  FaCopy,
  FaCheck,
  FaSearch,
  FaFilter,
  FaSync,
  FaPlus,
  FaSlidersH,
  FaEye,
  FaFilePdf,
  FaFileAlt,
  FaSpinner,
  FaInfoCircle,
  FaChevronDown,
  FaTimes,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaCloudDownloadAlt,
  FaCloudUploadAlt
} from 'react-icons/fa';

// Vendor Logos Component
const VendorLogo = ({ vendor }) => {
  const v = vendor?.toLowerCase() || '';
  if (v.includes('cisco')) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-black text-[10px] tracking-tight border border-blue-200">
          CSCO
        </span>
        <span className="font-bold text-xs text-slate-800">Cisco</span>
      </div>
    );
  }
  if (v.includes('juniper')) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 font-black text-[10px] tracking-tight border border-emerald-200">
          JNPR
        </span>
        <span className="font-bold text-xs text-slate-800">Juniper</span>
      </div>
    );
  }
  if (v.includes('arista')) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 font-black text-[10px] tracking-tight border border-cyan-200">
          ARST
        </span>
        <span className="font-bold text-xs text-slate-800">Arista</span>
      </div>
    );
  }
  if (v.includes('fortinet')) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 text-rose-600 font-black text-[10px] tracking-tight border border-rose-200">
          FTNT
        </span>
        <span className="font-bold text-xs text-slate-800">Fortinet</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 text-slate-650 font-black text-[10px] tracking-tight border border-slate-200">
        {v.substring(0, 4).toUpperCase()}
      </span>
      <span className="font-bold text-xs text-slate-800 capitalize">{vendor}</span>
    </div>
  );
};

// Device Type Icons Component
const DeviceTypeIcon = ({ type }) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('switch')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-105 border border-slate-200 text-slate-600 text-[10px] font-bold">
        🎛️ Switch
      </span>
    );
  }
  if (t.includes('router')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-105 border border-slate-200 text-slate-600 text-[10px] font-bold">
        🌐 Router
      </span>
    );
  }
  if (t.includes('firewall')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-105 border border-slate-200 text-slate-600 text-[10px] font-bold">
        🔥 Firewall
      </span>
    );
  }
  if (t.includes('wlc') || t.includes('ap') || t.includes('wireless')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-105 border border-slate-200 text-slate-600 text-[10px] font-bold">
        📶 Wireless
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-105 border border-slate-200 text-slate-600 text-[10px] font-bold">
      💻 Generic
    </span>
  );
};

const DEFAULT_SECTIONS = [
  { value: "aaa", label: "AAA" },
  { value: "security", label: "Security" },
  { value: "dns", label: "DNS" },
  { value: "ntp", label: "NTP" },
  { value: "snmp", label: "SNMP" },
  { value: "logging", label: "Logging" },
  { value: "interfaces", label: "Interfaces" },
  { value: "high_availability", label: "High Availability" }
];

export default function ProcessingQueue({
  apiBaseUrl,
  setActiveTab,
  selectedUploadId,
  setSelectedUploadId,
  onViewDevice
}) {
  const [jobInfo, setJobInfo] = useState(null);
  const [groups, setGroups] = useState([]);
  const [devices, setDevices] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Loading States
  const [loadingJob, setLoadingJob] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [submittingAudit, setSubmittingAudit] = useState(false);

  // Tab State: "groups" | "devices"
  const [activeTabSub, setActiveTabSub] = useState("groups");

  // Filter & Search states
  const [groupSearch, setGroupSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("");
  const [deviceModelFilter, setDeviceModelFilter] = useState("");
  const [deviceTemplateFilter, setDeviceTemplateFilter] = useState("");
  const [devicePage, setDevicePage] = useState(1);
  const [devicePageSize, setDevicePageSize] = useState(10);

  // Modal States
  const [templateModalGroup, setTemplateModalGroup] = useState(null); // Selected group for template upload
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateFileInput, setTemplateFileInput] = useState(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  const [auditModalGroup, setAuditModalGroup] = useState(null); // Selected group for audit config
  const [auditModeOption, setAuditModeOption] = useState("Full Audit"); // "Full Audit" | "Selected Sections"
  const [selectedSectionsList, setSelectedSectionsList] = useState([]); // List of section keys

  // Copy status
  const [copiedId, setCopiedId] = useState(false);

  // File download indicator states
  const [deviceDlMap, setDeviceDlMap] = useState({});
  const [groupDlMap, setGroupDlMap] = useState({});
  const [showReportsDropdown, setShowReportsDropdown] = useState(false);
  const [showTopReportsDropdown, setShowTopReportsDropdown] = useState(false);

  const fileInputRef = useRef(null);

  // 1. Fetch Job Info
  const fetchJobInfo = async () => {
    if (!selectedUploadId) return;
    setLoadingJob(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}`);
      if (res.ok) {
        const data = await res.json();
        setJobInfo(data);
      }
    } catch (e) {
      console.error("fetchJobInfo error", e);
    } finally {
      setLoadingJob(false);
    }
  };

  // 2. Fetch Device Groups
  const fetchGroups = async () => {
    if (!selectedUploadId) return;
    setLoadingGroups(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}/groups`);
      if (res.ok) {
        const data = await res.json();
        // const incomingGroups = data.groups || [];

        // Merge with existing local audit selections in React state if they exist
        // setGroups(prev => {
        //   return incomingGroups.map(g => {
        //     const existing = prev.find(item => item.group_id === g.group_id);
        //     if (existing) {
        //       return {
        //         ...g,
        //         audit_mode: g.audit_mode || existing.audit_mode,
        //         selected_sections: g.selected_sections || existing.selected_sections
        //       };
        //     }
        //     return g;
        //   });
        // });
        setGroups(prev => {
          return data.groups.map(group => {
            const existing = prev.find(
              g => g.group_id === group.group_id
            );

            return {
              ...group,
              audit_mode: group.audit_mode || existing?.audit_mode,
              selected_sections:
                group.selected_sections?.length
                  ? group.selected_sections
                  : existing?.selected_sections || []
            };
          });
        });

      }
    } catch (e) {
      console.error("fetchGroups error", e);
    } finally {
      setLoadingGroups(false);
    }
  };

  // 3. Fetch Devices
  const fetchDevices = async () => {
    if (!selectedUploadId) return;
    setLoadingDevices(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/devices?upload_id=${selectedUploadId}`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data || []);
      }
    } catch (e) {
      console.error("fetchDevices error", e);
    } finally {
      setLoadingDevices(false);
    }
  };

  // 4. Fetch Templates list (for matching or reference)
  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) {
      console.error("fetchTemplates error", e);
    }
  };

  // Initial loading & polling
  useEffect(() => {
    if (selectedUploadId) {
      fetchJobInfo();
      fetchGroups();
      fetchDevices();
      fetchTemplates();
    }
  }, [selectedUploadId]);

  // Polling logic when job is active
  useEffect(() => {
    if (!selectedUploadId || auditModalGroup) return;
    let pollInterval = setInterval(() => {
      // Poll continuously if not completed or failed
      const shouldPoll = !jobInfo || (
        jobInfo.status !== 'COMPLETED' &&
        jobInfo.status !== 'FAILED'
      );

      if (shouldPoll) {
        fetchJobInfo();
        fetchGroups();
        fetchDevices();
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [selectedUploadId, jobInfo]);

  // Copy Upload ID helper
  const copyUploadId = () => {
    if (!selectedUploadId) return;
    navigator.clipboard.writeText(selectedUploadId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Format Dates
  const formatLongDate = (dateString) => {
    if (!dateString) return '—';
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

  // Get active step index based on job status
  const getActiveStep = () => {
    if (!jobInfo) return 1;
    switch (jobInfo.status) {
      case 'NEW':
      case 'PENDING_EXTRACTION':
        return 1;
      case 'ANALYZING_DEVICES':
        return 2;
      case 'WAITING_TEMPLATE_CREATION':
        return 3;
      case 'WAITING_AUDIT_SELECTION':
        return 4;
      case 'READY_FOR_AUDIT':
        return 4;
      case 'AUDIT_IN_PROGRESS':
        return 5;
      case 'COMPLETED':
      case 'FAILED':
        return 6;
      default:
        return 1;
    }
  };

  // Template Upload Modal Handler
  const openTemplateModal = (group) => {
    setTemplateModalGroup(group);
    setTemplateNameInput(`${group.vendor}_${group.device_type}_${group.model || 'GENERIC'}_Template`);
    setTemplateFileInput(null);
    setTemplateModalGroup(group);
  };

  const handleTemplateUploadSubmit = async (e) => {
    e.preventDefault();
    if (!templateFileInput || !templateNameInput.trim()) {
      alert("Please provide both a template name and template file.");
      return;
    }

    setUploadingTemplate(true);
    const formData = new FormData();
    formData.append("vendor", templateModalGroup.vendor);
    formData.append("device_type", templateModalGroup.device_type);
    formData.append("model", templateModalGroup.model || "");
    formData.append("template_name", templateNameInput.trim());
    formData.append("file", templateFileInput);

    try {
      const res = await fetch(`${apiBaseUrl}/api/templates/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setTemplateModalGroup(null);
        await fetchGroups();
        await fetchJobInfo();
        await fetchDevices();
      } else {
        const errorData = await res.json();
        alert(`Failed to upload template: ${errorData.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading template file.");
    } finally {
      setUploadingTemplate(false);
    }
  };

  // Audit Selection Modal Handler
  const openAuditModal = (group) => {
    setAuditModalGroup(group);
    setAuditModeOption(
      group.audit_mode === "selected_sections"
        ? "Selected Sections"
        : "Full Audit"
    );
    // Seed selected sections
    // if (group.selected_sections && group.selected_sections.length > 0) {
    //   setSelectedSectionsList(group.selected_sections);
    // } else {
    //   setSelectedSectionsList(group.available_sections || []);
    // }

    setSelectedSectionsList(group.selected_sections || []);
  };

  const handleAuditModalConfirm = () => {
    if (!auditModalGroup) return;

    const selectedAuditMode =
      auditModeOption === "Selected Sections"
        ? "selected_sections"
        : "full";
    const selectedSections = auditModeOption === "Full Audit" ? [] : selectedSectionsList;

    // Update React state immediately
    setGroups(prev =>
      prev.map(group =>
        group.group_id === auditModalGroup.group_id
          ? {
            ...group,
            audit_mode: selectedAuditMode,
            selected_sections: selectedSections
          }
          : group
      )
    );

    setAuditModalGroup(null);
  };

  // Trigger/Start Processing Audits
  const handleStartProcessing = async () => {
    if (!selectedUploadId || groups.length === 0) return;
    setSubmittingAudit(true);

    // Build all audit configurations payload. Default any unset group to Full Audit
    const selections = groups.map(g => ({
      group_id: g.group_id,
      audit_mode: g.audit_mode || "Full",
      selected_sections: g.selected_sections || []
    }));

    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}/audit-selection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections })
      });

      if (res.ok) {
        await fetchJobInfo();
        await fetchDevices();
      } else {
        const errorData = await res.json();
        alert(`Failed to start audit: ${errorData.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to initiate compliance audit.");
    } finally {
      setSubmittingAudit(false);
    }
  };

  // Download PDF Report for a single Device
  const handleDownloadDeviceReport = async (device) => {
    const devId = device.id || device._id;
    setDeviceDlMap(prev => ({ ...prev, [devId]: 'downloading' }));

    try {
      const res = await fetch(`${apiBaseUrl}/api/audit/reports/${device.audit_report_id}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${device.device_name}_audit_report.pdf`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 1000);
        
        setDeviceDlMap(prev => ({ ...prev, [devId]: 'done' }));
      } else {
        alert("Failed to download PDF report.");
        setDeviceDlMap(prev => ({ ...prev, [devId]: 'idle' }));
      }
    } catch (e) {
      console.error(e);
      alert("Error downloading report.");
      setDeviceDlMap(prev => ({ ...prev, [devId]: 'idle' }));
    }
  };

  // Download PDF Report for a whole Group
  const handleDownloadGroupReport = async (group) => {
    const gId = group.group_id;
    setGroupDlMap(prev => ({ ...prev, [gId]: 'downloading' }));

    try {
      const encodedGroupId = encodeURIComponent(gId);
      const res = await fetch(`${apiBaseUrl}/api/groups/${encodedGroupId}/report/pdf?upload_id=${selectedUploadId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${group.vendor}_${group.device_type}_${group.model || 'GENERIC'}_group_report.pdf`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 1000);

        setGroupDlMap(prev => ({ ...prev, [gId]: 'done' }));
      } else {
        alert("Failed to download Group PDF.");
        setGroupDlMap(prev => ({ ...prev, [gId]: 'idle' }));
      }
    } catch (e) {
      console.error(e);
      alert("Error downloading report.");
      setGroupDlMap(prev => ({ ...prev, [gId]: 'idle' }));
    }
  };

  // Download Excel Report for a single Device
  const handleDownloadDeviceExcelReport = async (device) => {
    const devId = device.id || device._id;
    try {
      const res = await fetch(`${apiBaseUrl}/api/audit/reports/${device.audit_report_id}/excel`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${device.device_name}_audit_report.xlsx`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 1000);
      } else {
        alert("Failed to download Excel report.");
      }
    } catch (e) {
      console.error(e);
      alert("Error downloading Excel report.");
    }
  };

  // Download Excel Report for a whole Group
  const handleDownloadGroupExcelReport = async (group) => {
    const gId = group.group_id;
    try {
      const encodedGroupId = encodeURIComponent(gId);
      const res = await fetch(`${apiBaseUrl}/api/groups/${encodedGroupId}/report/excel?upload_id=${selectedUploadId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${group.vendor}_${group.device_type}_${group.model || 'GENERIC'}_group_report.xlsx`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 1000);
      } else {
        alert("Failed to download Group Excel.");
      }
    } catch (e) {
      console.error(e);
      alert("Error downloading Group Excel.");
    }
  };

  // Download Complete Upload PDF Report
  const handleDownloadUploadPDFReport = async () => {
    if (!selectedUploadId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}/report/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${jobInfo?.folder_name || 'upload'}_complete_audit_report.pdf`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 1000);
      } else {
        alert("Failed to download Complete Upload PDF Report.");
      }
    } catch (e) {
      console.error(e);
      alert("Error downloading report.");
    }
  };

  // Download Complete Upload Excel Report
  const handleDownloadUploadExcelReport = async () => {
    if (!selectedUploadId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}/report/excel`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${jobInfo?.folder_name || 'upload'}_complete_audit_report.xlsx`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 1000);
      } else {
        alert("Failed to download Complete Upload Excel Report.");
      }
    } catch (e) {
      console.error(e);
      alert("Error downloading report.");
    }
  };

  // Download ZIP file of all uploaded configurations
  const handleDownloadUploadZip = async () => {
    if (!selectedUploadId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${jobInfo?.folder_name || 'upload'}_configurations.zip`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 1000);
      } else {
        alert("Failed to download ZIP file.");
      }
    } catch (e) {
      console.error(e);
      alert("Error downloading ZIP file.");
    }
  };

  // Filter Logic - Device Groups
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const vendorName = g.vendor || "";
      const modelName = g.model || "";
      const typeName = g.device_type || "";
      const query = groupSearch.toLowerCase();
      return vendorName.toLowerCase().includes(query) ||
        modelName.toLowerCase().includes(query) ||
        typeName.toLowerCase().includes(query);
    });
  }, [groups, groupSearch]);

  // Filter Logic - Devices
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch = !deviceSearch ||
        d.device_name?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
        d.vendor?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
        d.model?.toLowerCase().includes(deviceSearch.toLowerCase());

      const matchesType = !deviceTypeFilter || d.device_type === deviceTypeFilter;
      const matchesModel = !deviceModelFilter || d.model === deviceModelFilter;
      const matchesTemplate = !deviceTemplateFilter || d.template_status === deviceTemplateFilter;

      return matchesSearch && matchesType && matchesModel && matchesTemplate;
    });
  }, [devices, deviceSearch, deviceTypeFilter, deviceModelFilter, deviceTemplateFilter]);

  // Paginated Devices
  const paginatedDevices = useMemo(() => {
    const start = (devicePage - 1) * devicePageSize;
    return filteredDevices.slice(start, start + devicePageSize);
  }, [filteredDevices, devicePage, devicePageSize]);

  const deviceTotalPages = Math.ceil(filteredDevices.length / devicePageSize) || 1;
  const deviceStartIndex = (devicePage - 1) * devicePageSize;

  // Form validations for Templates and Audit mode configuration
  const templatesMissingCount = groups.filter(g => !g.template_id).length;
  const auditSelectionsPending = groups.filter(g => !g.audit_mode).length;
  const isAuditCompleted = groups.length > 0 && jobInfo && jobInfo.status === "COMPLETED";

  // Pagination range helper to truncate long lists of pages
  const getPaginationRange = (current, total) => {
    const range = [];
    const delta = 2; // Number of pages to show before and after current page

    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  // Render Status Badge helper
  const renderJobStatusBadge = (status) => {
    switch (status) {
      case 'WAITING_TEMPLATE_CREATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">
            <FaClock className="text-[10px]" />
            <span>Waiting Template Creation</span>
          </span>
        );
      case 'WAITING_AUDIT_SELECTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-655 border border-orange-200">
            <FaClock className="text-[10px]" />
            <span>Waiting Audit Selection</span>
          </span>
        );
      case 'READY_FOR_AUDIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
            <FaCheckCircle className="text-[10px]" />
            <span>Ready for Audit</span>
          </span>
        );
      case 'AUDIT_IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 animate-pulse">
            <FaSpinner className="animate-spin text-[10px]" />
            <span>Audit In Progress</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
            <FaCheckCircle className="text-[10px]" />
            <span>Completed</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-250">
            <FaExclamationTriangle className="text-[10px]" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  if (!selectedUploadId) {
    return (
      <div className="w-full py-16 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-center gap-4 pb-12">
        <FaInfoCircle className="text-4xl text-slate-300" />
        <div>
          <h3 className="font-bold text-slate-700">No batch selected</h3>
          <p className="text-xs text-slate-450 mt-1">Please select an upload batch from the Upload History to view its queue details.</p>
        </div>
        <button
          onClick={() => setActiveTab('upload')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition"
        >
          Go To Upload Center
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-200">

      {/* 1. Header Details Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-sm border border-blue-105">
                <FaFolder />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <span>{jobInfo?.folder_name || 'Loading Folder...'}</span>
                </h2>
                {/* <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {selectedUploadId}
                  </span>
                  <button
                    onClick={copyUploadId}
                    className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded transition"
                    title="Copy Upload ID"
                  >
                    {copiedId ? <FaCheck className="text-emerald-500 text-[10px]" /> : <FaCopy className="text-[10px]" />}
                  </button>
                </div> */}
              </div>
              <div className="md:ml-2">
                {renderJobStatusBadge(jobInfo?.status)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuditCompleted && (
              <div className="relative">
                <button
                  onClick={() => setShowTopReportsDropdown(!showTopReportsDropdown)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 transition"
                  title="View Audit Reports"
                >
                  <FaFileAlt />
                  <span>View Reports</span>
                  <FaChevronDown className={`text-[10px] transition-transform ${showTopReportsDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showTopReportsDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-150 rounded-2xl shadow-xl z-35 p-4 space-y-4 text-left font-semibold text-slate-700">
                    {/* Complete Upload Report Section */}
                    <div className="space-y-2 border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Complete Upload Report</span>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDownloadUploadPDFReport}
                          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center text-[10px] font-bold transition flex justify-center items-center gap-1.5"
                          title="Download PDF"
                        >
                          <FaFilePdf /> PDF
                        </button>
                        <button
                          onClick={handleDownloadUploadExcelReport}
                          className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-center text-[10px] font-bold transition flex justify-center items-center gap-1.5"
                          title="Download Excel"
                        >
                          <FaFileAlt /> Excel
                        </button>
                      </div>
                    </div>

                    
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleDownloadUploadZip}
              className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition"
              title="Download Upload Folder ZIP"
            >
              <FaCloudDownloadAlt className="text-slate-500" />
              <span>Download</span>
            </button>
            <button
              onClick={() => {
                setSelectedUploadId("");
                setActiveTab('upload');
              }}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition"
            >
              View Uploads
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px] mb-0.5">Uploaded By</span>
            <span className="font-bold text-slate-700 capitalize">{jobInfo?.created_by || 'system'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px] mb-0.5">Uploaded On</span>
            <span className="font-bold text-slate-700">{formatLongDate(jobInfo?.created_at)}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px] mb-0.5">Total Devices</span>
            <span className="font-bold text-slate-750">{jobInfo?.total_devices || 0} configurations</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px] mb-0.5">Device Groups</span>
            <span className="font-bold text-slate-750">{groups.length} distinct groups</span>
          </div>
        </div>
      </div>

      {/* 2. Stepper Component */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center flex-wrap md:flex-nowrap gap-4 md:gap-0">
          {[
            { step: 1, label: "Upload", desc: "Configuration upload" },
            { step: 2, label: "Device Discovery", desc: "Vendor & Model extraction" },
            { step: 3, label: "Templates", desc: "Golden templates config" },
            { step: 4, label: "Audit Selection", desc: "Scope configurations" },
            { step: 5, label: "Processing", desc: "Rule analysis" },
            { step: 6, label: "Reports", desc: "Compliance reports" }
          ].map((item, idx) => {
            const activeStep = getActiveStep();
            const isCompleted = activeStep > item.step || (item.step === 3 && templatesMissingCount === 0) || (item.step === 6 && isAuditCompleted);
            const isActive = activeStep === item.step;

            return (
              <React.Fragment key={item.step}>
                <div className="flex items-center gap-3 relative z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all border-2
                    ${isCompleted
                        ? 'bg-emerald-500 border-emerald-505 text-white'
                        : isActive
                          ? 'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-50'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                  >
                    {isCompleted ? <FaCheck className="text-[10px]" /> : item.step}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold leading-tight ${isActive ? 'text-blue-650' : 'text-slate-800'}`}>
                      {item.label}
                    </h4>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5 hidden md:block">
                      {item.desc}
                    </p>
                  </div>
                </div>
                {idx < 5 && (
                  <div className={`hidden md:block flex-1 h-0.5 mx-4 transition-all duration-500
                    ${isCompleted ? 'bg-emerald-500' : 'bg-slate-100'}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. Dual Tabs */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm pb-1 flex gap-6">
        <button
          onClick={() => setActiveTabSub("groups")}
          className={`pb-3 pt-1 text-sm font-bold border-b-2 transition-all px-2 ${activeTabSub === "groups"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
        >
          Device Groups ({groups.length})
        </button>
        <button
          onClick={() => setActiveTabSub("devices")}
          className={`pb-3 pt-1 text-sm font-bold border-b-2 transition-all px-2 ${activeTabSub === "devices"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
        >
          Devices ({devices.length})
        </button>
      </div>

      {/* Tab: Groups Content */}
      {activeTabSub === "groups" && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          {/* Controls */}
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="relative max-w-xs w-full">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">
                <FaSearch />
              </span>
              <input
                aria-label="Search groups"
                type="text"
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                placeholder="Search groups..."
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl py-2 px-3 pl-9 text-xs text-slate-700 font-semibold focus:outline-none transition"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchGroups}
                disabled={loadingGroups}
                className="p-2.5 border border-slate-205 rounded-xl hover:bg-slate-50 transition text-slate-650"
                title="Refresh Groups"
              >
                <FaSync className={loadingGroups ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Device Type</th>
                  <th className="px-5 py-3">Model</th>
                  <th className="px-5 py-3">Devices</th>
                  <th className="px-5 py-3">Template</th>
                  <th className="px-5 py-3">Template Status</th>
                  <th className="px-5 py-3">Audit Mode</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {loadingGroups && groups.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                      <FaSpinner className="animate-spin text-lg text-blue-505 mx-auto mb-2" />
                      <span>Loading groups...</span>
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                      <span>No groups match your search criteria.</span>
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((g) => {
                    const dlState = groupDlMap[g.group_id] || 'idle';

                    return (
                      <tr key={g.group_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <VendorLogo vendor={g.vendor} />
                        </td>
                        <td className="px-5 py-4">
                          <DeviceTypeIcon type={g.device_type} />
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-slate-650">
                          {g.model || 'GENERIC'}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 w-7 h-7 rounded-full text-xs font-bold font-mono">
                            {g.device_count}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 max-w-[150px] truncate">
                          {g.template_name || '—'}
                        </td>
                        <td className="px-5 py-4">
                          {g.template_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Selected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                              Template Required
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {g.audit_mode === "selected_sections" ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                                Selected Sections ({g.selected_sections?.length || 0})
                              </span>

                              <button
                                onClick={() => openAuditModal(g)}
                                className="text-[10px] text-blue-600 hover:underline font-bold"
                              >
                                [View]
                              </button>
                            </div>
                          ) : g.audit_mode === "full" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Full Audit
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {isAuditCompleted ? (
                              // <button
                              //   onClick={() => handleDownloadGroupReport(g)}
                              //   disabled={dlState === 'downloading'}
                              //   className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-xl text-[10px] shadow transition"
                              // >
                              //   {dlState === 'downloading' ? <FaSpinner className="animate-spin" /> : <FaFilePdf />}
                              //   <span>PDF</span>
                              // </button>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleDownloadGroupReport(g)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-xl text-[10px]"
                                >
                                  PDF
                                </button>

                                <button
                                  onClick={() => handleDownloadGroupExcelReport(g)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-[10px]"
                                >
                                  XLSX
                                </button>
                              </div>
                            ) : g.template_id ? (
                              <button
                                onClick={() => openAuditModal(g)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-205 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-[10px] shadow-sm transition"
                              >
                                <FaSlidersH />
                                <span>Configure Audit</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => openTemplateModal(g)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-[10px] shadow transition"
                              >
                                <FaPlus />
                                <span>Add Template</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Stepper bottom action area */}
          {!isAuditCompleted && groups.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-150 mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-bold">
              {templatesMissingCount > 0 ? (
                <div className="flex items-center gap-2 text-rose-600">
                  <FaExclamationTriangle className="text-sm shrink-0" />
                  <span>Please add templates for all groups to proceed.</span>
                </div>
              ) : auditSelectionsPending > 0 ? (
                <div className="flex items-center gap-2 text-amber-600">
                  <FaInfoCircle className="text-sm shrink-0" />
                  <span>Complete audit mode selection for all groups to enable processing.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600">
                  <FaCheckCircle className="text-sm shrink-0" />
                  <span>All groups are ready. Click 'Start Processing' to begin audit.</span>
                </div>
              )}

              <button
                onClick={handleStartProcessing}
                disabled={templatesMissingCount > 0 || auditSelectionsPending > 0 || submittingAudit}
                className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2 text-white
                  ${templatesMissingCount > 0 || auditSelectionsPending > 0 || submittingAudit
                    ? 'bg-slate-350 cursor-not-allowed shadow-none opacity-60'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10'
                  }`}
              >
                {submittingAudit ? <FaSpinner className="animate-spin text-xs" /> : null}
                <span>Start Processing</span>
              </button>
            </div>
          )}

          {isAuditCompleted && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-150 mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-bold relative">
              <div className="flex items-center gap-2 text-emerald-600">
                <FaCheckCircle className="text-sm shrink-0" />
                <span>Audit processing is completed. Compliance reports are ready.</span>
              </div>

              
            </div>
          )}
        </div>
      )}

      {/* Tab: Devices Content */}
      {activeTabSub === "devices" && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          {/* Controls & Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">
                  <FaSearch />
                </span>
                <input
                  aria-label="Search devices"
                  type="text"
                  value={deviceSearch}
                  onChange={e => setDeviceSearch(e.target.value)}
                  placeholder="Search devices by hostname, type..."
                  className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-202 focus:border-blue-500 rounded-xl py-2 px-3 pl-9 text-xs text-slate-700 font-semibold focus:outline-none transition shadow-inner"
                />
              </div>

              {/* Filters */}
              <select
                aria-label="Filter by Device Type"
                value={deviceTypeFilter}
                onChange={e => { setDeviceTypeFilter(e.target.value); setDevicePage(1); }}
                className="bg-slate-50 border border-slate-205 rounded-xl py-2 px-3 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                <option value="">All Device Types</option>
                {Array.from(new Set(devices.map(d => d.device_type))).filter(Boolean).map(type => (
                  <option key={type} value={type}>{type.toUpperCase()}</option>
                ))}
              </select>

              <select
                aria-label="Filter by Device Model"
                value={deviceModelFilter}
                onChange={e => { setDeviceModelFilter(e.target.value); setDevicePage(1); }}
                className="bg-slate-50 border border-slate-205 rounded-xl py-2 px-3 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                <option value="">All Models</option>
                {Array.from(new Set(devices.map(d => d.model))).filter(Boolean).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>

              <select
                aria-label="Filter by Template Status"
                value={deviceTemplateFilter}
                onChange={e => { setDeviceTemplateFilter(e.target.value); setDevicePage(1); }}
                className="bg-slate-50 border border-slate-205 rounded-xl py-2 px-3 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                <option value="">Template Status</option>
                <option value="SELECTED">Template Loaded</option>
                <option value="TEMPLATE_REQUIRED">Template Missing</option>
              </select>

              <button
                onClick={fetchDevices}
                disabled={loadingDevices}
                className="p-2.5 border border-slate-205 rounded-xl hover:bg-slate-50 transition text-slate-650"
                title="Refresh Devices"
              >
                <FaSync className={loadingDevices ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Device Name</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Model</th>
                  <th className="px-5 py-3">Template Status</th>
                  <th className="px-5 py-3">Audit Score</th>
                  <th className="px-5 py-3">Audit Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {loadingDevices && devices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                      <FaSpinner className="animate-spin text-lg text-blue-505 mx-auto mb-2" />
                      <span>Loading devices inventory...</span>
                    </td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                      <span>No devices found matching the filters.</span>
                    </td>
                  </tr>
                ) : (
                  paginatedDevices.map((d) => {
                    const devId = d.id || d._id;
                    const dlState = deviceDlMap[devId] || 'idle';

                    // Compliance Score render
                    let scoreBadge = <span className="text-slate-450 font-normal">—</span>;
                    if (d.audit_score !== null && d.audit_score !== undefined) {
                      const score = Math.round(d.audit_score);
                      const colorClass = score >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : score >= 50
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200';
                      scoreBadge = (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${colorClass}`}>
                          {score}%
                        </span>
                      );
                    }

                    // Render device status badge
                    let statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 border border-slate-200">
                        {d.display_status || d.processing_status || 'Unknown'}
                      </span>
                    );
                    if (d.display_status === 'COMPLETED' || d.processing_status === 'SUCCESS') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <FaCheckCircle className="text-[9px]" /> Completed
                        </span>
                      );
                    } else if (d.display_status === 'TEMPLATE_REQUIRED') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                          <FaExclamationTriangle className="text-[9px]" /> Waiting for Template
                        </span>
                      );
                    } else if (d.display_status === 'READY_FOR_AUDIT') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-705 border border-blue-200">
                          Ready for Audit
                        </span>
                      );
                    } else if (d.display_status === 'AUDIT_IN_PROGRESS' || d.display_status === 'RUNNING') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-yellow-50 text-yellow-750 border border-yellow-250">
                          <FaSpinner className="animate-spin text-[9px]" /> Auditing...
                        </span>
                      );
                    }

                    return (
                      <tr key={devId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-805">
                          {d.device_name}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-600 uppercase text-[10px]">
                          {d.vendor || '—'}
                        </td>
                        <td className="px-5 py-4 capitalize text-slate-500 font-medium">
                          {d.device_type || '—'}
                        </td>
                        <td className="px-5 py-4 font-mono text-[11px] text-slate-650">
                          {d.model || '—'}
                        </td>
                        <td className="px-5 py-4">
                          {d.template_status === 'SELECTED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Template Loaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-705 border border-rose-200">
                              Template Missing
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {scoreBadge}
                        </td>
                        <td className="px-5 py-4">
                          {statusBadge}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => onViewDevice(d)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-205 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-[10px] shadow-sm transition"
                            >
                              <FaEye />
                              <span>View Config</span>
                            </button>
                            {d.display_status === 'COMPLETED' && d.audit_report_id ? (
                              <>
                                <button
                                  onClick={() => handleDownloadDeviceReport(d)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px]"
                                >
                                  <FaFilePdf />
                                  <span>PDF</span>
                                </button>

                                <button
                                  onClick={() => handleDownloadDeviceExcelReport(d)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px]"
                                >
                                  <FaFileAlt />
                                  <span>XLSX</span>
                                </button>
                              </>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-150 text-slate-400 font-bold rounded-xl text-[10px] cursor-not-allowed"
                              >
                                <FaFilePdf />
                                <span>No Report</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Device List Pagination */}
          {filteredDevices.length > 0 && (
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs font-bold text-slate-550">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  aria-label="Select device page size"
                  value={devicePageSize}
                  onChange={e => { setDevicePageSize(Number(e.target.value)); setDevicePage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs text-slate-700 focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>entries</span>
                <span className="ml-2 font-medium text-slate-400">
                  (showing {deviceStartIndex + 1} to {Math.min(deviceStartIndex + devicePageSize, filteredDevices.length)} of {filteredDevices.length})
                </span>
              </div>

              {deviceTotalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={devicePage === 1}
                    onClick={() => setDevicePage(p => Math.max(p - 1, 1))}
                    className="p-2 border border-slate-205 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <FaChevronLeft className="text-[10px]" />
                  </button>
                  {getPaginationRange(devicePage, deviceTotalPages).map((page, idx) => {
                    if (page === '...') {
                      return (
                        <span key={`dots-${idx}`} className="w-7 h-7 flex items-center justify-center font-bold text-slate-400 select-none">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setDevicePage(page)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold transition border ${devicePage === page
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'border-slate-200 hover:bg-slate-55 text-slate-700'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    disabled={devicePage === deviceTotalPages}
                    onClick={() => setDevicePage(p => Math.min(p + 1, deviceTotalPages))}
                    className="p-2 border border-slate-205 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <FaChevronRight className="text-[10px]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: Add Template Modal Overlay ── */}
      {templateModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Add Template for {templateModalGroup.vendor} | {templateModalGroup.device_type}</h3>
              <button
                onClick={() => setTemplateModalGroup(null)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-50 transition"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleTemplateUploadSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150 text-[11px]">
                <div>
                  <span className="text-slate-450 block text-[9px] uppercase font-bold mb-0.5">Vendor</span>
                  <span className="font-bold text-slate-800">{templateModalGroup.vendor}</span>
                </div>
                <div>
                  <span className="text-slate-455 block text-[9px] uppercase font-bold mb-0.5">Device Type</span>
                  <span className="font-bold text-slate-800 capitalize">{templateModalGroup.device_type}</span>
                </div>
                <div>
                  <span className="text-slate-455 block text-[9px] uppercase font-bold mb-0.5">Model</span>
                  <span className="font-bold text-slate-800 font-mono">{templateModalGroup.model || 'GENERIC'}</span>
                </div>
              </div>

              {/* Template Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="modal-template-name" className="text-slate-500 font-bold block">Template Name</label>
                <input
                  id="modal-template-name"
                  type="text"
                  value={templateNameInput}
                  onChange={e => setTemplateNameInput(e.target.value)}
                  placeholder="e.g. CiscoSwitch_Generic_Template"
                  className="w-full bg-slate-50 border border-slate-205 focus:border-blue-500 rounded-xl py-2 px-3 text-slate-700 font-semibold focus:outline-none focus:bg-white transition"
                  required
                />
              </div>

              {/* File Input Zone */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold block">Template File (.jinja2, .txt, .cfg)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-202 hover:border-blue-500 rounded-xl py-6 text-center cursor-pointer bg-slate-50 hover:bg-slate-50/20 transition flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-sm">
                    <FaCloudUploadAlt />
                  </div>
                  {templateFileInput ? (
                    <span className="font-bold text-slate-800 text-[11px] truncate max-w-[200px]">
                      {templateFileInput.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">
                      Select or drag template file here
                    </span>
                  )}
                  <input
                    aria-label="Upload template file"
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={e => setTemplateFileInput(e.target.files?.[0] || null)}
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTemplateModalGroup(null)}
                  className="px-4 py-2 border border-slate-205 bg-white text-slate-700 hover:bg-slate-50 font-bold rounded-xl shadow-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingTemplate || !templateFileInput}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadingTemplate ? <FaSpinner className="animate-spin text-xs" /> : null}
                  <span>Add Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Select Audit Sections Modal Overlay ── */}
      {auditModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Select Audit Sections — {auditModalGroup.vendor} {auditModalGroup.model || 'GENERIC'}
              </h3>
              <button
                onClick={() => setAuditModalGroup(null)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-50 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Audit Mode Toggle Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                onClick={() => setAuditModeOption("Full Audit")}
                className={`border rounded-2xl p-4 flex gap-3 cursor-pointer transition-all hover:shadow-sm
                ${auditModeOption === "Full Audit"
                    ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                    : 'border-slate-205 hover:border-slate-300 bg-white'
                  }`}
              >
                <input
                  aria-label="Full Compliance Audit Option"
                  type="radio"
                  name="auditModeOption"
                  checked={auditModeOption === "Full Audit"}
                  onChange={() => { }}
                  className="mt-1 accent-blue-600 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-slate-800 block">Full Compliance Audit</span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Perform complete compliance check against all sections configured in the template.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setAuditModeOption("Selected Sections")}
                className={`border rounded-2xl p-4 flex gap-3 cursor-pointer transition-all hover:shadow-sm
                ${auditModeOption === "Selected Sections"
                    ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                    : 'border-slate-205 hover:border-slate-300 bg-white'
                  }`}
              >
                <input
                  aria-label="Selected Sections Compliance Audit Option"
                  type="radio"
                  name="auditModeOption"
                  checked={auditModeOption === "Selected Sections"}
                  onChange={() => { }}
                  className="mt-1 accent-blue-600 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-slate-800 block">Selected Sections</span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Pick specific configuration areas to audit (e.g., AAA, SNMP, Security).
                  </span>
                </div>
              </label>
            </div>

            {/* Sections Checkboxes (Only shown if Selected Sections is selected) */}
            {auditModeOption === "Selected Sections" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Available Configuration Sections</span>
                  <button
                    onClick={() => {
                      const all = auditModalGroup.available_sections?.length > 0
                        ? auditModalGroup.available_sections
                        : DEFAULT_SECTIONS.map(s => s.value);
                      if (selectedSectionsList.length === all.length) {
                        setSelectedSectionsList([]);
                      } else {
                        setSelectedSectionsList(all);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-750 font-bold hover:underline"
                  >
                    {selectedSectionsList.length === (auditModalGroup.available_sections?.length || DEFAULT_SECTIONS.length)
                      ? 'Deselect All'
                      : 'Select All'
                    }
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(auditModalGroup.available_sections?.length > 0
                    ? auditModalGroup.available_sections.map(val => ({ value: val, label: val.toUpperCase() }))
                    : DEFAULT_SECTIONS
                  ).map((section) => {
                    const isChecked = selectedSectionsList.includes(section.value);
                    return (
                      <label
                        key={section.value}
                        className={`border rounded-xl p-3 flex items-center gap-2.5 cursor-pointer transition-all hover:bg-slate-50/50
                        ${isChecked
                            ? 'border-blue-300 bg-blue-50/20'
                            : 'border-slate-200 bg-white'
                          }`}
                      >
                        <input
                          aria-label={`Select ${section.label} section`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedSectionsList(prev => prev.filter(s => s !== section.value));
                            } else {
                              setSelectedSectionsList(prev => [...prev, section.value]);
                            }
                          }}
                          className="accent-blue-600 cursor-pointer"
                        />
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">
                          {section.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAuditModalGroup(null)}
                className="px-4 py-2 border border-slate-205 bg-white text-slate-750 hover:bg-slate-50 font-bold rounded-xl shadow-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAuditModalConfirm}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition"
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}