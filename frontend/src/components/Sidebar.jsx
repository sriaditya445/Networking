import React from 'react';
import { useState } from "react";

import {
  FaChartPie,
  FaServer,
  FaUpload,
  FaHdd,
  FaChartLine,
  FaTasks,
  FaTerminal,
  FaDownload,
  FaCog,
  FaSignOutAlt,
  FaUserCircle,
  FaBars,
  FaTimes,
  FaBuilding,
  FaNetworkWired,
  FaFileCode,
  FaShieldAlt,
  FaChevronDown,
  FaChevronRight,
} from 'react-icons/fa';

function Sidebar({
  activeTab,
  setActiveTab,
  backendOnline,
  isCollapsed,
  setIsCollapsed
}) {

  const menuSections = [
    {
      key: "dashboard",
      title: "Dashboard",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: FaChartPie
        }
      ]
    },

    {
      key: "audit",
      title: "Audit",
      icon: FaShieldAlt,
      items: [
        {
          id: "inventory",
          label: "Assets",
          icon: FaServer
        },
        {
          id: "upload_parent",
          label: "Config Ingestion",
          icon: FaUpload,

          children: [
            {
              id: "upload",
              label: "Upload Center"
            },
            {
              id: "upload_folder",
              label: "Configuration Folder"
            },
            {
              id: "upload_zip",
              label: "ZIP Archive"
            },
            {
              id: "upload_topology",
              label: "Network Topology"
            },
            {
              id: "upload_excel",
              label: "Excel Mapping"
            },
            {
              id: "upload_api",
              label: "API Import"
            },
            {
              id: "upload_git",
              label: "Git Repository"
            },
            {
              id: "upload_sftp",
              label: "SFTP Import"
            }
          ]
        },
        // {
        //   id: "devices",
        //   label: "Discovered Devices",
        //   icon: FaHdd
        // },
        {
          id: "queue",
          label: "Audit Workspace",
          icon: FaTasks
        },
        // {
        //   id: "audit_dashboard",
        //   label: "Audit Dashboard",
        //   icon: FaShieldAlt
        // },
        // {
        //   id: "analytics",
        //   label: "Reports & Insights",
        //   icon: FaChartLine
        // }
      ]
    },

    {
      key: "administration",
      title: "Administration",
      icon: FaBuilding,
      items: [
        {
          id: "vendor_management",
          label: "Vendor Management",
          icon: FaBuilding
        },
        {
          id: "device_management",
          label: "Device Management",
          icon: FaNetworkWired
        },
        {
          id: "template_management",
          label: "Template Management",
          icon: FaFileCode
        }
      ]
    },

    // {
    //   key: "system",
    //   title: "System",
    //   icon: FaCog,
    //   items: [
    //     {
    //       id: "downloads",
    //       label: "Downloads",
    //       icon: FaDownload
    //     },
    //     {
    //       id: "settings",
    //       label: "Settings",
    //       icon: FaCog
    //     }
    //   ]
    // }
  ];



  const [openSections, setOpenSections] = useState({
    audit: true,
    administration: true,
    system: true
  });
  const [openMenus, setOpenMenus] = useState({
    upload_parent: false,
  });

  React.useEffect(() => {
    if (activeTab && activeTab.startsWith('upload')) {
      setOpenMenus(prev => ({ ...prev, upload_parent: true }));
    }
  }, [activeTab]);

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };




  return (
    <aside
      className={`
        fixed inset-y-0 left-0
        ${isCollapsed ? 'w-20' : 'w-64'}
        bg-[#090d22]
        text-slate-100
        flex flex-col
        z-30
        shadow-xl
        border-r border-slate-900
        transition-all duration-300
      `}
    >
      {/* BRAND SECTION */}
      <div className="p-6 border-b border-slate-900 flex flex-col gap-1.5">
        {/* COLLAPSE BUTTON */}
        <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} mb-4`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 transition"
          >
            {isCollapsed ? (
              <FaBars className="text-lg" />
            ) : (
              <FaTimes className="text-lg" />
            )}
          </button>
        </div>

        {/* LOGO */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          {/* LOGO ICON */}
          <div
            className="
              w-10 h-10
              rounded-xl
              bg-gradient-to-br from-cyan-400 to-purple-600
              flex items-center justify-center
              font-bold text-xl text-white
              shadow-[0_0_15px_rgba(6,182,212,0.3)]
            "
          >
            N
          </div>

          {/* LOGO TEXT */}
          {!isCollapsed && (
            <div>
              <h1 className="font-extrabold text-base leading-none text-white tracking-tight">
                Netkode
              </h1>
              <span className="text-[9px] text-[#00d8f6] font-extrabold tracking-wider uppercase block mt-0.5">
                YOUR NETWORK. VERIFIED
              </span>
            </div>
          )}
        </div>

        {/* STATUS */}
        {!isCollapsed && (
          <div
            className="
              mt-3
              flex items-center gap-2
              px-2.5 py-1.5
              rounded-lg
              bg-[#131b3e]/40
              border border-slate-800/40
              text-[10px]
              font-semibold
            "
          >
            <span
              className={`
                w-1.5 h-1.5 rounded-full animate-pulse
                ${backendOnline
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                }
              `}
            />
            <span className={backendOnline ? 'text-emerald-400' : 'text-rose-400'}>
              {backendOnline ? 'System Online' : 'System Offline'}
            </span>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5 scrollbar-thin">
        {menuSections.map((section) => (
          <div key={section.key}>
            {/* Flat header for groups matching the mockup */}
            {section.key !== "dashboard" && !isCollapsed && (
              <div className="px-3 py-2 mt-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {section.title}
              </div>
            )}

            {(section.key === "dashboard" || isCollapsed || openSections[section.key]) && (
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isParentActive = activeTab === item.id || (item.children && item.children.some(c => c.id === activeTab));
                  const isMenuOpen = openMenus[item.id];

                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={() => {
                          if (item.children) {
                            setOpenMenus(prev => ({
                              ...prev,
                              [item.id]: !prev[item.id]
                            }));
                            return;
                          }
                          setActiveTab(item.id);
                        }}
                        title={isCollapsed ? item.label : ""}
                        className={`
                          w-full
                          flex items-center
                          ${isCollapsed ? 'justify-center' : 'gap-3.5 px-4'}
                          py-2.5
                          rounded-xl
                          text-xs
                          font-bold
                          transition-all duration-250
                          group
                          ${isParentActive
                            ? `
                              bg-[#131e3d]
                              border border-blue-500/15
                              text-white
                            `
                            : `
                              text-slate-400
                              hover:text-slate-200
                              hover:bg-slate-800/25
                            `
                          }
                        `}
                      >
                        <Icon
                          className={`
                            text-sm
                            ${isParentActive ? 'text-[#00d8f6]' : 'text-slate-400'}
                          `}
                        />

                        {!isCollapsed && (
                          <span className="flex-1 text-left">{item.label}</span>
                        )}

                        {!isCollapsed && item.children && (
                          <FaChevronDown
                            className={`
                              text-[10px] text-slate-500 group-hover:text-slate-300 transition-transform duration-200
                              ${isMenuOpen ? 'rotate-180' : ''}
                            `}
                          />
                        )}

                        {!isCollapsed && isParentActive && !item.children && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00d8f6]" />
                        )}
                      </button>

                      {/* Dropdown Children */}
                      {!isCollapsed && item.children && isMenuOpen && (
                        <div className="pl-9 pr-2 py-1 space-y-1 bg-slate-950/20 rounded-xl">
                          {item.children.map((child) => {
                            const isChildActive = activeTab === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => setActiveTab(child.id)}
                                className={`
                                  w-full text-left py-2 px-3 rounded-lg text-[11px] font-bold transition-all block
                                  ${isChildActive
                                    ? 'text-[#00d8f6] bg-[#131e3d]/45 font-bold shadow-sm'
                                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-850/30'
                                  }
                                `}
                              >
                                {child.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* PROFILE SECTION */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/20 flex flex-col gap-2.5">
        {/* USER */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2 py-1'}`}>
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              TA
            </div>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                TA
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">
                  Tamarapalli Aditya
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Network Administrator
                </p>
              </div>
            </>
          )}
        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to log out of the Network Dashboard?")) {
              alert("Logged out (Demo mode - session reset).");
            }
          }}
          className="
            w-full
            flex items-center justify-center gap-2
            py-2 px-4
            border border-rose-500/40
            hover:bg-rose-500/10
            rounded-xl
            text-xs
            font-bold
            text-rose-400
            transition-colors
          "
        >
          <FaSignOutAlt className="text-xs animate-pulse" />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;