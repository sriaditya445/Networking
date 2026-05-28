import React from 'react';
import { FaCloudUploadAlt, FaLaptopCode, FaCheckCircle, FaExclamationTriangle, FaHdd, FaHistory } from 'react-icons/fa';

function Dashboard({ stats, jobs, devices, onViewDevice, setActiveTab }) {
  // Get recent jobs (last 5)
  const recentJobs = [...jobs].slice(0, 5);
  // Get recent devices (last 5)
  const recentDevices = [...devices].slice(0, 5);

  // Compute SVG chart data
  const total = devices.length || 1;
  const switches = devices.filter(d => d.device_type === 'Switch').length;
  const routers = devices.filter(d => d.device_type === 'Router').length;
  const firewalls = devices.filter(d => d.device_type === 'Firewall').length;
  const aps = devices.filter(d => d.device_type === 'AccessPoint').length;
  const wlcs = devices.filter(d => d.device_type === 'WLC').length;
  const unknowns = devices.filter(d => !['Switch', 'Router', 'Firewall', 'AccessPoint', 'WLC'].includes(d.device_type)).length;

  const chartData = [
    { label: 'Switches', count: switches, color: '#06b6d4', percentage: (switches / total) * 100 },
    { label: 'Routers', count: routers, color: '#a855f7', percentage: (routers / total) * 100 },
    { label: 'Firewalls', count: firewalls, color: '#f43f5e', percentage: (firewalls / total) * 100 },
    { label: 'Access Points', count: aps, color: '#10b981', percentage: (aps / total) * 100 },
    { label: 'WLC', count: wlcs, color: '#f59e0b', percentage: (wlcs / total) * 100 },
    { label: 'Unknowns', count: unknowns, color: '#64748b', percentage: (unknowns / total) * 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">System Dashboard</h2>
        <p className="text-sm text-slate-500">Real-time status overview of network configuration files and device staging.</p>
      </div>

      {/* Analytics Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-500 flex items-center justify-center text-xl">
            <FaCloudUploadAlt />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Uploads</span>
            <span className="text-2xl font-bold text-slate-800">{stats.total_jobs}</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{stats.pending_jobs} parsing active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center text-xl">
            <FaLaptopCode />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Parsed Devices</span>
            <span className="text-2xl font-bold text-slate-800">{stats.total_devices}</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Staged inside database</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl">
            <FaCheckCircle />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Successful Jobs</span>
            <span className="text-2xl font-bold text-slate-800">{stats.success_jobs}</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Success parser executions</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl">
            <FaExclamationTriangle />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Failed Jobs</span>
            <span className="text-2xl font-bold text-slate-800">{stats.failed_jobs}</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Errors during parser run</span>
          </div>
        </div>
      </div>

      {/* SVG Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Distribution Bar Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Device Distribution</h3>
            <p className="text-xs text-slate-400">Classified configurations breakdown</p>
          </div>
          
          <div className="space-y-4">
            {chartData.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">{item.label}</span>
                  <span className="text-slate-800 font-mono font-bold">{item.count} devices ({item.percentage.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parsing Statistics & Health Widget */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Parsing Efficiency</h3>
            <p className="text-xs text-slate-400">Success vs failure stats</p>
          </div>

          <div className="flex items-center justify-center my-4 relative">
            {/* Custom SVG Donut Chart */}
            <svg width="150" height="150" viewBox="0 0 36 36" className="w-36 h-36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              {stats.total_jobs > 0 ? (
                <>
                  {/* Success slice */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="3.2" 
                    strokeDasharray={`${(stats.success_jobs / stats.total_jobs) * 100} ${100 - ((stats.success_jobs / stats.total_jobs) * 100)}`} 
                    strokeDashoffset="25" 
                  />
                  {/* Failed slice */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="#f43f5e" 
                    strokeWidth="3.2" 
                    strokeDasharray={`${(stats.failed_jobs / stats.total_jobs) * 100} ${100 - ((stats.failed_jobs / stats.total_jobs) * 100)}`} 
                    strokeDashoffset={25 - ((stats.success_jobs / stats.total_jobs) * 100)} 
                  />
                </>
              ) : null}
            </svg>
            <div className="absolute text-center flex flex-col">
              <span className="text-2xl font-black text-slate-800">
                {stats.total_jobs > 0 ? ((stats.success_jobs / stats.total_jobs) * 100).toFixed(0) : '0'}%
              </span>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Success</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono border-t border-slate-100 pt-4">
            <div>
              <span className="text-emerald-500 block text-base font-bold">{stats.success_jobs}</span>
              <span className="text-slate-400 text-[10px]">SUCCESS</span>
            </div>
            <div>
              <span className="text-rose-500 block text-base font-bold">{stats.failed_jobs}</span>
              <span className="text-slate-400 text-[10px]">FAILED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Lists (Jobs & Devices) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FaHistory className="text-slate-400 text-xs" />
              <span>Recent Upload Jobs</span>
            </h3>
            <button 
              onClick={() => setActiveTab('queue')}
              className="text-xs font-semibold text-cyan-500 hover:text-cyan-600 transition-colors"
            >
              View Queue
            </button>
          </div>

          {recentJobs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic">
              No jobs uploaded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentJobs.map((job) => (
                <div key={job._id || job.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700 truncate max-w-xs">{job.folder_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {job.files_count} files • {new Date(job.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                    job.status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    job.status === 'failed' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                    'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Parsed Devices */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FaHdd className="text-slate-400 text-xs" />
              <span>Recent Parsed Devices</span>
            </h3>
            <button 
              onClick={() => setActiveTab('devices')}
              className="text-xs font-semibold text-cyan-500 hover:text-cyan-600 transition-colors"
            >
              View Table
            </button>
          </div>

          {recentDevices.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic">
              No parsed devices yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentDevices.map((device) => (
                <div key={device._id || device.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700 truncate max-w-xs">{device.device_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Path: {device.file_path ? device.file_path.split('/').pop() : 'Direct'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                      device.device_type === 'Switch' ? 'bg-cyan-100 text-cyan-700' :
                      device.device_type === 'Router' ? 'bg-purple-100 text-purple-700' :
                      device.device_type === 'Firewall' ? 'bg-rose-100 text-rose-700' :
                      device.device_type === 'AccessPoint' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {device.device_type}
                    </span>
                    <button
                      onClick={() => onViewDevice(device)}
                      className="text-cyan-500 hover:text-cyan-600 text-xs font-semibold font-mono"
                    >
                      VIEW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
