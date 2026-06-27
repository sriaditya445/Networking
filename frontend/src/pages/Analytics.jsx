import React from 'react';
import { FaChartBar, FaCheckCircle, FaExclamationTriangle, FaHourglassHalf, FaCodeBranch, FaDownload, FaSpinner } from 'react-icons/fa';

function Analytics({ stats, devices, jobs, apiBaseUrl }) {
  const [selectedReportType, setSelectedReportType] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [toast, setToast] = React.useState({ message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: '' });
    }, 4500);
  };

  const handleDownloadReport = async () => {
    if (!selectedReportType) return;
    setIsGenerating(true);
    try {
      const url = `${apiBaseUrl || 'http://localhost:8000'}/api/reports/${selectedReportType}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      let filename = 'report.pdf';
      if (selectedReportType === 'executive-summary') filename = 'network_audit_executive_summary.pdf';
      else if (selectedReportType === 'device-inventory') filename = 'network_device_inventory.pdf';
      else if (selectedReportType === 'compliance-audit') filename = 'network_compliance_audit.pdf';
      else if (selectedReportType === 'config-comparison') filename = 'network_configuration_comparison.pdf';
      else if (selectedReportType === 'full-network-audit') filename = 'full_network_audit_report.pdf';

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast("Report generated and downloaded successfully!", "success");
    } catch (error) {
      console.error("Error downloading report:", error);
      showToast("Failed to generate report. Please verify connection and try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const totalDevices = devices.length || 1;
  const switches = devices.filter(d => d.device_type === 'Switch').length;
  const routers = devices.filter(d => d.device_type === 'Router').length;
  const firewalls = devices.filter(d => d.device_type === 'Firewall').length;
  const aps = devices.filter(d => d.device_type === 'AccessPoint').length;
  const wlcs = devices.filter(d => d.device_type === 'WLC').length;
  const unknowns = devices.filter(d => !['Switch', 'Router', 'Firewall', 'AccessPoint', 'WLC'].includes(d.device_type)).length;

  const typePercentages = {
    Switches: (switches / totalDevices) * 100,
    Routers: (routers / totalDevices) * 100,
    Firewalls: (firewalls / totalDevices) * 100,
    APs: (aps / totalDevices) * 100,
    WLCs: (wlcs / totalDevices) * 100,
    Unknowns: (unknowns / totalDevices) * 100,
  };

  // Protocols count
  let ospf = 0, bgp = 0, rip = 0, stat = 0;
  devices.forEach(d => {
    if (d.parsed_data && d.parsed_data.protocols) {
      d.parsed_data.protocols.forEach(p => {
        if (p.includes('OSPF')) ospf++;
        if (p.includes('BGP')) bgp++;
        if (p.includes('RIP')) rip++;
        if (p.includes('Static')) stat++;
      });
    }
  });

  const protocolsData = [
    { name: 'OSPF', count: ospf, color: 'bg-cyan-500' },
    { name: 'BGP', count: bgp, color: 'bg-purple-500' },
    { name: 'RIP', count: rip, color: 'bg-rose-500' },
    { name: 'Static Routes', count: stat, color: 'bg-amber-500' },
  ];

  // Config sizes
  const avgSize = devices.reduce((acc, curr) => acc + (curr.configuration ? curr.configuration.length : 0), 0) / (devices.length || 1);

  return (
    <div className="space-y-6">
      {/* Title & Report Generator */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Advanced Analytics</h2>
          <p className="text-sm text-slate-500">Deeper insights and heuristics parsed from staged configuration files.</p>
        </div>

        {/* Generate Report Section */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm w-full md:w-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:block pl-1">
            Generate Report:
          </div>
          <div className="relative w-full sm:w-56">
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              disabled={isGenerating}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/80 transition-all appearance-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Select Report Type...</option>
              <option value="executive-summary">Executive Summary Report</option>
              <option value="device-inventory">Device Inventory Report</option>
              <option value="compliance-audit">Compliance Audit Report</option>
              <option value="config-comparison">Configuration Comparison Report</option>
              <option value="full-network-audit">Full Network Audit Report</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
          <button
            onClick={handleDownloadReport}
            disabled={!selectedReportType || isGenerating}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              !selectedReportType || isGenerating
                ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-white font-bold shadow-sm'
            }`}
          >
            {isGenerating ? (
              <>
                <FaSpinner className="animate-spin text-xs" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FaDownload className="text-xs" />
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Config Size</span>
          <span className="text-2xl font-black text-slate-800 font-mono">{(avgSize / 1024).toFixed(1)} KB</span>
          <span className="text-[10px] text-slate-450 block">Lines average: {Math.round(avgSize / 40)} lines</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parser Success Rate</span>
          <span className="text-2xl font-black text-emerald-500 font-mono">
            {stats.total_jobs > 0 ? ((stats.success_jobs / stats.total_jobs) * 100).toFixed(0) : '0'}%
          </span>
          <span className="text-[10px] text-slate-450 block">{stats.success_jobs} jobs executed cleanly</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Interfaces</span>
          <span className="text-2xl font-black text-purple-600 font-mono">
            {devices.reduce((acc, d) => acc + (d.parsed_data?.interfaces_count || 0), 0)}
          </span>
          <span className="text-[10px] text-slate-450 block">Extracted ports/interfaces</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unique VLANs</span>
          <span className="text-2xl font-black text-amber-500 font-mono">
            {new Set(devices.flatMap(d => d.parsed_data?.vlans || [])).size}
          </span>
          <span className="text-[10px] text-slate-450 block">Active L2 VLAN database</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Types Density */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Asset Density Ratio</h3>
            <p className="text-xs text-slate-450">Percentage breakdown by device type</p>
          </div>
          
          <div className="space-y-4 pt-2">
            {Object.entries(typePercentages).map(([label, pct], idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-slate-600 font-semibold font-mono">
                  <span>{label}</span>
                  <span>{pct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                  <div 
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-cyan-400 to-cyan-500" 
                    style={{ width: `${pct}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Protocols Frequency */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Protocol Distributions</h3>
            <p className="text-xs text-slate-450">Routing engines identified inside codebases</p>
          </div>

          <div className="space-y-4 pt-2">
            {protocolsData.map((item, idx) => {
              const maxCount = Math.max(...protocolsData.map(p => p.count)) || 1;
              const pct = (item.count / maxCount) * 100;
              return (
                <div key={idx} className="flex items-center gap-4 text-xs">
                  <span className="w-24 font-bold text-slate-600 truncate">{item.name}</span>
                  <div className="flex-1 bg-slate-100 h-6 rounded-lg overflow-hidden relative">
                    <div 
                      className={`h-full transition-all duration-500 opacity-80 ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-y-0 left-2.5 flex items-center font-bold text-slate-800 text-[10px] font-mono">
                      {item.count} occurrences
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast Notification Container */}
      {toast.message && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-50/90 border-emerald-200/60 text-emerald-900'
            : 'bg-rose-50/90 border-rose-200/60 text-rose-900'
        }`}>
          <span className="text-xs font-bold font-mono">
            {toast.type === 'success' ? '✓' : '⚠'}
          </span>
          <span className="text-xs font-semibold">{toast.message}</span>
          <button
            onClick={() => setToast({ message: '', type: '' })}
            className="text-xs font-black opacity-60 hover:opacity-100 transition-opacity ml-2 focus:outline-none"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default Analytics;
