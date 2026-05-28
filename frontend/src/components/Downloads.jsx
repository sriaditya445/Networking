import React from 'react';
import { FaDownload, FaFolder, FaFileArchive } from 'react-icons/fa';

function Downloads({ jobs, formatDate, apiBaseUrl }) {
  const successJobs = jobs.filter(j => j.status === 'success');

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Archive Downloads</h2>
        <p className="text-xs text-slate-500">Download fully compiled ZIP archives of analyzed configuration batches.</p>
      </div>

      {/* Grid of ZIP files */}
      {successJobs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 flex flex-col items-center justify-center gap-2">
          <span className="text-4xl">📥</span>
          <p className="text-sm font-medium">No downloadable archives are available.</p>
          <p className="text-xs text-slate-500">Upload configuration batches to generate zip archives.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {successJobs.map((job) => (
            <div 
              key={job._id || job.id} 
              className="border border-slate-200 rounded-xl p-5 hover:border-cyan-400 bg-white transition-all hover:shadow-md flex flex-col justify-between h-44 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center text-lg shadow-sm border border-amber-100">
                  <FaFileArchive />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 text-sm truncate" title={job.folder_name}>
                    {job.folder_name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDate(job.created_at)}</p>
                </div>
              </div>

              <div className="text-xs text-slate-650 flex justify-between items-center mt-3 pt-3 border-t border-slate-100 font-mono">
                <span>Files: {job.files_count}</span>
                <span className="text-emerald-500 font-bold uppercase text-[9px] tracking-wide bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Processed</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const downloadUrl = `${apiBaseUrl}/api/jobs/${job._id || job.id}/download`;
                  window.open(downloadUrl, '_blank');
                }}
                className="w-full bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-white font-semibold py-2 rounded-lg text-xs mt-3 flex items-center justify-center gap-1.5 transition-colors"
              >
                <FaDownload className="text-[10px]" />
                <span>Download ZIP</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Downloads;
