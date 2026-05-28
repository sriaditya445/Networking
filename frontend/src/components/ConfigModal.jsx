import React, { useState } from 'react';
import { FaCopy, FaDownload, FaTimes, FaTerminal, FaFileCode, FaLink } from 'react-icons/fa';

function ConfigModal({ selectedDevice, onClose, apiBaseUrl }) {
  const [copied, setCopied] = useState(false);

  if (!selectedDevice) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedDevice.configuration || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    const downloadUrl = `${apiBaseUrl}/api/devices/${selectedDevice._id || selectedDevice.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* IDE Header Bar */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 block" />
              <span className="w-3 h-3 rounded-full bg-amber-500 block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 block" />
            </div>
            <span className="text-slate-800 font-medium">|</span>
            <div className="flex items-center gap-2 text-slate-300 font-mono text-sm">
              <FaTerminal className="text-cyan-400 text-xs" />
              <span>{selectedDevice.device_name}.cfg</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all ${
                copied 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-300'
              }`}
            >
              <FaCopy className="text-xs" />
              <span>{copied ? 'COPIED!' : 'COPY'}</span>
            </button>
            
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
            >
              <FaDownload className="text-xs" />
              <span>DOWNLOAD</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors ml-2"
              aria-label="Close configuration viewer"
            >
              <FaTimes className="text-base" />
            </button>
          </div>
        </div>

        {/* Device Summary Subheader */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Device Name</span>
            <span className="text-slate-200 font-semibold truncate">{selectedDevice.device_name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Device Type</span>
            <div>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedDevice.device_type === 'Switch' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                selectedDevice.device_type === 'Router' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                selectedDevice.device_type === 'Firewall' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                selectedDevice.device_type === 'AccessPoint' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                'bg-slate-700/20 text-slate-400 border border-slate-700/30'
              }`}>
                {selectedDevice.device_type}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">File Path</span>
            <span className="text-slate-300 truncate" title={selectedDevice.file_path}>
              {selectedDevice.file_path || 'Direct Upload'}
            </span>
          </div>
        </div>

        {/* Config Content Panel */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6 font-mono text-sm leading-relaxed text-slate-300 border-b border-slate-800">
          {selectedDevice.parsed_data && (
            <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block mb-1">Identified Interfaces ({selectedDevice.parsed_data.interfaces_count || 0}):</span>
                {selectedDevice.parsed_data.interfaces && selectedDevice.parsed_data.interfaces.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {selectedDevice.parsed_data.interfaces.map((intf, idx) => (
                      <span key={idx} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                        {intf}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">None extracted</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Routing Protocols / VLANs:</span>
                <div className="flex flex-col gap-1">
                  {selectedDevice.parsed_data.protocols && selectedDevice.parsed_data.protocols.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 mr-1.5 font-bold">Protocols:</span>
                      <span className="text-slate-300">{selectedDevice.parsed_data.protocols.join(', ')}</span>
                    </div>
                  )}
                  {selectedDevice.parsed_data.vlans && selectedDevice.parsed_data.vlans.length > 0 && (
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 mr-1.5 font-bold">VLANs:</span>
                      <span className="text-slate-300">{selectedDevice.parsed_data.vlans.join(', ')}</span>
                    </div>
                  )}
                  {(!selectedDevice.parsed_data.protocols || selectedDevice.parsed_data.protocols.length === 0) &&
                   (!selectedDevice.parsed_data.vlans || selectedDevice.parsed_data.vlans.length === 0) && (
                     <span className="text-slate-500 italic">None identified</span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <pre className="overflow-x-auto whitespace-pre font-mono text-xs text-slate-400 bg-slate-900/50 p-4 rounded-xl border border-slate-900 max-h-[500px]">
            {selectedDevice.configuration || 'Empty configuration content.'}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-4 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>Parsed Date: {selectedDevice.parsed_at ? new Date(selectedDevice.parsed_at).toLocaleString() : 'N/A'}</span>
          <span>Lines: {selectedDevice.configuration ? selectedDevice.configuration.split('\n').length : 0}</span>
        </div>
      </div>
    </div>
  );
}

export default ConfigModal;
