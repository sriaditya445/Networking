import React, { useState } from 'react';
import { FaTerminal, FaFileCode, FaSearch, FaCopy, FaDownload } from 'react-icons/fa';

function Configurations({ devices, apiBaseUrl }) {
  const [selectedConfigId, setSelectedConfigId] = useState(devices[0]?._id || devices[0]?.id || null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedDevice = devices.find(d => (d._id || d.id) === selectedConfigId);

  const filtered = devices.filter(d => 
    d.device_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = async () => {
    if (selectedDevice) {
      try {
        await navigator.clipboard.writeText(selectedDevice.configuration || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Clipboard copy failed: ', err);
      }
    }
  };

  const handleDownload = () => {
    if (selectedDevice) {
      const downloadUrl = `${apiBaseUrl}/api/devices/${selectedDevice._id || selectedDevice.id}/download`;
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm h-[75vh] flex flex-col space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Configuration Browser</h2>
        <p className="text-xs text-slate-500">Interactive workspace to explorer configuration content.</p>
      </div>

      <div className="flex-1 flex overflow-hidden border border-slate-200 rounded-xl bg-slate-50">
        {/* Left Explorer index */}
        <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
          {/* Index Search */}
          <div className="p-3 border-b border-slate-100 relative">
            <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              placeholder="Search hostname..."
            />
          </div>
          
          {/* Index list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                No configurations found.
              </div>
            ) : (
              filtered.map(device => {
                const isSelected = (device._id || device.id) === selectedConfigId;
                return (
                  <button
                    key={device._id || device.id}
                    onClick={() => {
                      setSelectedConfigId(device._id || device.id);
                      setCopied(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold font-mono truncate transition-colors flex items-center gap-2 ${
                      isSelected
                        ? 'bg-slate-900 text-cyan-400'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <FaFileCode className={isSelected ? 'text-cyan-400' : 'text-slate-400'} />
                    <span>{device.device_name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Terminal pane */}
        <div className="flex-1 flex flex-col bg-slate-950 text-slate-300 overflow-hidden relative">
          {selectedDevice ? (
            <>
              {/* Header controls */}
              <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <FaTerminal className="text-cyan-400 text-[10px]" />
                  <span>{selectedDevice.device_name}.cfg</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className={`px-2.5 py-1 rounded border border-slate-700/60 hover:border-slate-600 transition-colors font-bold ${copied ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-slate-300'}`}
                  >
                    {copied ? 'COPIED!' : 'COPY'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-2.5 py-1 bg-cyan-500 text-slate-950 rounded font-bold hover:bg-cyan-400 transition-colors"
                  >
                    DOWNLOAD
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="flex-1 p-5 overflow-auto font-mono text-xs text-slate-400 leading-relaxed scrollbar-thin">
                <pre className="whitespace-pre overflow-x-auto bg-slate-900/40 p-4 rounded-xl border border-slate-900">
                  {selectedDevice.configuration || 'Empty configuration content.'}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2">
              <span className="text-3xl">📟</span>
              <span>No device configuration selected.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Configurations;
