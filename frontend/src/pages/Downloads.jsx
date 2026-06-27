import React, { useState } from 'react';
import { FaDownload, FaFileArchive, FaSpinner, FaSearch, FaFilter } from 'react-icons/fa';
import Button from '../components/common/Button';

function Downloads({ jobs = [], formatDate, apiBaseUrl }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Filter display jobs based on search query and status filter
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.folder_name.toLowerCase().includes(searchQuery.toLowerCase());
    const statusLower = (job.status || '').toLowerCase();
    const isProcessing = ['new', 'pending_extraction', 'processing', 'pending'].includes(statusLower);
    const isFailed = statusLower === 'failed';
    const isReady = statusLower === 'success';

    let matchesStatus = true;
    if (statusFilter === 'Ready') matchesStatus = isReady;
    if (statusFilter === 'Processing') matchesStatus = isProcessing;
    if (statusFilter === 'Failed') matchesStatus = isFailed;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 hover:shadow-md transition-shadow animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Archive Downloads</h2>
          <p className="text-xs text-slate-500 mt-0.5">Download fully compiled ZIP archives of analyzed configuration batches.</p>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* Search Input */}
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 transition-colors"
            placeholder="Search archive folder name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <FaFilter className="text-slate-400 text-[10px]" />
            <span>Status:</span>
          </span>
          <select
            className="bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs text-slate-805 focus:outline-none focus:border-cyan-500 cursor-pointer font-bold"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Archives</option>
            <option value="Ready">Ready</option>
            <option value="Processing">Processing</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Grid of ZIP files */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-150 rounded-2xl bg-slate-50 text-slate-400 flex flex-col items-center justify-center gap-2">
          <span className="text-4xl">📥</span>
          <p className="text-xs font-bold text-slate-700">No downloadable archives are available.</p>
          <p className="text-[10px] text-slate-405">Upload configuration batches to generate ZIP archives.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => {
            const statusLower = (job.status || '').toLowerCase();
            const isProcessing = ['new', 'pending_extraction', 'processing', 'pending'].includes(statusLower);
            const isFailed = statusLower === 'failed';
            
            let statusBadge = (
              <span className="text-emerald-500 font-bold uppercase text-[9px] tracking-wide bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                Ready
              </span>
            );
            if (isProcessing) {
              statusBadge = (
                <span className="text-amber-500 font-bold uppercase text-[9px] tracking-wide bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1 animate-pulse">
                  <FaSpinner className="animate-spin text-[8px]" /> Processing
                </span>
              );
            } else if (isFailed) {
              statusBadge = (
                <span className="text-rose-505 font-bold uppercase text-[9px] tracking-wide bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                  Failed
                </span>
              );
            }

            return (
              <div 
                key={job._id || job.id} 
                className="border border-slate-100 rounded-3xl p-5 hover:border-cyan-400/60 bg-slate-50/20 hover:bg-white transition-all hover:shadow-md flex flex-col justify-between h-44 group animate-zoom-in"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-505 flex items-center justify-center text-lg shadow-sm border border-amber-100 shrink-0">
                    <FaFileArchive />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 text-xs truncate" title={job.folder_name}>
                      {job.folder_name}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{formatDate(job.created_at)}</p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex justify-between items-center mt-3 pt-3 border-t border-slate-100 font-mono">
                  <span>Files Count: {job.total_devices || job.files_count || 0}</span>
                  {statusBadge}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const downloadUrl = `${apiBaseUrl}/api/uploads/${job._id || job.id}/download`;
                    window.open(downloadUrl, '_blank');
                  }}
                  disabled={isProcessing || isFailed}
                  className={`w-full font-semibold py-2 rounded-xl text-xs mt-3 flex items-center justify-center gap-1.5 transition-all shadow-sm
                    ${isProcessing || isFailed
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white cursor-pointer'
                    }`}
                >
                  <FaDownload className="text-[10px]" />
                  <span>Download ZIP</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Downloads;
