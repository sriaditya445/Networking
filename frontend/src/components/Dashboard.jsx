import React, { useState, useEffect } from 'react';
import {
  FaCloudUploadAlt, FaLaptopCode, FaCheckCircle, FaExclamationTriangle,
  FaHistory, FaEye, FaDownload, FaNetworkWired, FaServer, FaFileCode,
  FaTasks, FaCog, FaFileAlt, FaShieldAlt, FaClock, FaCheck, FaTimes,
  FaPlay, FaFilePdf, FaHdd, FaLink, FaArrowRight, FaEllipsisV,
  FaHourglassHalf, FaExclamationCircle, FaBookOpen
} from 'react-icons/fa';
import { useAuditStore } from '../store/auditStore';
import { useVendorStore } from '../store/vendorStore';
import { countDevicesByType } from "../utils/deviceUtils";

// Reusable SVG Donut Chart Component
const DonutChart = ({ data, size = 130, strokeWidth = 3.5, totalLabel = "Total", totalValue = "" }) => {
  const total = data.reduce((sum, item) => sum + (item.count || 0), 0) || 1;
  let cumulativePercent = 0;

  return (
    <div className="relative flex items-center justify-center shrink-0 animate-fade-in" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 36 36" className="transform -rotate-90 origin-center w-full h-full">
        {/* Base empty circle */}
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {data.map((item, idx) => {
          const percent = ((item.count || 0) / total) * 100;
          if (percent === 0) return null;
          const strokeDasharray = `${percent} ${100 - percent}`;
          const strokeDashoffset = -cumulativePercent;
          cumulativePercent += percent;

          return (
            <circle
              key={idx}
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 hover:stroke-[4px] cursor-pointer"
            />
          );
        })}
      </svg>
      <div className="absolute text-center flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-extrabold text-slate-800 leading-none">
          {totalValue}
        </span>
        {totalLabel && (
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            {totalLabel}
          </span>
        )}
      </div>
    </div>
  );
};

// Date Formatter helper
const formatUploadedOn = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return `Today, ${timeStr}`;
  } else if (diffDays <= 1 && date.getDate() === new Date(now - 86400000).getDate()) {
    return `Yesterday, ${timeStr}`;
  } else {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  }
};

function Dashboard({
  stats,
  jobs = [],
  devices = [],
  templates = [],
  auditResults = [],
  reports = [],
  onViewDevice,
  setActiveTab,
  apiBaseUrl,
  setSelectedUploadId,
  setSelectedFolderName,
  lastUpdated
}) {
  const { vendors = [] } = useVendorStore() || {};

  // Normalize parameters
  const safeDevices = Array.isArray(devices) ? devices : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const safeVendors = Array.isArray(vendors) ? vendors : [];
  const safeStats = stats || {};
  const dbAuditResults = Array.isArray(auditResults) ? auditResults : [];
  const reportsCount = Array.isArray(reports) ? reports.length : 0;

  // Dual mode: if the database has no devices, run mockup mode to match the mockup exactly.
  const isDemoMode = safeDevices.length === 0;

  // Stat computations matching the mockup values in demo mode, and live data in real mode
  const totalUploads = isDemoMode ? 2 : (safeStats.total_uploads || 0);
  const totalDevices = isDemoMode ? 193 : (safeDevices.length || safeStats.total_devices || 0);

  // Audited completed count (SUCCESS or FAILED audit statuses)
  const auditsCompleted = isDemoMode ? 500 : dbAuditResults.length;

  const passedCount = isDemoMode ? 0 : dbAuditResults.filter(r => r.overall_score >= 90).length;
  const warningCount = isDemoMode ? 3 : dbAuditResults.filter(r => r.overall_score >= 70 && r.overall_score < 90).length;
  const failedCount = isDemoMode ? 497 : dbAuditResults.filter(r => r.overall_score < 70).length;

  const complianceScore = isDemoMode ? 0 : (auditsCompleted > 0 ? Math.round((passedCount / auditsCompleted) * 100) : 100);

  // Queue counts (using display_status dynamically to resolve the database count issues)
  const queueWaiting = isDemoMode ? 0 : safeDevices.filter(d => ['PENDING', 'TEMPLATE_REQUIRED', 'WAITING_AUDIT_SELECTION', 'READY_FOR_AUDIT'].includes(d.display_status)).length;
  const queueRunning = isDemoMode ? 0 : safeDevices.filter(d => ['DEVICE_ANALYSIS_IN_PROGRESS', 'AUDIT_IN_PROGRESS'].includes(d.display_status)).length;
  const queueCompleted = isDemoMode ? 0 : safeDevices.filter(d => d.display_status === 'COMPLETED').length;
  const queueFailed = isDemoMode ? 0 : safeDevices.filter(d => d.display_status === 'FAILED').length;
  const pendingCount = queueWaiting + queueRunning;

  const reportsGenerated = auditsCompleted;

  // Template count
  const totalTemplates = isDemoMode ? 42 : safeTemplates.length;
  const missingTemplatesCount = isDemoMode ? 0 : safeDevices.filter(d => d.template_status !== 'SELECTED').length;
  const mappedDevices = totalDevices - missingTemplatesCount;

  // Device type counts
  const counts = countDevicesByType(safeDevices);
  const devTypes = [
    { label: "L2 Switches", key: "L2 Switch", color: "#3b82f6" },
    { label: "L3 Switches", key: "L3 Switch", color: "#8b5cf6" },
    { label: "Routers", key: "Router", color: "#06b6d4" },
    { label: "Firewalls", key: "Firewall", color: "#f97316" },
    { label: "Wireless Controllers", key: "WLC", color: "#ec4899" },
    { label: "Access Points", key: "Access Point", color: "#14b8a6" },
    { label: "Unknown", key: "Unknown", color: "#64748b" }
  ];

  const devChartData = isDemoMode ? [
    { label: "L2 Switches", count: 170, color: "#3b82f6", percentage: 88 },
    { label: "L3 Switches", count: 0, color: "#8b5cf6", percentage: 0 },
    { label: "Routers", count: 0, color: "#06b6d4", percentage: 0 },
    { label: "Firewalls", count: 0, color: "#f97316", percentage: 0 },
    { label: "Wireless Controllers", count: 23, color: "#ec4899", percentage: 12 },
    { label: "Access Points", count: 0, color: "#14b8a6", percentage: 0 },
    { label: "Unknown", count: 0, color: "#64748b", percentage: 0 }
  ] : devTypes.map(t => {
    const count = counts[t.key] || (t.key === "Unknown" ? counts["Generic"] || 0 : 0);
    const pct = totalDevices > 0 ? (count / totalDevices * 100) : 0;
    return {
      label: t.label,
      count,
      color: t.color,
      percentage: pct
    };
  });

  // Recent Uploads Table data mapping
  const recentUploadsData = isDemoMode ? [
    { id: 1, folder_name: "WLC RunConfig", devices_count: "-", status: "WAITING AUDIT", uploaded_at: "Yesterday, 11:09 AM" },
    { id: 2, folder_name: "ROW", devices_count: 0, status: "COMPLETED", uploaded_at: "Jun 28, 05:47 AM" }
  ] : safeJobs.slice(0, 3).map(job => {
    let statusText = "COMPLETED";
    if (job.status === 'pending' || job.status === 'processing' || job.status === 'PENDING_EXTRACTION' || job.status === 'ANALYZING_DEVICES') {
      statusText = "PARSING";
    } else if (job.status === 'failed' || job.status === 'FAILED') {
      statusText = "FAILED";
    } else if (job.status === 'READY_FOR_AUDIT' || job.status === 'WAITING_AUDIT_SELECTION') {
      statusText = "WAITING AUDIT";
    } else if (job.status === 'AUDIT_IN_PROGRESS') {
      statusText = "AUDITING";
    }
    return {
      id: job._id || job.id,
      folder_name: job.folder_name || 'Unnamed',
      devices_count: job.total_devices !== undefined ? job.total_devices : (job.files_count || 0),
      status: statusText,
      uploaded_at: job.created_at ? formatUploadedOn(job.created_at) : 'N/A',
      rawJob: job
    };
  });

  // Recent Audits Table data mapping (Failed audits in the mockup)
  const recentAuditsData = isDemoMode ? [
    { id: 1, device_name: "COGMEXSANJAL123SW", status: "FAILED", compliance: "42%", completed_on: "Yesterday, 11:07 AM" },
    { id: 2, device_name: "COGCANMISSIASW03", status: "FAILED", compliance: "54%", completed_on: "Yesterday, 11:07 AM" },
    { id: 3, device_name: "COGUSNEWNYC889SW", status: "FAILED", compliance: "54%", completed_on: "Yesterday, 11:07 AM" }
  ] : dbAuditResults.slice(0, 3).map(res => {
    let statusText = "FAILED";
    if (res.overall_score >= 90) {
      statusText = "PASSED";
    } else if (res.overall_score >= 70) {
      statusText = "WARNING";
    }
    return {
      id: res.id || res._id,
      device_name: res.device_name || 'Unknown Device',
      status: statusText,
      compliance: `${Math.round(res.overall_score)}%`,
      completed_on: res.created_at ? formatUploadedOn(res.created_at) : 'N/A',
      rawAudit: res
    };
  });

  // Recent Activities mapping (No more undefined device counts!)
  const recentActivitiesData = isDemoMode ? [
    { id: 1, time: "11:09 AM", text: "Template mapping completed: WLC RunConfig", subtext: "24 devices mapped successfully", type: "purple" },
    { id: 2, time: "11:09 AM", text: "Upload completed: WLC RunConfig", subtext: "24 configuration files processed", type: "warning" },
    { id: 3, time: "11:07 AM", text: "Audit completed: ROW (169 devices)", subtext: "Compliance: 0%", type: "success" },
    { id: 4, time: "05:47 AM", text: "Template mapping completed: ROW", subtext: "169 devices mapped successfully", type: "purple" },
    { id: 5, time: "05:47 AM", text: "Upload completed: ROW", subtext: "169 configuration files processed", type: "warning" }
  ] : (() => {
    const list = [];
    safeJobs.slice(0, 3).forEach(job => {
      if (!job) return;
      const timeStr = job.created_at ? new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      
      list.push({
        id: `act-upload-${job._id || job.id}`,
        time: timeStr,
        text: `Upload completed: ${job.folder_name}`,
        subtext: `${job.total_devices || job.files_count || 0} configuration files processed`,
        type: "warning",
        timestamp: job.created_at ? new Date(job.created_at).getTime() : 0
      });
      
      if (job.status !== 'NEW' && job.status !== 'PENDING_EXTRACTION' && job.status !== 'ANALYZING_DEVICES') {
        list.push({
          id: `act-template-${job._id || job.id}`,
          time: timeStr,
          text: `Template mapping completed: ${job.folder_name}`,
          subtext: `${job.total_devices || job.files_count || 0} devices mapped successfully`,
          type: "purple",
          timestamp: job.created_at ? new Date(job.created_at).getTime() + 1000 : 0
        });
      }
      
      if (job.status === 'AUDIT_IN_PROGRESS') {
        list.push({
          id: `act-audit-start-${job._id || job.id}`,
          time: timeStr,
          text: `Audit started: ${job.folder_name} (${job.total_devices || job.files_count || 0} devices)`,
          subtext: null,
          type: "info",
          timestamp: job.updated_at ? new Date(job.updated_at).getTime() : 0
        });
      }
      
      if (job.status === 'COMPLETED' || job.status === 'completed' || job.status === 'success') {
        const compliance = job.total_devices > 0 ? Math.round((job.audit_success_count / job.total_devices) * 100) : 0;
        list.push({
          id: `act-audit-end-${job._id || job.id}`,
          time: job.updated_at ? new Date(job.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : timeStr,
          text: `Audit completed: ${job.folder_name} (${job.total_devices || job.files_count || 0} devices)`,
          subtext: `Compliance: ${compliance}%`,
          type: "success",
          timestamp: job.updated_at ? new Date(job.updated_at).getTime() : 0
        });
      }
    });
    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  })();

  // Navigation handlers
  const handleViewJob = (row) => {
    if (isDemoMode) {
      alert(`Viewing config folder ${row.folder_name} (Demo mode)`);
      setActiveTab('inventory');
      return;
    }
    setSelectedUploadId(row.id);
    setSelectedFolderName(row.folder_name);
    setActiveTab('queue');
  };

  const handleDownloadJob = (e, row) => {
    e.stopPropagation();
    if (isDemoMode) {
      alert(`Downloading demo config ZIP for folder ${row.folder_name}...`);
      return;
    }
    const downloadUrl = `${apiBaseUrl}/api/uploads/${row.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  const handleViewDeviceByName = (deviceName) => {
    if (isDemoMode) {
      const mockDevice = {
        device_name: deviceName,
        device_type: "Switch",
        vendor: "Cisco",
        model: "WS-C3850-24T",
        config_content: `! Demo Configuration for ${deviceName}\nversion 15.2\nhostname ${deviceName}\ninterface GigabitEthernet1/0/1\n switchport mode access\n switchport access vlan 10\n!`
      };
      onViewDevice(mockDevice);
      return;
    }
    const device = safeDevices.find(d => d && (d.device_name === deviceName || d.hostname === deviceName));
    if (device) {
      onViewDevice(device);
    } else {
      alert(`Device details for ${deviceName} not available in staged database.`);
    }
  };

  const handleDownloadReport = async (row) => {
    if (isDemoMode) {
      const element = document.createElement("a");
      const file = new Blob([`Enterprise Network Audit Report\nDevice: ${row.device_name}\nStatus: ${row.status}\nComplianceScore: ${row.compliance}\nCompleted At: ${row.completed_on}\n\nAll policy rules parsed.`], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${row.device_name}_audit_report.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      return;
    }

    if (row.rawAudit && (row.rawAudit._id || row.rawAudit.id)) {
      const auditResultId = row.rawAudit._id || row.rawAudit.id;
      try {
        const response = await fetch(`${apiBaseUrl}/api/audit/reports`);
        if (response.ok) {
          const reports = await response.json();
          const report = reports.find(r => r.audit_result_id === auditResultId);
          if (report) {
            window.open(`${apiBaseUrl}/api/audit/reports/${report.id || report._id}/pdf`, '_blank');
            return;
          }
        }
      } catch (err) {
        console.error("Error looking up backend report:", err);
      }
    }
    alert(`Could not find a generated audit report for ${row.device_name} in database.`);
  };

  // Timeline Step Renderer
  const renderStep = (index, label, subtext, status, IconComponent) => {
    let bubbleClass = "";
    let textClass = "text-slate-500";
    let subtextClass = "text-slate-400 font-bold";
    let iconClass = "";
    
    if (status === 'completed') {
      bubbleClass = "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.25)]";
      textClass = "text-slate-800 font-bold";
      subtextClass = "text-emerald-600 font-bold uppercase";
      iconClass = "text-white";
    } else if (status === 'active') {
      bubbleClass = "bg-blue-600 border-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.25)]";
      textClass = "text-blue-600 font-extrabold";
      subtextClass = "text-blue-600 font-bold uppercase animate-pulse";
      iconClass = "text-white";
    } else if (status === 'warning') {
      bubbleClass = "bg-amber-500 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)]";
      textClass = "text-amber-600 font-bold";
      subtextClass = "text-amber-600 font-bold uppercase";
      iconClass = "text-white";
    } else {
      bubbleClass = "bg-white border-slate-200 text-slate-400";
      textClass = "text-slate-450 font-bold";
      subtextClass = "text-slate-400 font-bold uppercase";
      iconClass = "text-slate-400";
    }
    
    return (
      <div className="flex flex-col items-center text-center z-10 w-full min-w-[100px] group transition-all">
        <div className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 ${bubbleClass}`}>
          <IconComponent className={`text-base ${iconClass}`} />
        </div>
        <span className={`text-[11px] mt-2.5 block ${textClass}`}>{label}</span>
        <span className={`text-[9px] mt-1 block tracking-tight ${subtextClass}`}>
          {subtext}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* KPI Cards Row (6 columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Uploads */}
        <div
          onClick={() => setActiveTab('upload')}
          className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-base group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
              <FaCloudUploadAlt />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Uploads</span>
            <span className="text-xl font-extrabold text-slate-800 block mt-0.5">{totalUploads}</span>
            <span className="text-[9px] text-emerald-600 font-bold mt-1.5 block">
              ↑ 100% vs yesterday
            </span>
          </div>
        </div>

        {/* Total Devices */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
              <FaServer />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Devices</span>
            <span className="text-xl font-extrabold text-slate-800 block mt-0.5">{totalDevices}</span>
            <span className="text-[9px] text-emerald-600 font-bold mt-1.5 block">
              ↑ 12% vs yesterday
            </span>
          </div>
        </div>

        {/* Audits Completed */}
        <div
          onClick={() => setActiveTab('queue')}
          className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-base group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
              <FaCheckCircle />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Audits Completed</span>
            <span className="text-xl font-extrabold text-slate-800 block mt-0.5">{auditsCompleted}</span>
            <span className="text-[9px] text-emerald-600 font-bold mt-1.5 block">
              ↑ 8% vs yesterday
            </span>
          </div>
        </div>

        {/* Compliance Score */}
        <div
          onClick={() => setActiveTab('audit_dashboard')}
          className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center text-base group-hover:bg-blue-650 group-hover:text-white transition-all shadow-sm">
              <FaShieldAlt />
            </div>
            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Excellent
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Compliance Score</span>
            <span className="text-xl font-extrabold text-slate-800 block mt-0.5">{complianceScore}%</span>
            <span className="text-[9px] text-slate-400 font-bold mt-1.5 block">
              — No change
            </span>
          </div>
        </div>

        {/* Pending Audits */}
        <div
          onClick={() => setActiveTab('queue')}
          className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-base group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
              <FaClock />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending Audits</span>
            <span className="text-xl font-extrabold text-slate-800 block mt-0.5">{pendingCount}</span>
            <span className="text-[9px] text-emerald-600 font-bold mt-1.5 block">
              ↓ 100% vs yesterday
            </span>
          </div>
        </div>

        {/* Reports Generated */}
        <div
          onClick={() => setActiveTab('downloads')}
          className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-base group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm">
              <FaFileAlt />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Reports Generated</span>
            <span className="text-xl font-extrabold text-slate-800 block mt-0.5">{reportsGenerated}</span>
            <span className="text-[9px] text-emerald-600 font-bold mt-1.5 block">
              ↑ 15% vs yesterday
            </span>
          </div>
        </div>
      </div>

      {/* Audit Workflow Progress Timeline */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-slate-800 font-extrabold text-xs mb-6 uppercase tracking-wider font-mono">
          Audit Workflow Progress
        </h3>

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 px-4">
          {/* Progress Connecting Line matching the step statuses exactly */}
          <div className="absolute top-[22px] left-[8%] right-[8%] h-[3px] bg-slate-100 rounded-full hidden md:flex z-0 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ 
                width: isDemoMode ? '50%' : 
                       (auditsCompleted === totalDevices && totalDevices > 0) ? '100%' :
                       (auditsCompleted > 0) ? '80%' : '40%' 
              }} 
            />
            {isDemoMode && (
              <div className="h-full bg-blue-500 animate-pulse" style={{ width: '30%' }} />
            )}
          </div>

          {/* Step 1: Upload */}
          {renderStep(1, "Upload", `${totalUploads} Completed`, totalUploads > 0 ? 'completed' : 'pending', FaCloudUploadAlt)}

          {/* Step 2: Discovery */}
          {renderStep(2, "Discovery", `${totalDevices} Completed`, totalDevices > 0 ? 'completed' : 'pending', FaNetworkWired)}

          {/* Step 3: Template Mapping */}
          {renderStep(3, "Template Mapping", 
            totalDevices > 0 && missingTemplatesCount === 0 ? `${totalDevices} Completed` : 
            totalDevices > 0 ? `${mappedDevices} Mapped` : (isDemoMode ? "193 Completed" : "Pending"), 
            (isDemoMode || (totalDevices > 0 && missingTemplatesCount === 0)) ? 'completed' : 
            totalDevices > 0 ? 'warning' : 'pending',
            FaBookOpen
          )}

          {/* Step 4: Audit Execution */}
          {renderStep(4, "Audit Execution", 
            isDemoMode ? "Pending" :
            queueRunning > 0 || (auditsCompleted > 0 && auditsCompleted < totalDevices) ? `In Progress (${Math.round((auditsCompleted / totalDevices) * 100)}%)` :
            auditsCompleted === totalDevices && totalDevices > 0 ? `${auditsCompleted} Completed` : "Pending",
            isDemoMode ? 'pending' :
            (queueRunning > 0 || (auditsCompleted > 0 && auditsCompleted < totalDevices)) ? 'active' :
            (auditsCompleted === totalDevices && totalDevices > 0) ? 'completed' : 'pending',
            FaCog
          )}

          {/* Step 5: Report Generation */}
          {renderStep(5, "Report Generation", 
            isDemoMode ? "In Progress" :
            auditsCompleted === totalDevices && totalDevices > 0 ? `${reportsGenerated} Completed` :
            auditsCompleted > 0 ? "In Progress" : "Pending",
            isDemoMode ? 'active' :
            (auditsCompleted === totalDevices && totalDevices > 0) ? 'completed' :
            (auditsCompleted > 0) ? 'active' : 'pending',
            FaFileAlt
          )}

          {/* Step 6: Reports Available */}
          {renderStep(6, "Reports Available", 
            isDemoMode ? "Pending" :
            auditsCompleted === totalDevices && totalDevices > 0 ? "Available" : "Pending",
            (!isDemoMode && auditsCompleted === totalDevices && totalDevices > 0) ? 'completed' : 'pending',
            FaCheckCircle
          )}
        </div>
      </div>

      {/* Middle Section (Compliance Overview, Device Distribution, Audit Queue Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Compliance Overview */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-2">
              Compliance Overview
            </h3>
            <div className="flex items-center gap-6 py-4">
              <DonutChart
                data={[
                  { count: passedCount, color: "#10b981" },
                  { count: warningCount, color: "#f59e0b" },
                  { count: failedCount, color: "#f43f5e" }
                ]}
                totalLabel="Compliance"
                totalValue={`${complianceScore}%`}
              />

              <div className="flex-1 space-y-2 text-xs font-semibold text-slate-650">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Passed</span>
                  <span className="font-mono text-slate-800">{passedCount} ({auditsCompleted > 0 ? Math.round(passedCount / auditsCompleted * 100) : 0}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Warning</span>
                  <span className="font-mono text-slate-800">{warningCount} ({auditsCompleted > 0 ? Math.round(warningCount / auditsCompleted * 100) : 0}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Failed</span>
                  <span className="font-mono text-slate-800">{failedCount} ({auditsCompleted > 0 ? Math.round(failedCount / auditsCompleted * 100) : 0}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#f0f4ff] border border-blue-100 rounded-xl px-4 py-2 mt-2 text-center text-xs font-bold text-blue-700 flex items-center justify-between shadow-sm">
            <span>Total Evaluated</span>
            <span>{auditsCompleted} Devices</span>
          </div>
        </div>

        {/* Card 2: Device Distribution */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-2">
              Device Distribution
            </h3>
            
            <div className="space-y-2.5 py-3">
              {devChartData.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    <span>{item.label}</span>
                    <span className="font-mono text-slate-800 font-extrabold">{item.count} ({Math.round(item.percentage)}%)</span>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                    <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: item.color, width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#f0f4ff] border border-blue-100 rounded-xl px-4 py-2 text-center text-xs font-bold text-blue-700 flex items-center justify-between shadow-sm">
            <span>Total Discovered</span>
            <span>{totalDevices} Devices</span>
          </div>
        </div>

        {/* Card 3: Audit Queue Summary */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-2">
              Audit Queue Summary
            </h3>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[#f0f4ff]/50 border border-blue-100 rounded-xl p-3.5 flex justify-between items-center shadow-sm min-h-[68px]">
                <div className="flex flex-col justify-between h-full">
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Waiting</span>
                  <span className="text-lg font-extrabold text-blue-800 mt-1">{queueWaiting}</span>
                </div>
                <FaHourglassHalf className="text-blue-500/30 text-base shrink-0" />
              </div>

              <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3.5 flex justify-between items-center shadow-sm min-h-[68px]">
                <div className="flex flex-col justify-between h-full">
                  <span className="text-[10px] text-orange-650 font-bold uppercase tracking-wider">Running</span>
                  <span className="text-lg font-extrabold text-orange-700 mt-1">{queueRunning}</span>
                </div>
                <FaPlay className="text-orange-500/30 text-sm shrink-0" />
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 flex justify-between items-center shadow-sm min-h-[68px]">
                <div className="flex flex-col justify-between h-full">
                  <span className="text-[10px] text-emerald-650 font-bold uppercase tracking-wider">Completed</span>
                  <span className="text-lg font-extrabold text-emerald-700 mt-1">{queueCompleted}</span>
                </div>
                <FaCheckCircle className="text-emerald-500/30 text-base shrink-0" />
              </div>

              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 flex justify-between items-center shadow-sm min-h-[68px]">
                <div className="flex flex-col justify-between h-full">
                  <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Failed</span>
                  <span className="text-lg font-extrabold text-rose-700 mt-1">{queueFailed}</span>
                </div>
                <FaExclamationCircle className="text-rose-500/30 text-base shrink-0" />
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('queue')}
            className="w-full mt-4 py-2.5 bg-blue-650 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-98"
          >
            <span>Go to Processing Queue</span>
            <FaArrowRight className="text-[9px]" />
          </button>
        </div>
      </div>

      {/* Bottom Section (Recent Uploads, Recent Audits, Recent Activities) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Uploads Table */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[300px] relative overflow-hidden">
          <div className="z-10 relative">
            <h3 className="text-slate-800 font-extrabold text-xs border-b border-slate-100 pb-3 flex items-center gap-2 font-mono uppercase tracking-wider">
              <FaHistory className="text-slate-400 text-xs" />
              <span>Recent Uploads</span>
            </h3>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-slate-450 font-extrabold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-2">Folder Name</th>
                    <th className="pb-2">Devices</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Uploaded On</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold">
                  {recentUploadsData.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td
                        onClick={() => handleViewJob(row)}
                        className="py-3 text-slate-800 font-extrabold cursor-pointer hover:underline max-w-[100px] truncate"
                      >
                        <div className="flex items-center gap-1.5">
                          <FaHdd className="text-slate-400 shrink-0 text-[10px]" />
                          <span>{row.folder_name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-500 font-mono">{row.devices_count}</td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wide ${
                          row.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          row.status === 'FAILED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          row.status === 'PARSING' || row.status === 'AUDITING' ? 'bg-blue-50 text-blue-650 border border-blue-100 animate-pulse' :
                          'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-450 font-mono font-bold">{row.uploaded_at}</td>
                      <td className="py-3 text-right flex justify-end gap-1.5 items-center">
                        <button
                          onClick={() => handleViewJob(row)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold rounded-lg transition-colors text-[10px] cursor-pointer"
                        >
                          Open
                        </button>
                        <button
                          onClick={(e) => handleDownloadJob(e, row)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                          title="Download ZIP"
                        >
                          <FaEllipsisV className="text-[10px] text-slate-350" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-right z-10 relative">
            <button
              onClick={() => setActiveTab('upload')}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 ml-auto group cursor-pointer"
            >
              <span>View all uploads</span>
              <FaArrowRight className="text-[9px] transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Recent Audits Table */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[300px] relative overflow-hidden">
          <div className="z-10 relative">
            <h3 className="text-slate-800 font-extrabold text-xs border-b border-slate-100 pb-3 flex items-center gap-2 font-mono uppercase tracking-wider">
              <FaShieldAlt className="text-slate-400 text-xs" />
              <span>Recent Audits</span>
            </h3>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-slate-450 font-extrabold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-2">Device / Group</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Compliance</th>
                    <th className="pb-2">Completed On</th>
                    <th className="pb-2 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold">
                  {recentAuditsData.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td
                        onClick={() => handleViewDeviceByName(row.device_name)}
                        className="py-3 text-slate-800 font-extrabold cursor-pointer hover:underline truncate max-w-[100px]"
                      >
                        {row.device_name}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 font-bold text-[10px] ${
                          row.status === 'PASSED' ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100' :
                          row.status === 'WARNING' ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100' : 
                          'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100'
                        }`}>
                          {row.status === 'PASSED' ? '✓ Passed' :
                           row.status === 'WARNING' ? '! Warning' : '✗ Failed'}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-700">{row.compliance}</td>
                      <td className="py-3 text-slate-450 font-mono font-bold">{row.completed_on}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDownloadReport(row)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg border border-transparent hover:border-blue-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Download report"
                        >
                          <FaDownload className="text-[11px]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-right z-10 relative">
            <button
              onClick={() => setActiveTab('audit_dashboard')}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 ml-auto group cursor-pointer"
            >
              <span>View all audits</span>
              <FaArrowRight className="text-[9px] transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Recent Activities timeline */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[300px] relative overflow-hidden">
          <div className="z-10 relative">
            <h3 className="text-slate-800 font-extrabold text-xs border-b border-slate-100 pb-3 flex items-center gap-2 font-mono uppercase tracking-wider">
              <FaClock className="text-slate-400 text-xs" />
              <span>Recent Activities</span>
            </h3>

            <div className="mt-4 space-y-4">
              {recentActivitiesData.map(activity => (
                <div key={activity.id} className="flex gap-3 text-xs font-bold">
                  <span className="text-[10px] text-slate-400 font-mono w-[60px] shrink-0 mt-0.5">
                    {activity.time}
                  </span>

                  {/* Activity Dot indicator */}
                  <div className="relative flex flex-col items-center">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      activity.type === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                      activity.type === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                      activity.type === 'danger' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                      activity.type === 'purple' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' :
                      'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                    }`} />
                    <div className="w-0.5 bg-slate-100 flex-1 min-h-[25px] absolute top-4 bottom-0" />
                  </div>

                  <div className="flex-1 flex flex-col gap-0.5">
                    <span className="text-slate-700 leading-none block font-extrabold">
                      {activity.text}
                    </span>
                    {activity.subtext && (
                      <span className="text-[10px] text-slate-400 font-bold font-mono">
                        {activity.subtext}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-right z-10 relative">
            <button
              onClick={() => setActiveTab('queue')}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 ml-auto group cursor-pointer"
            >
              <span>View all activities</span>
              <FaArrowRight className="text-[9px] transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
