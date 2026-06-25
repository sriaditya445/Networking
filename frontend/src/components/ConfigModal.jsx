import React, { useState, useEffect } from 'react';
import { FaCopy, FaDownload, FaTimes, FaTerminal, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import useEscapeKey from '../hooks/useEscapeKey';

function ConfigModal({ selectedDevice, onClose, apiBaseUrl }) {
  useEscapeKey(onClose);
  const [copied, setCopied] = useState(false);
  const [configText, setConfigText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deviceId = selectedDevice?._id || selectedDevice?.id;

  // Fetch configuration dynamically from backend
  useEffect(() => {
    if (!deviceId) return;
    
    const fetchConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/devices/${deviceId}/configuration`);
        if (res.ok) {
          const data = await res.json();
          setConfigText(data.configuration || "");
        } else {
          const errorData = await res.json();
          setError(errorData.detail || "Failed to load device configuration.");
        }
      } catch (err) {
        console.error(err);
        setError("Error connecting to backend server.");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [deviceId, apiBaseUrl]);

  if (!selectedDevice) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(configText || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    const downloadUrl = `${apiBaseUrl}/api/devices/${deviceId}/download`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-100 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 block" />
              <span className="w-3 h-3 rounded-full bg-amber-500 block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 block" />
            </div>
            <span className="text-slate-300 font-medium">|</span>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <FaTerminal className="text-blue-500 text-xs" />
              <span>{selectedDevice.device_name}.cfg</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={loading || !!error}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-sm ${
                copied
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FaCopy className="text-xs" />
              <span>{copied ? 'COPIED!' : 'COPY'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
            >
              <FaDownload className="text-xs" />
              <span>DOWNLOAD</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition ml-2"
              aria-label="Close configuration viewer"
            >
              <FaTimes className="text-base" />
            </button>
          </div>
        </div>

        {/* Device Summary Subheader */}
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-150 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-700">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-extrabold">Device Name</span>
            <span className="text-slate-800 font-black truncate">{selectedDevice.device_name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-extrabold">Device Type</span>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-650 text-[10px] font-black capitalize">
                {selectedDevice.device_type}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-extrabold">File Path</span>
            <span className="text-slate-600 font-medium truncate" title={selectedDevice.file_path}>
              {selectedDevice.file_path || 'Direct Upload'}
            </span>
          </div>
        </div>

        {/* Config Content Panel */}
        <div className="flex-1 overflow-auto bg-slate-50/30 p-6 font-mono text-sm leading-relaxed text-slate-800 border-b border-slate-150 relative">
          
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 gap-3">
              <FaSpinner className="animate-spin text-2xl text-blue-600" />
              <span className="text-xs font-bold text-slate-500 font-sans">Loading device configuration...</span>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 gap-2 p-6 text-center">
              <FaExclamationTriangle className="text-2xl text-rose-500" />
              <span className="text-xs font-bold text-slate-700 font-sans">{error}</span>
            </div>
          ) : (
            <div className="space-y-6">
              {selectedDevice.parsed_data && (
                <div className="p-4 rounded-2xl bg-white border border-slate-150 text-xs font-sans grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
                  <div>
                    <span className="text-slate-450 font-bold block mb-1.5">Identified Interfaces ({selectedDevice.parsed_data.interfaces_count || 0}):</span>
                    {selectedDevice.parsed_data.interfaces && selectedDevice.parsed_data.interfaces.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                        {selectedDevice.parsed_data.interfaces.map((intf, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded-lg border border-slate-150 text-[10px] font-bold">
                            {intf}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">None extracted</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-455 font-bold block mb-1.5">Routing Protocols / VLANs:</span>
                    <div className="space-y-1.5">
                      {selectedDevice.parsed_data.protocols && selectedDevice.parsed_data.protocols.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Protocols:</span>
                          <span className="text-slate-750 font-bold">{selectedDevice.parsed_data.protocols.join(', ')}</span>
                        </div>
                      )}
                      {selectedDevice.parsed_data.vlans && selectedDevice.parsed_data.vlans.length > 0 && (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">VLANs:</span>
                          <span className="text-slate-750 font-bold">{selectedDevice.parsed_data.vlans.join(', ')}</span>
                        </div>
                      )}
                      {(!selectedDevice.parsed_data.protocols || selectedDevice.parsed_data.protocols.length === 0) &&
                        (!selectedDevice.parsed_data.vlans || selectedDevice.parsed_data.vlans.length === 0) && (
                          <span className="text-slate-400 italic">None identified</span>
                        )}
                    </div>
                  </div>
                </div>
              )}

              <pre className="overflow-x-auto whitespace-pre font-mono text-xs text-slate-700 bg-white p-5 rounded-2xl border border-slate-150 max-h-[500px] shadow-inner leading-relaxed">
                {configText || 'Empty configuration content.'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex justify-between items-center text-xs text-slate-500 font-mono border-t border-slate-150">
          <span>Parsed Date: {selectedDevice.parsed_at ? new Date(selectedDevice.parsed_at).toLocaleString() : 'N/A'}</span>
          <span>Lines: {configText ? configText.split('\n').length : 0}</span>
        </div>
      </div>
    </div>
  );
}

export default ConfigModal;
