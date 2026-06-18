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

// Import stores and utilities
import { useDeviceStore } from '../store/deviceStore';
import { countDevicesByType } from '../utils/deviceUtils';

function Inventory({ devices, jobs, onTypeClick }) {
  const [selectedFolder, setSelectedFolder] = useState('');

  // Extract unique folder names from upload jobs
  const uniqueFolders = [...new Set(jobs.map(job => job.folder_name))];

  // Fetch manually created devices from Zustand store
  const vendorDevices = useDeviceStore(state => state.devices);

  // Normalize vendor devices to match the schema of discoverable devices
  const normalizedVendorDevices = vendorDevices.map(d => ({
    id: d.id,
    device_name: d.deviceName,
    device_type: d.deviceType,
    upload_id: 'vendor-stage', // mock ID so it is included in "All Folders"
    file_path: 'Manual Entry'
  }));

  // Combine discoverable backend devices and manually-created vendor devices
  const allDevices = [...devices, ...normalizedVendorDevices];

  // Filter devices based on selected folder
  const filteredDevices = selectedFolder
    ? allDevices.filter(d => {
        const deviceJob = jobs.find(j => (j._id || j.id) === d.upload_id);
        return deviceJob && deviceJob.folder_name === selectedFolder;
      })
    : allDevices;

  // Use reusable utility function to calculate counts
  const counts = countDevicesByType(filteredDevices);

  // Helper to filter devices list for modal detail clicks
  const getDevicesForType = (typeId) => {
    return filteredDevices.filter(device => {
      const type = (device.device_type || 'Unknown').trim();
      
      if (typeId === 'L2 Switch') {
        return type === 'L2 Switch' || type === 'Switch' || type.toLowerCase() === 'switch';
      }
      if (typeId === 'L3 Switch') {
        return type === 'L3 Switch';
      }
      if (typeId === 'Core Switch') {
        return type === 'Core Switch' || type === 'Nexus' || type.toLowerCase() === 'nexus';
      }
      if (typeId === 'Router') {
        return type === 'Router' || type.toLowerCase() === 'router';
      }
      if (typeId === 'Firewall') {
        return type === 'Firewall' || type.toLowerCase() === 'firewall';
      }
      if (typeId === 'Access Point') {
        return type === 'Access Point' || type === 'AccessPoint' || type.toLowerCase() === 'accesspoint';
      }
      if (typeId === 'WLC') {
        return type === 'WLC' || type.toLowerCase() === 'wlc';
      }
      if (typeId === 'Unknown') {
        return !['L2 Switch', 'L3 Switch', 'Core Switch', 'Switch', 'router', 'Router', 'firewall', 'Firewall', 'accesspoint', 'AccessPoint', 'Access Point', 'wlc', 'WLC', 'nexus', 'Nexus'].includes(type);
      }
      return false;
    });
  };

  const components = [
    {
      id: 'L2 Switch',
      title: 'L2 Switches',
      count: counts['L2 Switch'],
      status: 'Operational',
      badgeColor: 'bg-cyan-50 text-cyan-600 border-cyan-150',
      description: 'Layer 2 Ethernet access switches managing VLAN segment assignments and port securities.',
      gradient: 'from-cyan-500/20 to-teal-500/10 hover:border-cyan-400/40',
      icon: <FaNetworkWired className="text-5xl text-cyan-550" />
    },
    {
      id: 'L3 Switch',
      title: 'L3 Switches',
      count: counts['L3 Switch'],
      status: 'Operational',
      badgeColor: 'bg-blue-50 text-blue-650 border-blue-150',
      description: 'Layer 3 distribution switches performing inter-VLAN routing and local interface gateway bindings.',
      gradient: 'from-blue-500/20 to-indigo-500/10 hover:border-blue-400/40',
      icon: <FaNetworkWired className="text-5xl text-blue-550" />
    },
    {
      id: 'Core Switch',
      title: 'Core Switches',
      count: counts['Core Switch'],
      status: 'Operational',
      badgeColor: 'bg-indigo-50 text-indigo-650 border-indigo-150',
      description: 'High-speed backbone switch infrastructures managing network fabric routes and Nexus overlays.',
      gradient: 'from-indigo-500/20 to-purple-500/10 hover:border-indigo-400/40',
      icon: <FaNetworkWired className="text-5xl text-indigo-550" />
    },
    {
      id: 'Router',
      title: 'Routers',
      count: counts['Router'],
      status: 'Active',
      badgeColor: 'bg-purple-50 text-purple-650 border-purple-150',
      description: 'IP routing backbones handling WAN gateways, static routes, and routing protocols.',
      gradient: 'from-purple-500/20 to-pink-500/10 hover:border-purple-400/40',
      icon: <FaRoute className="text-5xl text-purple-555" />
    },
    {
      id: 'Firewall',
      title: 'Firewalls',
      count: counts['Firewall'],
      status: 'Secured',
      badgeColor: 'bg-rose-50 text-rose-650 border-rose-150',
      description: 'Security perimeter controllers enforcing access lists, traffic zones, and policy-map guidelines.',
      gradient: 'from-rose-500/20 to-orange-500/10 hover:border-rose-400/40',
      icon: <FaShieldAlt className="text-5xl text-rose-550" />
    },
    {
      id: 'Access Point',
      title: 'Access Points',
      count: counts['Access Point'],
      status: 'Broadcasting',
      badgeColor: 'bg-emerald-50 text-emerald-650 border-emerald-150',
      description: 'Wireless connectivity nodes facilitating corporate SSID propagation and local WLAN association.',
      gradient: 'from-emerald-500/20 to-teal-500/10 hover:border-emerald-400/40',
      icon: <FaWifi className="text-5xl text-emerald-555" />
    },
    {
      id: 'WLC',
      title: 'Wireless Controllers',
      count: counts['WLC'],
      status: 'Operational',
      badgeColor: 'bg-amber-50 text-amber-650 border-amber-150',
      description: 'Wireless LAN Controllers managing AP group assignments and corporate RF signal parameters.',
      gradient: 'from-amber-500/20 to-yellow-500/10 hover:border-amber-400/40',
      icon: <FaServer className="text-5xl text-amber-550" />
    },
    {
      id: 'Unknown',
      title: 'Unknown Devices',
      count: counts['Unknown'],
      status: 'Unclassified',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      description: 'Hardware items staging configurations without distinct signature directive matches.',
      gradient: 'from-slate-500/25 to-zinc-500/10 hover:border-slate-400/40',
      icon: <FaQuestionCircle className="text-5xl text-slate-450" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Network Inventory</h2>
        <p className="text-sm text-slate-500">
          Examine the hardware inventory and counts parsed from configuration files and manual additions.
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
            className="bg-white border border-slate-200 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-755 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {components.map((comp) => (
          <div
            key={comp.id}
            onClick={() => onTypeClick(comp.id, getDevicesForType(comp.id))}
            className={`group bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between h-64 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden bg-gradient-to-br ${comp.gradient}`}
          >
            {/* Custom visual schematic container */}
            <div className="absolute top-5 right-5 opacity-70 group-hover:scale-110 transition-transform duration-300">
              {comp.icon}
            </div>

            {/* Content Top */}
            <div className="space-y-1.5 max-w-[70%]">
              <span className={`inline-block px-2 py-0.5 border rounded-full text-[9px] font-bold tracking-wider uppercase ${comp.badgeColor}`}>
                {comp.status}
              </span>
              <h3 className="text-base font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">
                {comp.title}
              </h3>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-500 leading-relaxed max-w-[95%] mt-2">
              {comp.description}
            </p>

            {/* Bottom Counter & Link */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-4">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Total Assets</span>
                <span className="text-xl font-bold text-slate-800 font-mono mt-1">{comp.count}</span>
              </div>
              <span className="w-7 h-7 rounded-full bg-slate-50 text-slate-400 group-hover:bg-slate-105 group-hover:text-slate-700 flex items-center justify-center transition-all duration-300 shadow-sm border border-slate-200/40">
                <FaAngleRight className="group-hover:translate-x-0.5 transition-transform text-xs" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Inventory;
