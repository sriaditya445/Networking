import React, { useState } from 'react';
import { FaCog, FaDatabase, FaServer, FaHdd } from 'react-icons/fa';

function SettingsTab({ apiBaseUrl, backendOnline }) {
  const [url, setUrl] = useState(apiBaseUrl);
  const [pollingRate, setPollingRate] = useState(5);
  const [autoScroll, setAutoScroll] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    alert(`Settings saved. (Demo mode - settings stored in React context). \nAPI URL: ${url} \nPolling interval: ${pollingRate} seconds`);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm max-w-4xl space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">System Settings</h2>
        <p className="text-xs text-slate-500">Configure connection strings, parser parameters, and workspace setups.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API connection */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <FaServer className="text-slate-400 text-xs" />
            <span>Connection Profile</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block" htmlFor="apiEndpoint">
                FastAPI Gateway URL
              </label>
              <input
                id="apiEndpoint"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block">
                Database Status
              </label>
              <div className="flex items-center gap-2 h-9 px-3 border border-slate-200 rounded-xl bg-slate-50/50 text-xs text-slate-700 font-semibold font-mono">
                <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>MongoDB: {backendOnline ? 'CONNECTED' : 'DISCONNECTED'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Polling rules */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <FaDatabase className="text-slate-400 text-xs" />
            <span>Sync & Polling Cycles</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block" htmlFor="syncRate">
                Polling Interval (Seconds)
              </label>
              <input
                id="syncRate"
                type="number"
                min={2}
                max={30}
                value={pollingRate}
                onChange={(e) => setPollingRate(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block">
                Real-time Sync
              </label>
              <div className="flex items-center gap-2 h-9">
                <input
                  type="checkbox"
                  id="syncCheck"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-400 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="syncCheck" className="text-xs text-slate-600 font-semibold cursor-pointer">
                  Automatically refresh list when active jobs complete
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Parser configurations */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <FaHdd className="text-slate-400 text-xs" />
            <span>Regex Fingerprints</span>
          </h3>
          <p className="text-xs text-slate-450">
            Regex heuristics are locked and managed by the FastAPI parser engine. To alter parsing logic, modify the `parser.py` codebase in the backend module.
          </p>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-sm"
          >
            Save Configuration Settings
          </button>
        </div>
      </form>
    </div>
  );
}

export default SettingsTab;
