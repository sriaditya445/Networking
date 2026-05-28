import React from 'react';
import { FaChartBar, FaCheckCircle, FaExclamationTriangle, FaHourglassHalf, FaCodeBranch } from 'react-icons/fa';

function Analytics({ stats, devices, jobs }) {
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
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Advanced Analytics</h2>
        <p className="text-sm text-slate-500">Deeper insights and heuristics parsed from staged configuration files.</p>
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
    </div>
  );
}

export default Analytics;
