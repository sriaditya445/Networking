import React from 'react';
import { FaTrash, FaDownload, FaSpinner, FaHistory, FaExclamationCircle } from 'react-icons/fa';

function ProcessingQueue({
  jobs,
  handleDeleteJob,
  formatDate,
  renderStatusBadge,
  apiBaseUrl
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Processing Queue</h2>
        <p className="text-xs text-slate-500">Staging progress logs and execution cycles of the background parser.</p>
      </div>

      {/* Queue list container */}
      <div className="overflow-hidden border border-slate-150 rounded-xl bg-white">
        {jobs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm font-medium">The processing queue is empty.</p>
            <p className="text-xs text-slate-500">Staged files will appear here while parsing occurs in the background.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-650 font-bold text-xs uppercase font-mono tracking-wider">
                <th className="px-6 py-3.5">Batch / Folder Label</th>
                <th className="px-6 py-3.5">Files Count</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {jobs.map((job) => (
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
                        <button
                          type="button"
                          className="p-2 bg-slate-100 hover:bg-cyan-500 hover:text-slate-950 text-slate-600 rounded-lg transition-colors"
                          onClick={() => {
                            const downloadUrl = `${apiBaseUrl}/api/jobs/${job._id || job.id}/download`;
                            window.open(downloadUrl, '_blank');
                          }}
                          title="Download ZIP"
                          aria-label={`Download folder ${job.folder_name} ZIP`}
                        >
                          <FaDownload className="text-xs" />
                        </button>
                      )}
                      
                      <button
                        type="button"
                        className="p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 rounded-lg transition-colors"
                        onClick={() => handleDeleteJob(job._id || job.id)}
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
