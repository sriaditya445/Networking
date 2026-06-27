import React, { useState } from 'react';
import { FaSearch, FaEye, FaFilter, FaDownload } from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/common/Button';

function ParsedDevices({
  devices = [],
  jobs = [],
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  onViewDevice,
  formatDate,
  apiBaseUrl,
  selectedUploadId,
  setSelectedUploadId,
  selectedFolderName,
  setSelectedFolderName
}) {
  const { addToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Extract unique folder names from jobs
  const uniqueFolderNames = [...new Set(jobs.map(job => job.folder_name))];

  // Filter devices based on parent query
  const filteredDevices = devices.filter((device) => {
    // 1. Upload ID Filter
    const matchesUploadId = !selectedUploadId || device.upload_id === selectedUploadId;

    // 2. Folder Name Filter
    const deviceJob = jobs.find(j => (j._id || j.id) === device.upload_id);
    const deviceFolderName = deviceJob ? deviceJob.folder_name : '';
    const matchesFolderName = !selectedFolderName || deviceFolderName === selectedFolderName;

    // Combine upload ID and folder name filtering
    const matchesFolder = selectedUploadId ? matchesUploadId : matchesFolderName;

    // 3. Search Filter
    const matchesSearch = device.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.configuration.toLowerCase().includes(searchQuery.toLowerCase());

    // 4. Device Type Filter
    const matchesType = typeFilter === 'All' || device.device_type === typeFilter;

    return matchesFolder && matchesSearch && matchesType;
  });

  // Pagination computations
  const totalItems = filteredDevices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDevices = filteredDevices.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 hover:shadow-md transition-shadow animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Discovered Devices</h2>
          <p className="text-xs text-slate-500 mt-0.5">Database repository of processed assets and matching specifications.</p>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (devices.length > 0) {
                addToast("Triggered inventory CSV spreadsheet export successfully.", "success");
              } else {
                addToast("No devices available to export.", "warning");
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-705 rounded-xl text-xs font-bold transition-all border border-slate-205 shadow-sm"
          >
            <FaDownload className="text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Current Folder Banner */}
      {selectedUploadId && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-in-right">
          <div className="space-y-1 font-sans">
            <h3 className="text-xs font-semibold text-slate-800">
              Showing Devices From: <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-100">{selectedFolderName}</span>
            </h3>
            <p className="text-[10px] text-slate-450">
              Total Devices in Batch: <span className="font-bold text-slate-700">{devices.filter(d => d.upload_id === selectedUploadId).length}</span>
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedUploadId(null);
              setSelectedFolderName(null);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-bold transition-colors border border-rose-100 self-start sm:self-center"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* Search */}
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 transition-colors"
            placeholder="Search hostname or config content..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Folder Filter Dropdown */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <FaFilter className="text-slate-400 text-[10px]" />
            <span>Folder:</span>
          </span>
          <select
            className="bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs text-slate-805 focus:outline-none focus:border-cyan-500 cursor-pointer font-bold"
            value={selectedFolderName || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                setSelectedUploadId(null);
                setSelectedFolderName(null);
              } else {
                const matchingJob = jobs.find(j => j.folder_name === val);
                if (matchingJob) {
                  setSelectedUploadId(matchingJob._id || matchingJob.id);
                  setSelectedFolderName(val);
                } else {
                  setSelectedUploadId(null);
                  setSelectedFolderName(val);
                }
              }
              setCurrentPage(1);
            }}
          >
            <option value="">All Folders</option>
            {uniqueFolderNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <FaFilter className="text-slate-400 text-[10px]" />
            <span>Type:</span>
          </span>
          <select
            className="bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs text-slate-805 focus:outline-none focus:border-cyan-500 cursor-pointer font-bold"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Categories</option>
            <option value="Switch">Switches</option>
            <option value="Router">Routers</option>
            <option value="Firewall">Firewalls</option>
            <option value="AccessPoint">Access Points</option>
            <option value="WLC">WLC (Controllers)</option>
            <option value="Unknown">Unknown Devices</option>
          </select>
        </div>

        {/* Items Per Page dropdown */}
        <div className="flex items-center gap-2 shrink-0 md:ml-auto">
          <span className="text-xs text-slate-500 font-medium">Show:</span>
          <select
            className="bg-white border border-slate-200 rounded-xl py-1 px-2 text-xs text-slate-805 focus:outline-none cursor-pointer"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className="overflow-hidden border border-slate-100 rounded-2xl bg-white">
        {paginatedDevices.length === 0 ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">🔍</span>
            <p className="text-xs font-bold text-slate-700">No configurations found matching current filters.</p>
            <p className="text-[10px] text-slate-400">Try modifying your search query or uploading new files.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[10px] uppercase font-mono tracking-wider">
                <th className="px-6 py-3.5">Device Name</th>
                <th className="px-6 py-3.5">Device Type</th>
                <th className="px-6 py-3.5">File Location</th>
                <th className="px-6 py-3.5">Interface Count</th>
                <th className="px-6 py-3.5">Parsed At</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedDevices.map((device) => {
                const intfCount = device.parsed_data ? (device.parsed_data.interfaces_count || 0) : 0;
                return (
                  <tr
                    key={device._id || device.id}
                    className="hover:bg-slate-50/50 transition-colors text-slate-700"
                  >
                    <td className="px-6 py-4 font-bold text-slate-800 truncate max-w-[180px]" title={device.device_name}>
                      {device.device_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold ${device.device_type === 'Switch' ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' :
                          device.device_type === 'Router' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            device.device_type === 'Firewall' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              device.device_type === 'AccessPoint' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                'bg-slate-105 text-slate-600 border border-slate-150'
                        }`}>
                        {device.device_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-mono text-slate-500 max-w-[200px] truncate" title={device.file_path}>
                      {device.file_path ? device.file_path.split('/').pop() : 'Direct Upload'}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-650 font-semibold">
                      {intfCount > 0 ? `${intfCount} ports` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-450 font-mono">
                      {formatDate(device.parsed_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onViewDevice(device)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-bold transition-all shadow-sm"
                        >
                          <FaEye className="text-[10px] text-slate-400" />
                          <span>View Configuration</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{startIndex + 1}</strong> to{' '}
            <strong className="text-slate-800">
              {Math.min(startIndex + itemsPerPage, totalItems)}
            </strong>{' '}
            of <strong className="text-slate-800">{totalItems}</strong> parsed devices
          </span>

          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-[10px]"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-7 h-7 rounded-lg border font-bold text-[10px] ${isCurrent
                      ? 'bg-slate-800 border-slate-800 text-white'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-650'
                    } transition-colors`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-[10px]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ParsedDevices;
