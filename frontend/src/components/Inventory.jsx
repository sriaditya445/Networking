import React, { useState } from 'react';
import {
  FaNetworkWired,
  FaRoute,
  FaShieldAlt,
  FaWifi,
  FaServer,
  FaQuestionCircle,
  FaAngleRight,
  FaFilter
} from "react-icons/fa";

function Inventory({ devices, jobs, onTypeClick }) {
  const [selectedFolder, setSelectedFolder] = useState('');

  // Extract unique folder names
  const uniqueFolders = [...new Set(jobs.map(job => job.folder_name))];

  // Filter devices based on selected folder
  const filteredDevices = selectedFolder
    ? devices.filter(d => {
      const deviceJob = jobs.find(j => (j._id || j.id) === d.upload_id);
      return deviceJob && deviceJob.folder_name === selectedFolder;
    })
    : devices;

  // Counts based on filtered devices
  const switches = filteredDevices.filter(
    d =>
      d.device_type === "L2 Switch" ||
      d.device_type === "L3 Switch" ||
      d.device_type === "Core Switch"
  );
  const routers = filteredDevices.filter(d => d.device_type === 'Router');
  const firewalls = filteredDevices.filter(d => d.device_type === 'Firewall');
  const aps = filteredDevices.filter(d => d.device_type === 'AccessPoint');
  const wlcs = filteredDevices.filter(d => d.device_type === 'WLC');
  // const unknowns = filteredDevices.filter(d => !['Switch', 'Router', 'Firewall', 'AccessPoint', 'WLC'].includes(d.device_type));

  const unknowns = filteredDevices.filter(
    d =>
      ![
        "L2 Switch",
        "L3 Switch",
        "Core Switch",
        "Router",
        "Firewall",
        "AccessPoint",
        "WLC"
      ].includes(d.device_type)
  );
  console.log(filteredDevices);
  const l2Count = filteredDevices.filter(
    d => d.device_type === "L2 Switch"
  ).length;

  const l3Count = filteredDevices.filter(
    d => d.device_type === "L3 Switch"
  ).length;

  const coreCount = filteredDevices.filter(
    d => d.device_type === "Core Switch"
  ).length;
  const components = [
    {
      id: 'Switch',
      title: 'Switches',
      count: switches.length,
      devicesList: switches,
      status: 'Operational',
      badgeColor: 'bg-cyan-50 text-cyan-600 border-cyan-150',
      description: 'L2/L3 Network switches identified via "switchport" configuration directives.',
      gradient: 'from-cyan-500/20 to-teal-500/10 hover:border-cyan-400/40',
      // SVG: Switchboard matrix ports
      icon: <FaNetworkWired className="text-5xl text-cyan-500" />,

      subCategories: {
        l2: l2Count,
        l3: l3Count,
        core: coreCount
      }
    },
    {
      id: 'Router',
      title: 'Routers',
      count: routers.length,
      devicesList: routers,
      status: 'Active',
      badgeColor: 'bg-purple-50 text-purple-600 border-purple-150',
      description: 'IP routing backbones matching "router ospf", "bgp", or static routes.',
      gradient: 'from-purple-500/20 to-indigo-500/10 hover:border-purple-400/40',
      // SVG: Cisco 3D Cylinder Arrow Router
      icon: <FaRoute className="text-5xl text-purple-500" />
    },
    {
      id: 'Firewall',
      title: 'Firewalls',
      count: firewalls.length,
      devicesList: firewalls,
      status: 'Secured',
      badgeColor: 'bg-rose-50 text-rose-600 border-rose-150',
      description: 'Security gateways identified by firewall access control and security-level tags.',
      gradient: 'from-rose-500/20 to-orange-500/10 hover:border-rose-400/40',
      // SVG: Brick wall shield
      icon: <FaShieldAlt className="text-5xl text-rose-500" />
    },
    {
      id: 'AccessPoint',
      title: 'Access Points',
      count: aps.length,
      devicesList: aps,
      status: 'Broadcasting',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-150',
      description: 'Wireless nodes identified via "wlan", "ap name", or SSID configs.',
      gradient: 'from-emerald-500/20 to-teal-500/10 hover:border-emerald-400/40',
      // SVG: Radio waves dome
      icon: <FaWifi className="text-5xl text-emerald-500" />
    },
    {
      id: 'WLC',
      title: 'WLC (Wireless Controller)',
      count: wlcs.length,
      devicesList: wlcs,
      status: 'Operational',
      badgeColor: 'bg-amber-50 text-amber-600 border-amber-150',
      description: 'Wireless LAN Controllers managing wireless networks and AP grouping profiles.',
      gradient: 'from-amber-500/20 to-yellow-500/10 hover:border-amber-400/40',
      // SVG: Controller rack panel
      icon: <FaServer className="text-5xl text-amber-500" />
    },
    {
      id: 'Unknown',
      title: 'Unknown Devices',
      count: unknowns.length,
      devicesList: unknowns,
      status: 'Pending Segregation',
      badgeColor: 'bg-slate-105 text-slate-600 border-slate-200',
      description: 'Fallback categorizations for configurations without clear fingerprint keywords.',
      gradient: 'from-slate-500/25 to-zinc-500/10 hover:border-slate-400/40',
      // SVG: Box with question mark
      icon: <FaQuestionCircle className="text-5xl text-slate-500" />
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

      {/* Folder Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 font-sans">
            <FaFilter className="text-slate-400 text-[10px]" />
            <span>Filter Inventory by Folder:</span>
          </span>
          <select
            className="bg-white border border-slate-200 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
          >
            <option value="">All Folders</option>
            {uniqueFolders.map((folder) => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {components.map((comp) => (
          <div
            key={comp.id}
            onClick={() => onTypeClick(comp.id, comp.devicesList)}
            className={`group bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between h-72 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden bg-gradient-to-br ${comp.gradient}`}
          >
            {/* Custom visual schematic container */}
            <div className="absolute top-6 right-6 opacity-80 group-hover:scale-110 transition-transform duration-300">
              {comp.icon}
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

            {/* Switch Sub Categories */}
            {comp.id === "Switch" && (
              <div className="mt-3 rounded-lg p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">L2 Switches</span>
                  <span className="font-semibold">
                    {comp.subCategories?.l2 || 0}
                  </span>
                </div>

                <div className="flex justify-between mt-1">
                  <span className="text-slate-600">L3 Switches</span>
                  <span className="font-semibold">
                    {comp.subCategories?.l3 || 0}
                  </span>
                </div>

                <div className="flex justify-between mt-1">
                  <span className="text-slate-600">Core Switches</span>
                  <span className="font-semibold">
                    {comp.subCategories?.core || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Counter & Link */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-auto">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Total Assets</span>
                <span className="text-2xl font-bold text-slate-800 font-mono mt-1">{comp.count}</span>
              </div>
              <span className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-slate-105 group-hover:text-slate-700 flex items-center justify-center transition-all duration-300 shadow-sm border border-slate-200/40">
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
