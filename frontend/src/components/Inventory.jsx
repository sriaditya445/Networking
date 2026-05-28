import React from 'react';
import { FaAngleRight } from 'react-icons/fa';

function Inventory({ devices, onTypeClick }) {
  // Counts
  const switches = devices.filter(d => d.device_type === 'Switch');
  const routers = devices.filter(d => d.device_type === 'Router');
  const firewalls = devices.filter(d => d.device_type === 'Firewall');
  const aps = devices.filter(d => d.device_type === 'AccessPoint');
  const wlcs = devices.filter(d => d.device_type === 'WLC');
  const unknowns = devices.filter(d => !['Switch', 'Router', 'Firewall', 'AccessPoint', 'WLC'].includes(d.device_type));

  const components = [
    {
      id: 'Switch',
      title: 'Switches',
      count: switches.length,
      status: 'Operational',
      badgeColor: 'bg-cyan-50 text-cyan-600 border-cyan-150',
      description: 'L2/L3 Network switches identified via "switchport" configuration directives.',
      gradient: 'from-cyan-500/20 to-teal-500/10 hover:border-cyan-400/40',
      // SVG: Switchboard matrix ports
      svg: (
        <svg viewBox="0 0 100 60" className="w-full h-full text-cyan-500 opacity-80 group-hover:scale-105 transition-transform duration-300">
          <rect x="5" y="10" width="90" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="5" y1="23" x2="95" y2="23" stroke="currentColor" strokeWidth="1.5" />
          {/* Ports grid */}
          <rect x="15" y="14" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="27" y="14" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="39" y="14" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="51" y="14" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="63" y="14" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="75" y="14" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          
          <rect x="15" y="27" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="27" y="27" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="39" y="27" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="51" y="27" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="63" y="27" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="75" y="27" width="8" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          {/* Console LED */}
          <circle cx="88" cy="16" r="2" fill="currentColor" className="animate-pulse" />
        </svg>
      )
    },
    {
      id: 'Router',
      title: 'Routers',
      count: routers.length,
      status: 'Active',
      badgeColor: 'bg-purple-50 text-purple-600 border-purple-150',
      description: 'IP routing backbones matching "router ospf", "bgp", or static routes.',
      gradient: 'from-purple-500/20 to-indigo-500/10 hover:border-purple-400/40',
      // SVG: Cisco 3D Cylinder Arrow Router
      svg: (
        <svg viewBox="0 0 100 60" className="w-full h-full text-purple-500 opacity-80 group-hover:scale-105 transition-transform duration-300">
          <ellipse cx="50" cy="22" rx="40" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
          <ellipse cx="50" cy="38" rx="40" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="22" x2="10" y2="38" stroke="currentColor" strokeWidth="2" />
          <line x1="90" y1="22" x2="90" y2="38" stroke="currentColor" strokeWidth="2" />
          {/* Router arrows */}
          <path d="M 28 22 L 40 22 M 40 22 L 35 18 M 40 22 L 35 26" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M 72 22 L 60 22 M 60 22 L 65 18 M 60 22 L 65 26" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M 50 14 L 50 30 M 50 30 L 46 25 M 50 30 L 54 25" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )
    },
    {
      id: 'Firewall',
      title: 'Firewalls',
      count: firewalls.length,
      status: 'Secured',
      badgeColor: 'bg-rose-50 text-rose-600 border-rose-150',
      description: 'Security gateways identified by firewall access control and security-level tags.',
      gradient: 'from-rose-500/20 to-orange-500/10 hover:border-rose-400/40',
      // SVG: Brick wall shield
      svg: (
        <svg viewBox="0 0 100 60" className="w-full h-full text-rose-500 opacity-80 group-hover:scale-105 transition-transform duration-300">
          {/* Shield outline */}
          <path d="M 50 5 L 85 15 L 80 40 C 70 52 50 58 50 58 C 50 58 30 52 20 40 L 15 15 Z" fill="none" stroke="currentColor" strokeWidth="2" />
          {/* Wall design inside */}
          <line x1="28" y1="20" x2="72" y2="20" stroke="currentColor" strokeWidth="1" />
          <line x1="22" y1="30" x2="78" y2="30" stroke="currentColor" strokeWidth="1" />
          <line x1="25" y1="40" x2="75" y2="40" stroke="currentColor" strokeWidth="1" />
          {/* Vertical bricks */}
          <line x1="40" y1="10" x2="40" y2="20" stroke="currentColor" strokeWidth="1" />
          <line x1="60" y1="10" x2="60" y2="20" stroke="currentColor" strokeWidth="1" />
          <line x1="50" y1="20" x2="50" y2="30" stroke="currentColor" strokeWidth="1" />
          <line x1="30" y1="20" x2="30" y2="30" stroke="currentColor" strokeWidth="1" />
          <line x1="70" y1="20" x2="70" y2="30" stroke="currentColor" strokeWidth="1" />
          <line x1="40" y1="30" x2="40" y2="40" stroke="currentColor" strokeWidth="1" />
          <line x1="60" y1="30" x2="60" y2="40" stroke="currentColor" strokeWidth="1" />
        </svg>
      )
    },
    {
      id: 'AccessPoint',
      title: 'Access Points',
      count: aps.length,
      status: 'Broadcasting',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-150',
      description: 'Wireless nodes identified via "wlan", "ap name", or SSID configs.',
      gradient: 'from-emerald-500/20 to-teal-500/10 hover:border-emerald-400/40',
      // SVG: Radio waves dome
      svg: (
        <svg viewBox="0 0 100 60" className="w-full h-full text-emerald-500 opacity-80 group-hover:scale-105 transition-transform duration-300">
          {/* AP chassis dome */}
          <path d="M 30 45 C 30 25 70 25 70 45 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <rect x="25" y="45" width="50" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          {/* Radio Waves */}
          <path d="M 40 25 A 15 15 0 0 1 60 25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
          <path d="M 32 18 A 25 25 0 0 1 68 18" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M 24 10 A 35 35 0 0 1 76 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="50" cy="38" r="1.5" fill="currentColor" />
        </svg>
      )
    },
    {
      id: 'WLC',
      title: 'WLC (Wireless Controller)',
      count: wlcs.length,
      status: 'Operational',
      badgeColor: 'bg-amber-50 text-amber-600 border-amber-150',
      description: 'Wireless LAN Controllers managing wireless networks and AP grouping profiles.',
      gradient: 'from-amber-500/20 to-yellow-500/10 hover:border-amber-400/40',
      // SVG: Controller rack panel
      svg: (
        <svg viewBox="0 0 100 60" className="w-full h-full text-amber-500 opacity-80 group-hover:scale-105 transition-transform duration-300">
          <rect x="5" y="15" width="90" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="15" cy="30" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="25" cy="30" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
          {/* Antenna lines */}
          <line x1="50" y1="30" x2="70" y2="30" stroke="currentColor" strokeWidth="1" />
          <line x1="50" y1="25" x2="70" y2="25" stroke="currentColor" strokeWidth="1" />
          {/* Wireless signal indicator */}
          <path d="M 80 22 C 83 25 83 35 80 38" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M 85 18 C 90 22 90 38 85 42" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="75" cy="30" r="1.5" fill="currentColor" />
        </svg>
      )
    },
    {
      id: 'Unknown',
      title: 'Unknown Devices',
      count: unknowns.length,
      status: 'Pending Segregation',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      description: 'Fallback categorizations for configurations without clear fingerprint keywords.',
      gradient: 'from-slate-500/25 to-zinc-500/10 hover:border-slate-400/40',
      // SVG: Box with question mark
      svg: (
        <svg viewBox="0 0 100 60" className="w-full h-full text-slate-500 opacity-80 group-hover:scale-105 transition-transform duration-300">
          <rect x="15" y="10" width="70" height="40" rx="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
          {/* Question mark */}
          <path d="M 45 20 C 45 15, 55 15, 55 20 C 55 24, 50 24, 50 28" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="35" r="2" fill="currentColor" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Network Inventory</h2>
        <p className="text-sm text-slate-500">
          Select a network component type to audit and examine the corresponding configuration files.
        </p>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {components.map((comp) => (
          <div
            key={comp.id}
            onClick={() => onTypeClick(comp.id)}
            className={`group bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between h-72 shadow-sm hover:shadow-md cursor-pointer transition-all-300 hover:-translate-y-1.5 relative overflow-hidden bg-gradient-to-br ${comp.gradient}`}
          >
            {/* Custom visual schematic container */}
            <div className="absolute top-6 right-6 w-20 h-16">
              {comp.svg}
            </div>

            {/* Content Top */}
            <div className="space-y-2 max-w-[70%]">
              <span className={`inline-block px-2 py-0.5 border rounded-full text-[9px] font-bold tracking-wider uppercase ${comp.badgeColor}`}>
                {comp.status}
              </span>
              <h3 className="text-lg font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">
                {comp.title}
              </h3>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-500 leading-relaxed max-w-[90%] mt-2">
              {comp.description}
            </p>

            {/* Bottom Counter & Link */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-auto">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Total Assets</span>
                <span className="text-2xl font-bold text-slate-850 font-mono mt-1">{comp.count}</span>
              </div>
              <span className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700 flex items-center justify-center transition-all-300 shadow-sm border border-slate-200/40">
                <FaAngleRight className="group-hover:translate-x-0.5 transition-transform text-sm" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Inventory;
