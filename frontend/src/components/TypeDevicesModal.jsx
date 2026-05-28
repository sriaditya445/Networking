import React, { useState } from 'react';
import { FaTimes, FaEye, FaNetworkWired } from 'react-icons/fa';

function TypeDevicesModal({ type, devices, onClose, onViewDevice }) {

  // PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);

  // DEVICES PER PAGE
  const devicesPerPage = 5;

  // TOTAL PAGES
  const totalPages = Math.ceil(devices.length / devicesPerPage);

  // START & END INDEX
  const startIndex = (currentPage - 1) * devicesPerPage;
  const endIndex = startIndex + devicesPerPage;

  // CURRENT PAGE DEVICES
  const currentDevices = devices.slice(startIndex, endIndex);

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >

      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-500 flex items-center justify-center">
              <FaNetworkWired className="text-sm" />
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {type} Devices
              </h3>

              <p className="text-xs text-slate-500">
                List of all parsed configuration files classified as {type}
              </p>
            </div>

          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            aria-label={`Close ${type} devices list`}
          >
            <FaTimes className="text-base" />
          </button>

        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-6">

          {devices.length === 0 ? (

            <div className="flex flex-col items-center justify-center py-12 text-slate-400">

              <span className="text-4xl mb-3">🔍</span>

              <p className="text-sm font-medium">
                No devices found for this category.
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Upload matching configurations to populate this list.
              </p>

            </div>

          ) : (

            <>
              {/* TABLE */}
              <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-sm">

                <table className="w-full text-left border-collapse">

                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold text-xs font-mono uppercase">

                      <th className="px-6 py-3.5">
                        Device Name
                      </th>

                      <th className="px-6 py-3.5">
                        Device Type
                      </th>

                      <th className="px-6 py-3.5">
                        File Path
                      </th>

                      <th className="px-6 py-3.5">
                        Parsed At
                      </th>

                      <th className="px-6 py-3.5 text-right">
                        Actions
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm">

                    {currentDevices.map((device) => (

                      <tr
                        key={device._id || device.id}
                        className="hover:bg-slate-50/60 transition-colors text-slate-700"
                      >

                        {/* DEVICE NAME */}
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {device.device_name}
                        </td>

                        {/* DEVICE TYPE */}
                        <td className="px-6 py-4">

                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${device.device_type === 'Switch'
                                ? 'bg-cyan-100 text-cyan-700'
                                : device.device_type === 'Router'
                                  ? 'bg-purple-100 text-purple-700'
                                  : device.device_type === 'Firewall'
                                    ? 'bg-rose-100 text-rose-700'
                                    : device.device_type === 'AccessPoint'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-100 text-slate-700'
                              }`}
                          >
                            {device.device_type}
                          </span>

                        </td>

                        {/* FILE PATH */}
                        <td
                          className="px-6 py-4 text-xs font-mono text-slate-500 max-w-xs truncate"
                          title={device.file_path}
                        >
                          {device.file_path
                            ? device.file_path.split('/').pop()
                            : 'config'}
                        </td>

                        {/* PARSED DATE */}
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {device.parsed_at
                            ? new Date(device.parsed_at).toLocaleDateString()
                            : 'Pending'}
                        </td>

                        {/* ACTION */}
                        <td className="px-6 py-4 text-right">

                          <button
                            onClick={() => onViewDevice(device)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >

                            <FaEye className="text-xs text-slate-500" />

                            <span>View</span>

                          </button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              {/* PAGINATION */}
              <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">

                {/* PREVIOUS */}
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                >
                  Prev
                </button>

                {/* FIRST PAGE */}
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm"
                    >
                      1
                    </button>

                    {currentPage > 4 && (
                      <span className="px-1 text-slate-400">
                        ...
                      </span>
                    )}
                  </>
                )}

                {/* PAGE NUMBERS */}
                {Array.from({ length: totalPages }, (_, index) => {

                  const page = index + 1;

                  if (
                    page === currentPage ||
                    page === currentPage - 1 ||
                    page === currentPage - 2 ||
                    page === currentPage + 1 ||
                    page === currentPage + 2
                  ) {

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === page
                            ? 'bg-cyan-500 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  }

                  return null;

                })}

                {/* LAST PAGE */}
                {currentPage < totalPages - 2 && (
                  <>

                    {currentPage < totalPages - 3 && (
                      <span className="px-1 text-slate-400">
                        ...
                      </span>
                    )}

                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm"
                    >
                      {totalPages}
                    </button>

                  </>
                )}

                {/* NEXT */}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === totalPages
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                >
                  Next
                </button>

              </div>

            </>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 px-6 py-3 text-xs text-slate-500 font-mono border-t border-slate-100 flex justify-between">

          <span>
            Total: {devices.length} devices
          </span>

          <span>
            NetConfig Parser v1.0
          </span>

        </div>

      </div>

    </div>
  );
}

export default TypeDevicesModal;