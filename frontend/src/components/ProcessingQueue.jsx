import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FaShieldAlt,
  FaFilter,
  FaServer,
  FaSpinner,
  FaInfoCircle,
  FaCheckCircle,
  FaFilePdf,
  FaPlay,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronRight,
  FaLayerGroup,
  FaBolt,
  FaClipboardList,
  FaLock,
  FaTachometerAlt,
  FaWifi,
  FaKey,
  FaNetworkWired,
  FaDownload,
  FaEye
} from 'react-icons/fa';

const AUDIT_MODE_OPTIONS = [
  { value: 'full', label: 'Full Compliance', icon: FaClipboardList, color: 'cyan' },
  { value: 'security', label: 'Security', icon: FaLock, color: 'rose' },
  { value: 'performance', label: 'Performance', icon: FaTachometerAlt, color: 'amber' },
  { value: 'wireless', label: 'Wireless', icon: FaWifi, color: 'violet' },
  { value: 'aaa', label: 'AAA', icon: FaKey, color: 'orange' },
  { value: 'dns', label: 'Network Services', icon: FaNetworkWired, color: 'teal' },
];





const SECTION_LABELS = {
  aaa: "AAA",
  security: "Security",
  dns: "DNS",
  ntp: "NTP",
  snmp: "SNMP",
  logging: "Logging",
  layer3: "Layer 3",
  interfaces: "Interfaces",
  high_availability: "High Availability"
};

const COLOR_MAP = {
  cyan: { pill: 'bg-cyan-50 text-cyan-700 border-cyan-200', ring: 'ring-cyan-400', dot: 'bg-cyan-500' },
  rose: { pill: 'bg-rose-50 text-rose-700 border-rose-200', ring: 'ring-rose-400', dot: 'bg-rose-500' },
  amber: { pill: 'bg-amber-50 text-amber-700 border-amber-200', ring: 'ring-amber-400', dot: 'bg-amber-500' },
  violet: { pill: 'bg-violet-50 text-violet-700 border-violet-200', ring: 'ring-violet-400', dot: 'bg-violet-500' },
  orange: { pill: 'bg-orange-50 text-orange-700 border-orange-200', ring: 'ring-orange-400', dot: 'bg-orange-500' },
  teal: { pill: 'bg-teal-50 text-teal-700 border-teal-200', ring: 'ring-teal-400', dot: 'bg-teal-500' },
};

function GroupAuditModeSelector({ groupId, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {AUDIT_MODE_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const c = COLOR_MAP[opt.color];
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(groupId, opt.value)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all
              ${active
                ? `${c.pill} ring-1 ${c.ring} shadow-sm`
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
          >
            <Icon className="text-[9px]" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function TemplateStatusBadge({ status }) {
  if (status === 'TEMPLATE_REQUIRED' || status === 'Waiting for Template') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <FaExclamationTriangle className="text-[8px]" />
        Waiting for Template
      </span>
    );
  }
  if (status === 'READY' || status === 'Template Ready') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <FaCheckCircle className="text-[8px]" />
        Template Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
      {status || 'Unknown'}
    </span>
  );
}

export default function ProcessingQueue({
  jobs,
  handleDeleteJob,
  formatDate,
  renderStatusBadge,
  apiBaseUrl,
  setActiveTab,
  selectedUploadId,
  setSelectedUploadId,
  setOnTemplateUploadSuccess,
  onViewDevice
}) {
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Per-group state maps: { [groupId]: value }
  const [groupTemplateMap, setGroupTemplateMap] = useState({});   // selected template id
  const [groupAuditModeMap, setGroupAuditModeMap] = useState({}); // selected audit mode
  const [groupAuditStatus, setGroupAuditStatus] = useState({}); // Pending | Running | Completed
  const [groupReportMap, setGroupReportMap] = useState({}); // { id, templateName, ... }
  const [groupDownloadMap, setGroupDownloadMap] = useState({}); // Pending | Downloaded

  const [savingTemplate, setSavingTemplate] = useState({});     // { [groupId]: bool }
  const [runningGroups, setRunningGroups] = useState({});     // { [groupId]: bool }
  const [expandedGroups, setExpandedGroups] = useState({});

  const [runAllLoading, setRunAllLoading] = useState(false);
  const pollRef = useRef(null);

  // Device list states
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceDownloadMap, setDeviceDownloadMap] = useState({});
  const [devSearch, setDevSearch] = useState('');
  const [devGroupFilter, setDevGroupFilter] = useState('');
  const [devStatusFilter, setDevStatusFilter] = useState('');
  const [devCurrentPage, setDevCurrentPage] = useState(1);
  const [devPageSize, setDevPageSize] = useState(10);
  const [viewTab, setViewTab] = useState("groups");

  useEffect(() => {
    if (!selectedUploadId && jobs.length > 0) {
      const latestUpload = jobs[0];

      setSelectedUploadId(
        latestUpload._id || latestUpload.id
      );
    }
  }, [jobs, selectedUploadId]);

  const fetchDevices = async (uploadId) => {
    if (!uploadId) { setDevices([]); return; }
    setLoadingDevices(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/devices?upload_id=${uploadId}`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data || []);
      }
    } catch (e) {
      console.error('fetchDevices error', e);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchDevices(selectedUploadId);
    setDevSearch('');
    setDevStatusFilter('');
    setDevCurrentPage(1);
  }, [selectedUploadId]);


  useEffect(() => {
    let devPoll = null;
    const hasRunning = devices.some(d =>
      d.display_status === 'AUDIT_IN_PROGRESS' ||
      d.display_status === 'DEVICE_ANALYSIS_IN_PROGRESS' ||
      d.display_status === 'RUNNING' ||
      d.display_status === 'PENDING'
    );
    if (hasRunning && selectedUploadId) {
      devPoll = setInterval(() => {
        fetchDevices(selectedUploadId);
      }, 3000);
    }
    return () => {
      if (devPoll) clearInterval(devPoll);
    };
  }, [devices, selectedUploadId]);

  useEffect(() => {
    if (!devices.length || !groups.length) return;

    const statusUpdates = {};
    const reportUpdates = {};

    groups.forEach(group => {

      const completedDevice = devices.find(
        d =>
          d.group_id === group.group_id &&
          d.display_status === 'COMPLETED'
      );

      if (completedDevice) {

        statusUpdates[group.group_id] = 'Completed';

        reportUpdates[group.group_id] = {
          id: completedDevice.audit_report_id
        };
      }
    });

    if (Object.keys(statusUpdates).length > 0) {

      setGroupAuditStatus(prev => ({
        ...prev,
        ...statusUpdates
      }));

      setGroupReportMap(prev => ({
        ...prev,
        ...reportUpdates
      }));
    }

  }, [devices, groups]);

  const handleDownloadDevicePDF = async (device) => {
    const devId = device.id || device._id;
    setDeviceDownloadMap(prev => ({ ...prev, [devId]: 'Downloading' }));
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
        a.remove();
        URL.revokeObjectURL(url);
        setDeviceDownloadMap(prev => ({ ...prev, [devId]: 'Downloaded' }));
      } else {
        alert('Failed to download PDF.');
        setDeviceDownloadMap(prev => ({ ...prev, [devId]: 'Pending' }));
      }
    } catch (e) {
      alert('Error downloading PDF.');
      setDeviceDownloadMap(prev => ({ ...prev, [devId]: 'Pending' }));
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setDevCurrentPage(1);
  }, [devSearch, devStatusFilter, devGroupFilter]);

  // Filtered devices memo
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch =
        !devSearch ||
        d.device_name?.toLowerCase().includes(devSearch.toLowerCase()) ||
        d.vendor?.toLowerCase().includes(devSearch.toLowerCase()) ||
        d.model?.toLowerCase().includes(devSearch.toLowerCase());

      const matchesStatus =
        !devStatusFilter ||
        d.display_status === devStatusFilter;

      const matchesGroup =
        !devGroupFilter ||
        d.group_id === devGroupFilter;

      return matchesSearch && matchesStatus && matchesGroup;
    });
  }, [
    devices,
    devSearch,
    devStatusFilter,
    devGroupFilter
  ]);

  // Paginated devices memo
  const paginatedDevices = useMemo(() => {
    const start = (devCurrentPage - 1) * devPageSize;
    return filteredDevices.slice(start, start + devPageSize);
  }, [filteredDevices, devCurrentPage, devPageSize]);

  const devTotalPages = Math.ceil(filteredDevices.length / devPageSize) || 1;

  // ── Fetch templates ───────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/templates`)
      .then(r => r.ok ? r.json() : [])
      .then(setTemplates)
      .catch(() => { });
  }, []);

  // ── Fetch groups whenever upload selection changes ────────────────────
  const fetchGroups = async (uploadId) => {
    if (!uploadId) { setGroups([]); return; }
    setLoadingGroups(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${uploadId}/groups`);
      if (res.ok) {
        const data = await res.json();
        const g = data.groups || [];
        setGroups(g);

        // Seed local maps from server data
        const tmplMap = {};
        const modeMap = {};
        const statusMap = {};
        const reportMap = {};
        const dlMap = {};

        g.forEach(grp => {
          tmplMap[grp.group_id] = grp.template_id || '';
          modeMap[grp.group_id] = grp.audit_mode || 'full';
          statusMap[grp.group_id] = grp.template_status === 'READY'
            ? (grp.audit_mode ? 'Pending' : 'Pending')
            : 'Pending';
        });

        // Merge existing report/download state (don't overwrite if polling already set)
        setGroupTemplateMap(prev => ({ ...tmplMap, ...prev }));
        setGroupAuditModeMap(prev => ({ ...modeMap, ...prev }));
        setGroupAuditStatus(prev => ({ ...statusMap, ...prev }));
        setGroupReportMap(prev => ({ ...reportMap, ...prev }));
        setGroupDownloadMap(prev => ({ ...dlMap, ...prev }));
      }
    } catch (e) {
      console.error('fetchGroups error', e);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchGroups(selectedUploadId);
  }, [selectedUploadId]);

  // ── Auto-match template for a group ──────────────────────────────────
  const autoMatchTemplate = (group) =>
    templates.find(t =>
      t.vendor?.toLowerCase() === group.vendor?.toLowerCase() &&
      t.device_type?.toLowerCase() === group.device_type?.toLowerCase() &&
      (t.model || '').toLowerCase() === (group.model || '').toLowerCase()
    );

  // ── Get verified template for a group ──────────────────────────────────
  const getGroupTemplate = (group) => {
    const tmplId = groupTemplateMap[group.group_id] || group.template_id || '';
    let selectedTemplate = tmplId
      ? templates.find(t => (t._id || t.id) === tmplId)
      : autoMatchTemplate(group);

    if (selectedTemplate && (
      selectedTemplate.vendor?.toLowerCase() !== group.vendor?.toLowerCase() ||
      selectedTemplate.device_type?.toLowerCase() !== group.device_type?.toLowerCase()
    )) {
      selectedTemplate = undefined;
    }
    return selectedTemplate;
  };

  // ── Assign template to group ──────────────────────────────────────────
  const handleAssignTemplate = async (groupId, templateId) => {
    setGroupTemplateMap(prev => ({ ...prev, [groupId]: templateId }));
    setSavingTemplate(prev => ({ ...prev, [groupId]: true }));
    try {
      await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}/groups/${encodeURIComponent(groupId)}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId || null }),
      });
      // Refresh groups to get updated template_status
      await fetchGroups(selectedUploadId);
    } catch (e) {
      console.error('assign template error', e);
    } finally {
      setSavingTemplate(prev => ({ ...prev, [groupId]: false }));
    }
  };

  // ── Change audit mode for a group ────────────────────────────────────
  const handleAuditModeChange = (groupId, mode) => {
    setGroupAuditModeMap(prev => ({ ...prev, [groupId]: mode }));
  };

  // ── Run audit for a single group ─────────────────────────────────────
  const handleRunGroupAudit = async (group) => {
    const groupId = group.group_id;
    const templateId = groupTemplateMap[groupId];
    const auditMode = groupAuditModeMap[groupId] || 'full';

    if (!templateId) {
      alert('Please assign a template before running the audit.');
      return;
    }

    setRunningGroups(prev => ({ ...prev, [groupId]: true }));
    setGroupAuditStatus(prev => ({ ...prev, [groupId]: 'Running' }));

    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${selectedUploadId}/audit-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: [{
            group_id: group.group_id,
            audit_mode: auditMode,
            selected_sections: [],
          }],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to start audit: ${err.detail || 'Unknown error'}`);
        setRunningGroups(prev => ({ ...prev, [groupId]: false }));
        setGroupAuditStatus(prev => ({ ...prev, [groupId]: 'Pending' }));
        return;
      }

      startGroupPolling(groupId);
      setTimeout(() => fetchDevices(selectedUploadId), 500);
    } catch (e) {
      console.error('runGroupAudit error', e);
      setRunningGroups(prev => ({ ...prev, [groupId]: false }));
      setGroupAuditStatus(prev => ({ ...prev, [groupId]: 'Pending' }));
    }
  };

  // ── Run all ready groups ──────────────────────────────────────────────
  const handleRunAll = async () => {
    const readyGroups = groups.filter(
      g =>
        (g.template_status === 'READY' ||
          groupTemplateMap[g.group_id]) &&
        groupAuditStatus[g.group_id] !== 'Completed'
    );

    if (!readyGroups.length) {
      alert('No groups have templates assigned yet.');
      return;
    }

    setRunAllLoading(true);

    try {
      const payload = {
        selections: readyGroups.map(group => ({
          group_id: group.group_id,
          audit_mode: groupAuditModeMap[group.group_id] || 'full',
          selected_sections: [],
        }))
      };

      const res = await fetch(
        `${apiBaseUrl}/api/uploads/${selectedUploadId}/audit-selection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(JSON.stringify(data));
        return;
      }

      readyGroups.forEach(g => {
        setGroupAuditStatus(prev => ({
          ...prev,
          [g.group_id]: 'Running'
        }));
      });

      fetchDevices(selectedUploadId);

    } catch (err) {
      console.error(err);
    } finally {
      setRunAllLoading(false);
    }
  };
  // ── Polling for a group ───────────────────────────────────────────────
  const startGroupPolling = (groupId) => {
    const poll = setInterval(async () => {
      try {
        const repRes = await fetch(`${apiBaseUrl}/api/audit/reports?upload_id=${selectedUploadId}`);
        if (!repRes.ok) return;
        const reports = await repRes.json();

        // Find a completed report matching this group
        const match = reports.find(r => r.group_id === groupId);
        if (match) {
          clearInterval(poll);
          setGroupAuditStatus(prev => ({ ...prev, [groupId]: 'Completed' }));
          setGroupReportMap(prev => ({ ...prev, [groupId]: { id: match._id || match.id, templateName: match.template_name, auditMode: match.audit_mode, createdAt: match.created_at } }));
          setGroupDownloadMap(prev => ({ ...prev, [groupId]: 'Download Pending' }));
          // Refresh devices
          fetchDevices(selectedUploadId);
        }
      } catch (e) {
        console.error('polling error', e);
      }
    }, 2000);
  };

  // ── Download PDF ──────────────────────────────────────────────────────
  const handleDownloadPDF = async (group, reportId) => {
    const groupId = group.group_id;
    setGroupDownloadMap(prev => ({ ...prev, [groupId]: 'Downloading' }));
    try {
      const res = await fetch(`${apiBaseUrl}/api/audit/reports/${reportId}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${group.vendor}_${group.device_type}_${group.model || 'generic'}_audit.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setGroupDownloadMap(prev => ({ ...prev, [groupId]: 'Downloaded' }));
      } else {
        alert('Failed to download PDF.');
        setGroupDownloadMap(prev => ({ ...prev, [groupId]: 'Download Pending' }));
      }
    } catch (e) {
      alert('Error downloading PDF.');
      setGroupDownloadMap(prev => ({ ...prev, [groupId]: 'Download Pending' }));
    }
  };

  // ── Navigate to template upload ───────────────────────────────────────
  const handleUploadTemplate = () => {
    if (setOnTemplateUploadSuccess) {
      setOnTemplateUploadSuccess(() => () => setActiveTab('queue'));
    }
    setActiveTab('template_management');
  };

  // ── Helpers ───────────────────────────────────────────────────────────
  const toggleExpand = (groupId) =>
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));

  const selectedJob = jobs.find(j => (j._id || j.id) === selectedUploadId) || null;
  const allReady = groups.length > 0 && groups.every(g => getGroupTemplate(g) !== undefined);
  const completedCount = groups.filter(g => groupAuditStatus[g.group_id] === 'Completed').length;
  const runningCount = groups.filter(g => groupAuditStatus[g.group_id] === 'Running').length;







  const templateMissingCount = groups.filter(
    g => !getGroupTemplate(g)
  ).length;

  const templateReadyCount = groups.filter(
    g => getGroupTemplate(g)
  ).length;

  const auditCompleted =
    completedCount === groups.length &&
    groups.length > 0;

  let workflowStatus = "Upload Completed";

  if (templateMissingCount > 0) {
    workflowStatus = "Waiting For Template";
  }
  else if (runningCount > 0) {
    workflowStatus = "Audit Running";
  }
  else if (auditCompleted) {
    workflowStatus = "Audit Completed";
  }
  else if (templateReadyCount > 0) {
    workflowStatus = "Ready For Audit";
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ── Header Banner ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FaShieldAlt className="text-cyan-400" />
              Audit Workflow Center
            </h2>
            {selectedJob && (
              <div className="mt-2 flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                  Batch: {selectedJob.folder_name}
                </span>

                <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs">
                  {selectedJob.total_devices} Devices
                </span>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Assign golden templates per device group, configure audit scope, and generate compliance reports.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {runningCount > 0 && (
              <span className="text-[10px] bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5">
                <FaSpinner className="animate-spin" />
                {runningCount} audit{runningCount > 1 ? 's' : ''} running
              </span>
            )}
            <div className="text-[10px] bg-slate-800/80 border border-slate-700/60 text-cyan-400 px-3.5 py-1.5 rounded-xl font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online
            </div>
          </div>
        </div>

        {/* Progress bar when audits running */}
        {groups.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>{completedCount}/{groups.length} groups completed</span>
              <span>{Math.round((completedCount / groups.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${(completedCount / groups.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Two-col layout: Batch selector + Summary ────────────────── */}
      <div className="grid grid-cols-1 gap-6">


        <div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6">

            <h3 className="font-bold text-slate-800 mb-4">
              Upload Workflow Status
            </h3>

            <div className="flex items-center justify-between">

              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  ✓
                </div>
                <p className="text-xs mt-2">Upload</p>
              </div>

              <div className="flex-1 h-1 bg-slate-200 mx-3"></div>

              <div className="text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${templateMissingCount > 0
                  ? "bg-yellow-100"
                  : "bg-green-100"
                  }`}>
                  📄
                </div>
                <p className="text-xs mt-2">Templates</p>
              </div>

              <div className="flex-1 h-1 bg-slate-200 mx-3"></div>

              <div className="text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${runningCount > 0
                  ? "bg-yellow-100"
                  : auditCompleted
                    ? "bg-green-100"
                    : "bg-slate-100"
                  }`}>
                  ▶
                </div>
                <p className="text-xs mt-2">Audit</p>
              </div>

              <div className="flex-1 h-1 bg-slate-200 mx-3"></div>

              <div className="text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${auditCompleted
                  ? "bg-green-100"
                  : "bg-slate-100"
                  }`}>
                  📑
                </div>
                <p className="text-xs mt-2">Report</p>
              </div>

            </div>

            <div className="mt-6 flex justify-between items-center">

              <span className="font-semibold text-slate-700">
                {workflowStatus}
              </span>

              {templateMissingCount > 0 && (
                <button
                  onClick={() => setActiveTab("template_management")}
                  className="px-4 py-2 rounded-lg bg-rose-500 text-white text-sm"
                >
                  Go To Templates
                </button>
              )}

              {templateMissingCount === 0 &&
                runningCount === 0 &&
                !auditCompleted && (
                  <button
                    onClick={handleRunAll}
                    className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm"
                  >
                    Run Audit
                  </button>
                )}

            </div>

          </div>

        </div>
      </div>



      <div className="bg-white border border-slate-200 rounded-3xl px-6 pt-4">
        <div className="flex gap-8 border-b border-slate-200">

          <button
            onClick={() => setViewTab("groups")}
            className={`pb-3 text-sm font-semibold border-b-2 ${viewTab === "groups"
              ? "border-cyan-500 text-cyan-600"
              : "border-transparent text-slate-500"
              }`}
          >
            Groups ({groups.length})
          </button>

          <button
            onClick={() => setViewTab("devices")}
            className={`pb-3 text-sm font-semibold border-b-2 ${viewTab === "devices"
              ? "border-cyan-500 text-cyan-600"
              : "border-transparent text-slate-500"
              }`}
          >
            Devices ({devices.length})
          </button>

          <button
            onClick={() => setViewTab("uploads")}
            className={`pb-3 text-sm font-semibold border-b-2 ${viewTab === "uploads"
              ? "border-cyan-500 text-cyan-600"
              : "border-transparent text-slate-500"
              }`}
          >
            Uploads
          </button>

        </div>
      </div>






      {/* ── Groups Panel ─────────────────────────────────────────────── */}


      {viewTab === "groups" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FaServer className="text-cyan-500 text-xs" />
                Device Groups
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">
                Each group represents a unique Vendor + Type + Model combination discovered in this batch.
              </p>
            </div>

            {selectedUploadId && groups.length > 0 && (
              <button
                onClick={handleRunAll}
                disabled={
                  runAllLoading ||
                  runningCount > 0 ||
                  !allReady ||
                  completedCount === groups.length
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all text-white shadow-sm
                ${runAllLoading || runningCount > 0 || !allReady
                    ? 'bg-slate-300 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 hover:shadow-md'
                  }`}
              >
                {runAllLoading || runningCount > 0
                  ? <FaSpinner className="animate-spin text-xs" />
                  : <FaBolt className="text-xs" />}
                {completedCount === groups.length
                  ? 'Audit Completed'
                  : 'Run All Audits'}
              </button>
            )}
          </div>

          {/* Empty/loading states */}
          {!selectedUploadId ? (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center gap-2">
              <FaInfoCircle className="text-3xl text-slate-300" />
              <p className="text-sm font-medium text-slate-400">Select an upload batch from the left panel.</p>
            </div>
          ) : loadingGroups ? (
            <div className="text-center py-16 flex flex-col items-center gap-2 text-slate-500">
              <FaSpinner className="animate-spin text-3xl text-cyan-500" />
              <p className="text-xs font-medium">Loading device groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center gap-2 text-slate-400">
              <span className="text-4xl">🔍</span>
              <p className="text-sm font-medium">No device groups found in this batch.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(group => {
                const gid = group.group_id;
                const expanded = expandedGroups[gid];
                const auditState = groupAuditStatus[gid] || 'Pending';
                const reportInfo = groupReportMap[gid];
                const dlState = groupDownloadMap[gid] || 'Pending';
                const tmplId = groupTemplateMap[gid] || group.template_id || '';
                const auditMode = groupAuditModeMap[gid] || group.audit_mode || 'full';
                const saving = savingTemplate[gid];
                const running = runningGroups[gid];
                const tmplStatus = group.template_status;

                // Find matched or selected template
                const selectedTemplate = getGroupTemplate(group);
                const effectiveTmplId = selectedTemplate ? (selectedTemplate._id || selectedTemplate.id) : '';

                const activeMode = AUDIT_MODE_OPTIONS.find(o => o.value === auditMode);
                const ModeIcon = activeMode?.icon || FaClipboardList;

                return (
                  <div
                    key={gid}
                    className={`rounded-2xl border transition-all overflow-hidden
                    ${auditState === 'Completed' ? 'border-emerald-200 bg-emerald-50/30' :
                        auditState === 'Running' ? 'border-yellow-200 bg-yellow-50/30' :
                          tmplStatus === 'TEMPLATE_REQUIRED' && !effectiveTmplId ? 'border-rose-200 bg-rose-50/20' :
                            'border-slate-200 bg-white'
                      }`}
                  >
                    {/* Group Row Header */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer"
                      onClick={() => toggleExpand(gid)}
                    >
                      {/* Left: expand + group info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-slate-400 text-xs shrink-0">
                          {expanded ? <FaChevronDown /> : <FaChevronRight />}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-800">
                              {group.vendor} {group.device_type?.toUpperCase()}
                              {group.model ? ` — ${group.model}` : ' — Generic'}
                            </span>
                            <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded">
                              {group.device_count} device{group.device_count !== 1 ? 's' : ''}
                            </span>
                            <TemplateStatusBadge status={effectiveTmplId ? 'READY' : tmplStatus} />
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            {selectedTemplate && (
                              <span className="font-medium text-slate-500">
                                📋 {selectedTemplate.template_name || selectedTemplate.name}
                              </span>
                            )}
                            {auditState !== 'Pending' && (
                              <span className={`font-semibold flex items-center gap-1
                              ${auditState === 'Completed' ? 'text-emerald-600' :
                                  auditState === 'Running' ? 'text-yellow-600' : 'text-slate-400'}`}>
                                {auditState === 'Running' && <FaSpinner className="animate-spin text-[8px]" />}
                                {auditState}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex items-center gap-2 shrink-0 ml-4" onClick={e => e.stopPropagation()}>
                        {auditState === 'Completed' ? (
                          <button
                            onClick={() => handleDownloadPDF(group, reportInfo.id)}
                            disabled={dlState === 'Downloading'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm"
                          >
                            {dlState === 'Downloading'
                              ? <FaSpinner className="animate-spin text-xs" />
                              : <FaFilePdf className="text-xs" />}
                            {dlState === 'Downloaded' ? 'Re-download' : 'Download PDF'}
                          </button>
                        ) : auditState === 'Running' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                            <FaSpinner className="animate-spin text-[9px]" />
                            Auditing...
                          </span>
                        ) : effectiveTmplId ? (
                          <button
                            onClick={() => handleRunGroupAudit({ ...group, group_id: gid })}
                            disabled={running}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm"
                          >
                            <FaPlay className="text-[8px]" />
                            Run Audit
                          </button>
                        ) : (
                          <button
                            onClick={handleUploadTemplate}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm"
                          >
                            <FaCloudUploadAlt className="text-xs" />
                            Upload Template
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Config Area */}
                    {expanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/60 space-y-5">

                        {/* Template assignment */}
                        {/* <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Golden Template
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 font-semibold shadow-sm"
                              value={effectiveTmplId}
                              onChange={e => handleAssignTemplate(gid, e.target.value)}
                              disabled={saving}
                            >
                              <option value="">Select a template...</option>
                              {templates.map(t => (
                                <option key={t._id || t.id} value={t._id || t.id}>
                                  {t.template_name || t.name} ({t.vendor} · {t.device_type})
                                </option>
                              ))}
                            </select>
                            {saving && <FaSpinner className="animate-spin text-cyan-500 text-sm shrink-0" />}
                            {!templates.length && (
                              <button
                                onClick={handleUploadTemplate}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline shrink-0"
                              >
                                Upload first →
                              </button>
                            )}
                          </div>
                          {!effectiveTmplId && (
                            <p className="text-[10px] text-rose-500 font-medium">
                              No template matched for {group.vendor} {group.device_type} {group.model || '(generic)'}.
                              <button
                                onClick={handleUploadTemplate}
                                className="ml-1 underline hover:text-rose-700"
                              >
                                Upload a template →
                              </button>
                            </p>
                          )}
                        </div> */}

                        {/* Audit mode selection — only shown when template assigned */}
                        {/* Audit Scope from API */}
                        {effectiveTmplId && auditState !== 'Completed' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Audit Scope
                            </label>

                            <div className="flex flex-wrap gap-2">
                              {group.available_sections?.map((section) => (
                                <span
                                  key={section}
                                  className="px-3 py-1 rounded-lg text-xs font-medium border border-cyan-200 bg-cyan-50 text-cyan-700"
                                >
                                  {SECTION_LABELS[section] || section}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Report summary when completed */}
                        {auditState === 'Completed' && reportInfo && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <FaCheckCircle className="text-emerald-600 text-sm" />
                              <span className="text-xs font-bold text-emerald-800">Audit Complete</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] text-emerald-700">
                              <div>
                                <span className="font-bold block">Template Used</span>
                                <span className="text-emerald-600">
                                  {reportInfo.templateName || group.template_name || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="font-bold block">Audit Mode</span>
                                <span className="text-emerald-600 capitalize">
                                  {reportInfo.auditMode || group.audit_mode || auditMode}
                                </span>
                              </div>
                              <div>
                                <span className="font-bold block">Generated At</span>
                                <span className="text-emerald-600">
                                  {reportInfo.createdAt ? new Date(reportInfo.createdAt).toLocaleString() : '—'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {dlState === 'Downloaded' && (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                  <FaCheckCircle className="text-[9px]" /> Downloaded
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {viewTab === "uploads" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <h3 className="font-bold text-slate-800 mb-4">
            Upload History
          </h3>

          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-3 px-4">Folder</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Devices</th>
                <th className="py-3 px-4 text-center">Download</th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4">{selectedJob.folder_name}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs">
                    {selectedJob.status}
                  </span>
                </td>
                <td className="py-3 px-4">{selectedJob.total_devices}</td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() =>
                      window.open(
                        `${apiBaseUrl}/api/uploads/${selectedJob._id}/download`,
                        "_blank"
                      )
                    }
                    className="p-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                  >
                    <FaDownload />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {/* ── Devices List Panel ────────────────────────────────────────── */}


      {viewTab === "devices" && selectedUploadId && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FaServer className="text-cyan-500 text-xs" />
                Devices List
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">
                Detailed inventory and individual audit status of all configurations in this batch.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-105 text-slate-600 px-2.5 py-1 rounded-full font-bold font-mono">
                {filteredDevices.length} matching
              </span>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={devSearch}
                onChange={e => setDevSearch(e.target.value)}
                placeholder="Search devices by name, vendor, model..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pl-8 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white font-medium transition-all"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            </div>
            <select
              value={devGroupFilter}
              onChange={(e) => setDevGroupFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-semibold focus:outline-none focus:border-cyan-500 focus:bg-white cursor-pointer"
            >
              <option value="">All Groups</option>

              {groups.map((g) => (
                <option
                  key={g.group_id}
                  value={g.group_id}
                >
                  {g.vendor} {g.model || 'GENERIC'}
                </option>
              ))}
            </select>
            {/* Status Filter */}
            <select
              value={devStatusFilter}
              onChange={e => setDevStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-semibold focus:outline-none focus:border-cyan-500 focus:bg-white cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="TEMPLATE_REQUIRED">Waiting for Template</option>
              <option value="READY_FOR_AUDIT">Ready for Audit</option>
              <option value="AUDIT_IN_PROGRESS">Auditing...</option>
              <option value="DEVICE_ANALYSIS_IN_PROGRESS">Analyzing...</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Devices Table */}
          {loadingDevices && devices.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
              <FaSpinner className="animate-spin text-2xl text-cyan-500" />
              <p className="text-xs font-semibold">Loading devices list...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-12 text-slate-450 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <p className="text-xs font-medium">No devices found matching criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-100">
                    <th className="py-3 px-4">Device Name</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Audit Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {paginatedDevices.map(d => {
                    const devId = d.id || d._id;
                    const dlState = deviceDownloadMap[devId] || 'Pending';
                    const score = d.audit_score;

                    // Color coding for score
                    let scoreBadge = (
                      <span className="text-slate-400 font-semibold">—</span>
                    );
                    if (score !== null && score !== undefined) {
                      const roundedScore = Math.round(score);
                      let scoreColor = 'bg-slate-100 text-slate-600 border-slate-200';
                      if (roundedScore >= 80) scoreColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      else if (roundedScore >= 50) scoreColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      else scoreColor = 'bg-rose-50 text-rose-700 border-rose-250';

                      scoreBadge = (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${scoreColor}`}>
                          {roundedScore}%
                        </span>
                      );
                    }

                    // Render device status badge
                    let statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        {d.display_status || 'Unknown'}
                      </span>
                    );
                    if (d.display_status === 'COMPLETED') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                          <FaCheckCircle className="text-[9px]" /> Completed
                        </span>
                      );
                    } else if (d.display_status === 'TEMPLATE_REQUIRED') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-250">
                          <FaExclamationTriangle className="text-[9px]" /> Waiting for Template
                        </span>
                      );
                    } else if (d.display_status === 'READY_FOR_AUDIT') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Ready for Audit
                        </span>
                      );
                    } else if (d.display_status === 'AUDIT_IN_PROGRESS' || d.display_status === 'RUNNING') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-50 text-yellow-750 border border-yellow-250">
                          <FaSpinner className="animate-spin text-[9px]" /> Auditing...
                        </span>
                      );
                    } else if (d.display_status === 'DEVICE_ANALYSIS_IN_PROGRESS' || d.display_status === 'PROCESSING') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                          <FaSpinner className="animate-spin text-[9px]" /> Analyzing...
                        </span>
                      );
                    }

                    return (
                      <tr key={devId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <FaServer className="text-slate-400 text-[10px]" />
                          {d.device_name}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">{d.vendor || '—'}</td>
                        <td className="py-3 px-4 capitalize font-medium text-slate-500">{d.device_type || '—'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-605">{d.model || '—'}</td>
                        <td className="py-3 px-4">{scoreBadge}</td>
                        <td className="py-3 px-4">{statusBadge}</td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">

                            {/* VIEW BUTTON */}
                            <button
                              onClick={() => onViewDevice(d)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                            >
                              <FaEye className="text-[9px]" />
                              <span>View</span>
                            </button>

                            {/* DOWNLOAD BUTTON */}
                            {d.display_status === 'COMPLETED' && d.audit_report_id ? (
                              <button
                                onClick={() => handleDownloadDevicePDF(d)}
                                disabled={dlState === 'Downloading'}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-[10px] font-bold"
                              >
                                {dlState === 'Downloading'
                                  ? <FaSpinner className="animate-spin text-[9px]" />
                                  : <FaFilePdf className="text-[9px]" />
                                }

                                <span>Download PDF</span>
                              </button>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold"
                              >
                                <FaFilePdf className="text-[9px]" />
                                <span>No Report</span>
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredDevices.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <span>Show</span>
                <select
                  value={devPageSize}
                  onChange={e => {
                    setDevPageSize(Number(e.target.value));
                    setDevCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs text-slate-700 focus:outline-none focus:border-cyan-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
                <span className="ml-2">
                  (showing {(devCurrentPage - 1) * devPageSize + 1} to {Math.min(devCurrentPage * devPageSize, filteredDevices.length)} of {filteredDevices.length})
                </span>
              </div>

              {/* Page buttons */}
              {devTotalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={devCurrentPage === 1}
                    onClick={() => setDevCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all"
                  >
                    Prev
                  </button>
                  {Array.from({ length: devTotalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isActive = pageNum === devCurrentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setDevCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border
                          ${isActive
                            ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={devCurrentPage === devTotalPages}
                    onClick={() => setDevCurrentPage(prev => Math.min(prev + 1, devTotalPages))}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-650 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}



    </div>
  );
}