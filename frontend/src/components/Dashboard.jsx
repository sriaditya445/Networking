import React, { useState } from 'react';
import { FaCloudUploadAlt, FaLaptopCode, FaCheckCircle, FaExclamationTriangle, FaHdd, FaHistory, FaEye, FaDownload } from 'react-icons/fa';

function Dashboard({ stats, jobs, devices, onViewDevice, setActiveTab, apiBaseUrl, setSelectedUploadId, setSelectedFolderName }) {
  // Local state for folder name filter
  const [selectedFolder, setSelectedFolder] = useState('');

  // Extract unique folder names for the dropdown
  const uniqueFolders = [...new Set(jobs.map(job => job.folder_name))];

  // Filter jobs by selected folder if any
  const filteredJobs = selectedFolder
    ? jobs.filter(job => job.folder_name === selectedFolder)
    : jobs;

  // Get recent jobs (last 5)
  const recentJobs = [...filteredJobs].slice(0, 5);
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
            <span className="text-2xl font-bold text-slate-800">{stats.total_uploads}</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{stats.pending_uploads} parsing active</span>
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
            <span className="text-2xl font-bold text-slate-800">{stats.success_uploads}</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Success parser executions</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl">
            <FaExclamationTriangle />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Failed Jobs</span>
            <span className="text-2xl font-bold text-slate-800">{stats.failed_uploads}</span>
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
              {stats.total_uploads > 0 ? (
                <>
                  {/* Success slice */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.2"
                    strokeDasharray={`${(stats.success_uploads / stats.total_uploads) * 100} ${100 - ((stats.success_uploads / stats.total_uploads) * 100)}`}
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
                    strokeDasharray={`${(stats.failed_uploads / stats.total_uploads) * 100} ${100 - ((stats.failed_uploads / stats.total_uploads) * 100)}`}
                    strokeDashoffset={25 - ((stats.success_uploads / stats.total_uploads) * 100)}
                  />
                </>
              ) : null}
            </svg>
            <div className="absolute text-center flex flex-col">
              <span className="text-2xl font-black text-slate-800">
                {stats.total_uploads > 0 ? ((stats.success_uploads / stats.total_uploads) * 100).toFixed(0) : '0'}%
              </span>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Success</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono border-t border-slate-100 pt-4">
            <div>
              <span className="text-emerald-500 block text-base font-bold">{stats.success_uploads}</span>
              <span className="text-slate-400 text-[10px]">SUCCESS</span>
            </div>
            <div>
              <span className="text-rose-500 block text-base font-bold">{stats.failed_uploads}</span>
              <span className="text-slate-400 text-[10px]">FAILED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Lists (Jobs & Devices) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FaHistory className="text-slate-400 text-xs" />
              <span>Recent Upload Jobs</span>
            </h3>
            <div className="flex items-center gap-3">
              <select
                className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
              >
                <option value="">All Folders</option>
                {uniqueFolders.map((folder) => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </select>
              <button
                onClick={() => setActiveTab('queue')}
                className="text-xs font-semibold text-cyan-500 hover:text-cyan-600 transition-colors shrink-0"
              >
                View Queue
              </button>
            </div>
          </div>

          {recentJobs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic">
              No jobs uploaded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job) => {
                // Find all devices belonging to this job
                const jobDevices = devices.filter(
                  (d) => d.upload_id === job._id || d.upload_id === job.id
                );

                const hasMoreThanThree = jobDevices.length > 3;
                const devicesToShow = jobDevices.slice(0, 3);

                const handleViewJob = () => {
                  setSelectedUploadId(job._id || job.id);
                  setSelectedFolderName(job.folder_name);
                  setActiveTab('devices');
                };

                const handleDownloadJob = (e) => {
                  e.stopPropagation();
                  const downloadUrl = `${apiBaseUrl}/api/jobs/${job._id || job.id}/download`;
                  window.open(downloadUrl, '_blank');
                };

                return (
                  <div
                    key={job._id || job.id}
                    className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-3"
                  >
                    {/* Job Card Header */}
                    <div className="flex justify-between items-start border-b border-slate-200/50 pb-2">
                      <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                        <span
                          className="font-bold text-slate-800 text-sm tracking-tight hover:text-cyan-600 cursor-pointer block truncate"
                          onClick={handleViewJob}
                          title={`View devices from folder ${job.folder_name}`}
                        >
                          {job.folder_name}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {job.files_count} files • {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Status Badge */}
                        <span className={`inline-block px-2 py-0.5 rounded-full font-bold uppercase text-[8px] tracking-wide ${job.status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          job.status === 'failed' ? 'bg-rose-50 text-rose-600 border border-rose-105' :
                            'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                          }`}>
                          {job.status}
                        </span>

                        {/* View Action */}
                        <button
                          onClick={handleViewJob}
                          className="p-1.5 bg-white hover:bg-cyan-50 hover:text-cyan-600 text-slate-500 rounded-lg border border-slate-200 transition-colors shadow-sm"
                          title="View Devices in Table"
                        >
                          <FaEye className="text-xs" />
                        </button>

                        {/* Download Action */}
                        {job.status === 'success' && (
                          <button
                            onClick={handleDownloadJob}
                            className="p-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 rounded-lg border border-slate-200 transition-colors shadow-sm"
                            title="Download Job ZIP"
                          >
                            <FaDownload className="text-xs" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Devices Tree List */}
                    <div className="font-mono text-[11px] text-slate-600 space-y-1">
                      {jobDevices.length === 0 ? (
                        <div className="text-slate-400 italic pl-2 text-[10px]">No devices parsed.</div>
                      ) : (
                        <>
                          {devicesToShow.map((device, index) => {
                            // If there are more than 3 devices, then these 3 all use ├─
                            // If <= 3 devices, the last one uses └─
                            const isLastItem = index === devicesToShow.length - 1 && !hasMoreThanThree;
                            const prefix = isLastItem ? '└─' : '├─';

                            return (
                              <div
                                key={device._id || device.id}
                                className="flex justify-between items-center group py-0.5 px-2 rounded hover:bg-white hover:shadow-sm transition-all duration-150"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-slate-300 font-bold select-none">{prefix}</span>
                                  <span className="truncate font-semibold text-slate-700 max-w-[240px]" title={device.device_name}>
                                    {device.device_name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => onViewDevice(device)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-cyan-500 p-0.5 rounded transition-all"
                                  title={`View configuration of ${device.device_name}`}
                                >
                                  <FaEye className="text-[10px]" />
                                </button>
                              </div>
                            );
                          })}

                          {/* View All Option */}
                          {hasMoreThanThree && (
                            <div
                              onClick={handleViewJob}
                              className="flex items-center gap-1.5 py-0.5 px-2 rounded hover:bg-white hover:shadow-sm cursor-pointer transition-all duration-150 text-cyan-600 hover:text-cyan-700 font-bold"
                            >
                              <span className="text-slate-300 font-bold select-none">└─</span>
                              <span>View All ({jobDevices.length})</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${device.device_type === 'Switch' ? 'bg-cyan-100 text-cyan-700' :
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
