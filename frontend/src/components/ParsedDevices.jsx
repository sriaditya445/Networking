import React, { useState } from 'react';
import { FaSearch, FaEye, FaFilter, FaDownload } from 'react-icons/fa';

function ParsedDevices({
  devices,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  onViewDevice,
  formatDate,
  apiBaseUrl
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter devices based on parent query
  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.configuration.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'All' || device.device_type === typeFilter;
    return matchesSearch && matchesType;
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
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Discovered Devices</h2>
          <p className="text-xs text-slate-500">Database repository of processed assets and matching specifications.</p>
        </div>

        {/* Bulk Action Buttons (Optional/Demo) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (devices.length > 0) {
                alert("Triggered inventory spreadsheet download (Mock).");
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-250"
          >
            <FaDownload className="text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        {/* Search */}
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 transition-colors"
            placeholder="Search hostname or config content..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <FaFilter className="text-slate-400 text-[10px]" />
            <span>Type:</span>
          </span>
          <select
            className="bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
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
            className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs text-slate-700 focus:outline-none"
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
      <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white">
        {paginatedDevices.length === 0 ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-medium">No configurations found matching current filters.</p>
            <p className="text-xs text-slate-500">Try modifying your search query or uploading new files.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold text-xs uppercase font-mono tracking-wider">
                <th className="px-6 py-3.5">Device Name</th>
                <th className="px-6 py-3.5">Device Type</th>
                <th className="px-6 py-3.5">File Location</th>
                <th className="px-6 py-3.5">Interface Count</th>
                <th className="px-6 py-3.5">Parsed At</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedDevices.map((device) => {
                const intfCount = device.parsed_data ? (device.parsed_data.interfaces_count || 0) : 0;
                return (
                  <tr
                    key={device._id || device.id}
                    className="hover:bg-slate-50/50 transition-colors text-slate-700"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 truncate max-w-[180px]" title={device.device_name}>
                      {device.device_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${device.device_type === 'Switch' ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' :
                          device.device_type === 'Router' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            device.device_type === 'Firewall' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              device.device_type === 'AccessPoint' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                'bg-slate-100 text-slate-600 border border-slate-150'
                        }`}>
                        {device.device_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 max-w-[200px] truncate" title={device.file_path}>
                      {device.file_path ? device.file_path.split('/').pop() : 'Direct Upload'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {intfCount > 0 ? `${intfCount} ports` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDate(device.parsed_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onViewDevice(device)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <FaEye className="text-xs text-slate-500" />
                          <span>View</span>
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
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                  className={`w-7 h-7 rounded border font-semibold ${isCurrent
                      ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    } transition-colors`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
