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
        label: "Inventory",
        icon: FaServer
      },
      {
        id: "upload",
        label: "Upload Center",
        icon: FaUpload
      },
      {
        id: "devices",
        label: "Discovered Devices",
        icon: FaHdd
      },
      {
        id: "queue",
        label: "Processing Queue",
        icon: FaTasks
      },
      {
        id: "audit_dashboard",
        label: "Audit Dashboard",
        icon: FaShieldAlt
      },
      {
        id: "analytics",
        label: "Reports & Insights",
        icon: FaChartLine
      }
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

  {
    key: "system",
    title: "System",
    icon: FaCog,
    items: [
      {
        id: "downloads",
        label: "Downloads",
        icon: FaDownload
      },
      {
        id: "settings",
        label: "Settings",
        icon: FaCog
      }
    ]
  }
];



  const [openSections, setOpenSections] = useState({
    audit: true,
    administration: true,
    system: true
  });

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
        bg-gradient-to-b from-slate-900 to-slate-950
        text-slate-100
        flex flex-col
        z-30
        shadow-xl
        border-r border-slate-800
        transition-all duration-300
      `}
    >

      {/* BRAND SECTION */}
      <div className="p-6 border-b border-slate-800/60 flex flex-col gap-1.5">

        {/* COLLAPSE BUTTON */}
        <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} mb-4`}>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="
              p-2 rounded-lg
              hover:bg-slate-800
              text-slate-300
              transition
            "
          >

            {isCollapsed ? (
              <FaBars className="text-lg" />
            ) : (
              <FaTimes className="text-lg" />
            )}

          </button>

        </div>

        {/* LOGO */}
        <div
          className={`
            flex items-center
            ${isCollapsed ? 'justify-center' : 'gap-3'}
          `}
        >

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

              <h1
                className="
                  font-bold text-lg leading-none
                  bg-gradient-to-r from-white via-slate-200 to-slate-400
                  bg-clip-text text-transparent
                "
              >
                Netkode
              </h1>

              <span
                className="
                  text-[10px]
                  text-cyan-400
                  font-semibold
                  tracking-wider
                  uppercase
                "
              >
                Your Network. Verified
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
              bg-slate-800/40
              border border-slate-700/30
              text-[11px]
              font-medium
            "
          >

            <span
              className={`
                w-2 h-2 rounded-full animate-pulse

                ${backendOnline
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                }
              `}
            />

            <span
              className={
                backendOnline
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }
            >
              {backendOnline ? 'System Online' : 'System Offline'}
            </span>

          </div>

        )}

      </div>

      {/* NAVIGATION */}
      <nav
        className="
          flex-1
          px-4 py-6
          overflow-y-auto
          space-y-1.5
          scrollbar-thin
        "
      >

       {menuSections.map((section) => (

  <div key={section.key}>

    {section.key !== "dashboard" && !isCollapsed && (

      <button
        onClick={() => toggleSection(section.key)}
        className="
          w-full
          flex items-center justify-between
          px-3 py-2
          text-xs
          uppercase
          font-bold
          text-slate-500
          hover:text-slate-300
        "
      >

        <div className="flex items-center gap-2">

          <section.icon className="text-xs" />

          <span>{section.title}</span>

        </div>

        {openSections[section.key]
          ? <FaChevronDown />
          : <FaChevronRight />
        }

      </button>

    )}

    {(section.key === "dashboard" ||
      isCollapsed ||
      openSections[section.key]) && (

      <div className="space-y-1">

        {section.items.map((item) => {

          const Icon = item.icon;

          const isActive = activeTab === item.id;

          return (

            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : ""}
              className={`
                w-full
                flex items-center
                ${isCollapsed ? 'justify-center' : 'gap-3.5 px-4'}
                py-3
                rounded-xl
                text-sm
                font-medium
                transition-all duration-200
                group

                ${isActive
                  ? `
                    bg-gradient-to-r
                    from-cyan-500/10
                    to-purple-500/5
                    border border-cyan-500/20
                    text-cyan-400
                  `
                  : `
                    text-slate-400
                    hover:text-slate-200
                    hover:bg-slate-800/50
                  `
                }
              `}
            >

              <Icon
                className={`
                  text-base

                  ${isActive
                    ? 'text-cyan-400'
                    : 'text-slate-400'
                  }
                `}
              />

              {!isCollapsed && (
                <span>{item.label}</span>
              )}

              {!isCollapsed && isActive && (
                <span
                  className="
                    ml-auto
                    w-1.5 h-1.5
                    rounded-full
                    bg-cyan-400
                  "
                />
              )}

            </button>

          );

        })}

      </div>

    )}

  </div>

))}

      </nav>

      {/* PROFILE SECTION */}
      <div
        className="
          p-4
          border-t border-slate-800/60
          bg-slate-950/40
          flex flex-col gap-2.5
        "
      >

        {/* USER */}
        <div
          className={`
            flex items-center
            ${isCollapsed ? 'justify-center' : 'gap-3 px-2 py-1'}
          `}
        >

          <div className="text-2xl text-slate-400">
            <FaUserCircle />
          </div>

          {!isCollapsed && (

            <div className="flex-1 min-w-0">

              <p className="text-xs font-semibold text-slate-200 truncate">
                Tamarapalli Aditya
              </p>

              <p className="text-[10px] text-slate-500 truncate">
                Network Administrator
              </p>

            </div>

          )}

        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={() => {
            if (
              window.confirm(
                "Are you sure you want to log out of the Network Dashboard?"
              )
            ) {
              alert("Logged out (Demo mode - session reset).");
            }
          }}
          className="
            w-full
            flex items-center justify-center gap-2
            py-2 px-4
            border border-rose-500/20
            hover:border-rose-500/40
            bg-rose-500/5
            hover:bg-rose-500/10
            rounded-xl
            text-xs
            font-semibold
            text-rose-400
            transition-colors
          "
        >

          <FaSignOutAlt className="text-xs" />

          {!isCollapsed && (
            <span>Log out</span>
          )}

        </button>

      </div>

    </aside>

  );
}

export default Sidebar;