import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-icons/fa';

const AUDIT_MODE_OPTIONS = [
  { value: 'full',        label: 'Full Compliance',   icon: FaClipboardList,  color: 'cyan'   },
  { value: 'security',    label: 'Security',          icon: FaLock,           color: 'rose'   },
  { value: 'performance', label: 'Performance',       icon: FaTachometerAlt,  color: 'amber'  },
  { value: 'wireless',    label: 'Wireless',          icon: FaWifi,           color: 'violet' },
  { value: 'aaa',         label: 'AAA',               icon: FaKey,            color: 'orange' },
  { value: 'dns',         label: 'Network Services',  icon: FaNetworkWired,   color: 'teal'   },
];

const COLOR_MAP = {
  cyan:   { pill: 'bg-cyan-50 text-cyan-700 border-cyan-200',   ring: 'ring-cyan-400',   dot: 'bg-cyan-500'   },
  rose:   { pill: 'bg-rose-50 text-rose-700 border-rose-200',   ring: 'ring-rose-400',   dot: 'bg-rose-500'   },
  amber:  { pill: 'bg-amber-50 text-amber-700 border-amber-200',ring: 'ring-amber-400',  dot: 'bg-amber-500'  },
  violet: { pill: 'bg-violet-50 text-violet-700 border-violet-200', ring: 'ring-violet-400', dot: 'bg-violet-500' },
  orange: { pill: 'bg-orange-50 text-orange-700 border-orange-200', ring: 'ring-orange-400', dot: 'bg-orange-500' },
  teal:   { pill: 'bg-teal-50 text-teal-700 border-teal-200',   ring: 'ring-teal-400',   dot: 'bg-teal-500'   },
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
  if (status === 'TEMPLATE_REQUIRED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <FaExclamationTriangle className="text-[8px]" />
        Template Required
      </span>
    );
  }
  if (status === 'READY') {
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
}) {
  const [groups, setGroups]                   = useState([]);
  const [templates, setTemplates]             = useState([]);
  const [loadingGroups, setLoadingGroups]     = useState(false);

  // Per-group state maps: { [groupId]: value }
  const [groupTemplateMap, setGroupTemplateMap] = useState({});   // selected template id
  const [groupAuditModeMap, setGroupAuditModeMap] = useState({}); // selected audit mode
  const [groupAuditStatus, setGroupAuditStatus]   = useState({}); // Pending | Running | Completed
  const [groupReportMap, setGroupReportMap]       = useState({}); // { id, templateName, ... }
  const [groupDownloadMap, setGroupDownloadMap]   = useState({}); // Pending | Downloaded

  const [savingTemplate, setSavingTemplate]   = useState({});     // { [groupId]: bool }
  const [runningGroups, setRunningGroups]     = useState({});     // { [groupId]: bool }
  const [expandedGroups, setExpandedGroups]   = useState({});

  const [runAllLoading, setRunAllLoading]     = useState(false);
  const pollRef = useRef(null);

  // ── Fetch templates ───────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/templates`)
      .then(r => r.ok ? r.json() : [])
      .then(setTemplates)
      .catch(() => {});
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
        const tmplMap  = {};
        const modeMap  = {};
        const statusMap = {};
        const reportMap = {};
        const dlMap    = {};

        g.forEach(grp => {
          tmplMap[grp.group_id]   = grp.template_id || '';
          modeMap[grp.group_id]   = grp.audit_mode  || 'full';
          statusMap[grp.group_id] = grp.template_status === 'READY'
            ? (grp.audit_mode ? 'Pending' : 'Pending')
            : 'Pending';
        });

        // Merge existing report/download state (don't overwrite if polling already set)
        setGroupTemplateMap(prev => ({ ...tmplMap,  ...prev }));
        setGroupAuditModeMap(prev => ({ ...modeMap, ...prev }));
        setGroupAuditStatus(prev => ({ ...statusMap,...prev }));
        setGroupReportMap(prev => ({ ...reportMap,  ...prev }));
        setGroupDownloadMap(prev => ({ ...dlMap,    ...prev }));
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
      t.vendor?.toLowerCase()      === group.vendor?.toLowerCase()      &&
      t.device_type?.toLowerCase() === group.device_type?.toLowerCase() &&
      (t.model || '').toLowerCase() === (group.model || '').toLowerCase()
    );

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
    const groupId    = group.group_id;
    const templateId = groupTemplateMap[groupId];
    const auditMode  = groupAuditModeMap[groupId] || 'full';

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
            vendor:            group.vendor,
            device_type:       group.device_type,
            model:             group.model || null,
            template_id:       templateId,
            audit_mode:        auditMode,
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
    } catch (e) {
      console.error('runGroupAudit error', e);
      setRunningGroups(prev => ({ ...prev, [groupId]: false }));
      setGroupAuditStatus(prev => ({ ...prev, [groupId]: 'Pending' }));
    }
  };

  // ── Run all ready groups ──────────────────────────────────────────────
  const handleRunAll = async () => {
    const readyGroups = groups.filter(g =>
      (g.template_status === 'READY' || groupTemplateMap[g.group_id]) &&
      groupAuditStatus[g.group_id] !== 'Completed'
    );
    if (!readyGroups.length) {
      alert('No groups have templates assigned yet.');
      return;
    }
    setRunAllLoading(true);
    for (const g of readyGroups) {
      await handleRunGroupAudit(g);
    }
    setRunAllLoading(false);
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
          setGroupAuditStatus(prev  => ({ ...prev,  [groupId]: 'Completed' }));
          setGroupReportMap(prev    => ({ ...prev,  [groupId]: { id: match._id || match.id, templateName: match.template_name, auditMode: match.audit_mode, createdAt: match.created_at } }));
          setGroupDownloadMap(prev  => ({ ...prev,  [groupId]: 'Download Pending' }));
          setRunningGroups(prev     => ({ ...prev,  [groupId]: false }));
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
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
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

  const selectedJob   = jobs.find(j => (j._id || j.id) === selectedUploadId) || null;
  const allReady      = groups.length > 0 && groups.every(g => g.template_status === 'READY' || groupTemplateMap[g.group_id]);
  const completedCount = groups.filter(g => groupAuditStatus[g.group_id] === 'Completed').length;
  const runningCount   = groups.filter(g => groupAuditStatus[g.group_id] === 'Running').length;

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Batch Selector */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FaFilter className="text-cyan-500 text-xs" />
            Upload Batches
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {jobs.map(job => {
              const jid      = job._id || job.id;
              const selected = jid === selectedUploadId;
              return (
                <button
                  key={jid}
                  onClick={() => setSelectedUploadId(jid)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all
                    ${selected
                      ? 'bg-cyan-50 border-cyan-300 text-cyan-800 font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-bold">{job.folder_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-slate-500 shrink-0">
                      {job.total_devices} files
                    </span>
                  </div>
                  <div className="mt-1">{renderStatusBadge(job.status)}</div>
                </button>
              );
            })}
            {!jobs.length && (
              <p className="text-xs text-slate-400 text-center py-8">No batches uploaded yet.</p>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Groups',       value: groups.length,                                              color: 'slate',   icon: FaLayerGroup },
            { label: 'Templates Assigned', value: groups.filter(g => g.template_status === 'READY' || groupTemplateMap[g.group_id]).length, color: 'emerald', icon: FaCheckCircle },
            { label: 'Audits Running',     value: runningCount,                                               color: 'yellow',  icon: FaBolt },
            { label: 'Reports Ready',      value: completedCount,                                             color: 'cyan',    icon: FaFilePdf },
          ].map(card => {
            const Icon = card.icon;
            const colorMap = {
              slate:   'bg-slate-50 text-slate-700 border-slate-200',
              emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              yellow:  'bg-yellow-50 text-yellow-700 border-yellow-200',
              cyan:    'bg-cyan-50 text-cyan-700 border-cyan-200',
            };
            return (
              <div key={card.label} className={`rounded-2xl border p-5 flex flex-col gap-2 ${colorMap[card.color]}`}>
                <Icon className="text-lg opacity-60" />
                <span className="text-2xl font-black">{card.value}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{card.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Groups Panel ─────────────────────────────────────────────── */}
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
              disabled={runAllLoading || runningCount > 0 || !allReady}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all text-white shadow-sm
                ${runAllLoading || runningCount > 0 || !allReady
                  ? 'bg-slate-300 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 hover:shadow-md'
                }`}
            >
              {runAllLoading || runningCount > 0
                ? <FaSpinner className="animate-spin text-xs" />
                : <FaBolt className="text-xs" />}
              Run All Audits
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
              const gid        = group.group_id;
              const expanded   = expandedGroups[gid];
              const auditState = groupAuditStatus[gid]  || 'Pending';
              const reportInfo = groupReportMap[gid];
              const dlState    = groupDownloadMap[gid]  || 'Pending';
              const tmplId     = groupTemplateMap[gid]  || group.template_id || '';
              const auditMode  = groupAuditModeMap[gid] || group.audit_mode || 'full';
              const saving     = savingTemplate[gid];
              const running    = runningGroups[gid];
              const tmplStatus = group.template_status;

              // Find matched or selected template
              const selectedTemplate = tmplId
                ? templates.find(t => (t._id || t.id) === tmplId)
                : autoMatchTemplate(group);
              const effectiveTmplId  = tmplId || (selectedTemplate ? (selectedTemplate._id || selectedTemplate.id) : '');

              const activeMode = AUDIT_MODE_OPTIONS.find(o => o.value === auditMode);
              const ModeIcon   = activeMode?.icon || FaClipboardList;

              return (
                <div
                  key={gid}
                  className={`rounded-2xl border transition-all overflow-hidden
                    ${auditState === 'Completed' ? 'border-emerald-200 bg-emerald-50/30' :
                      auditState === 'Running'   ? 'border-yellow-200 bg-yellow-50/30'   :
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
                                auditState === 'Running'   ? 'text-yellow-600'  : 'text-slate-400'}`}>
                              {auditState === 'Running' && <FaSpinner className="animate-spin text-[8px]" />}
                              {auditState}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex items-center gap-2 shrink-0 ml-4" onClick={e => e.stopPropagation()}>
                      {auditState === 'Completed' && reportInfo ? (
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
                      <div className="space-y-2">
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
                      </div>

                      {/* Audit mode selection — only shown when template assigned */}
                      {effectiveTmplId && auditState !== 'Completed' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Audit Scope
                          </label>
                          <GroupAuditModeSelector
                            groupId={gid}
                            value={auditMode}
                            onChange={handleAuditModeChange}
                          />
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
                              <span className="text-emerald-600">{reportInfo.templateName || '—'}</span>
                            </div>
                            <div>
                              <span className="font-bold block">Audit Mode</span>
                              <span className="text-emerald-600 capitalize">{reportInfo.auditMode || auditMode}</span>
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
    </div>
  );
}