import React, { useState } from 'react';
import { FaTrash, FaDownload, FaSpinner, FaHistory, FaExclamationCircle, FaFilter } from 'react-icons/fa';

function ProcessingQueue({
  jobs,
  handleDeleteJob,
  formatDate,
  renderStatusBadge,
  apiBaseUrl
}) {
  const [selectedFolder, setSelectedFolder] = useState('');

  // Extract unique folder names
  const uniqueFolders = [...new Set(jobs.map(job => job.folder_name))];

  // Filter jobs based on selected folder
  const filteredJobs = selectedFolder
    ? jobs.filter(job => job.folder_name === selectedFolder)
    : jobs;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Processing Queue</h2>
          <p className="text-xs text-slate-500">Staging progress logs and execution cycles of the background parser.</p>
        </div>
      </div>

      {/* Folder Filter Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 font-sans">
            <FaFilter className="text-slate-400 text-[10px]" />
            <span>Filter by Folder:</span>
          </span>
          <select
            className="bg-white border border-slate-200 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
          >
            <option value="">All Folders</option>
            {uniqueFolders.map((folder) => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Queue list container */}
      <div className="overflow-hidden border border-slate-150 rounded-xl bg-white">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm font-medium">
              {selectedFolder ? "No matching jobs found in the queue." : "The processing queue is empty."}
            </p>
            <p className="text-xs text-slate-500">
              {selectedFolder ? "Try selecting a different folder or clearing the filter." : "Staged files will appear here while parsing occurs in the background."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-655 font-bold text-xs uppercase font-mono tracking-wider">
                <th className="px-6 py-3.5">Batch / Folder Label</th>
                <th className="px-6 py-3.5">Files Count</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredJobs.map((job) => (
                <tr key={job._id || job.id} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 truncate max-w-xs">{job.folder_name}</p>
                      {job.error_message && (
                        <p className="text-[10px] text-rose-500 flex items-center gap-1 max-w-sm truncate" title={job.error_message}>
                          <FaExclamationCircle className="shrink-0" />
                          <span>Error: {job.error_message}</span>
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    {job.files_count} configuration files
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {formatDate(job.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    {renderStatusBadge(job.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {job.status === 'success' && (
                        <a
                          href={`${apiBaseUrl}/api/jobs/${job._id || job.id}/download`}
                          download
                          className="p-2 bg-slate-100 hover:bg-cyan-500 hover:text-slate-950 text-slate-600 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Download ZIP"
                          aria-label={`Download folder ${job.folder_name} ZIP`}
                        >
                          <FaDownload className="text-xs" />
                        </a>
                      )}
                      
                      <button
                        type="button"
                        className="p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteJob(job._id || job.id);
                        }}
                        title="Delete Job"
                        aria-label={`Delete job ${job.folder_name}`}
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ProcessingQueue;
