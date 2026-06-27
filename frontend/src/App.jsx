import React, { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import { useToast } from './contexts/ToastContext';
import { useModal } from './contexts/ModalContext';

// Import newly created modular UI components
import Sidebar from './components/Sidebar';
import ConfigModal from './components/ConfigModal';
import TypeDevicesModal from './components/TypeDevicesModal';

// Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import UploadCenter from './pages/UploadCenter';
import ParsedDevices from './pages/ParsedDevices';
import Analytics from './pages/Analytics';
import ProcessingQueue from './pages/ProcessingQueue';
import Configurations from './pages/Configurations';
import Downloads from './pages/Downloads';
import SettingsTab from './pages/SettingsTab';
import VendorManagement from './pages/VendorManagement';
import DeviceManagement from './pages/DeviceManagement';
import TemplateManagement from './pages/TemplateManagement';
import AuditDashboard from './pages/AuditDashboard';


const API_BASE_URL = 'http://localhost:8000';

function App() {
  const { addToast } = useToast();
  const { showConfirm } = useModal();

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Compliance Audit Run', message: 'Core Switch CSCO-HQ-01 passed all policy checks.', time: '5 mins ago', read: false },
    { id: 2, title: 'Job Parsing Complete', message: 'Batch configuration "juniper-branch-update" processed successfully.', time: '1 hour ago', read: true },
    { id: 3, title: 'System Health Status', message: 'FastAPI backend connection re-established successfully.', time: '2 hours ago', read: true }
  ]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // State variables
  const [jobs, setJobs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({
    total_uploads: 0,
    pending_uploads: 0,
    success_uploads: 0,
    failed_uploads: 0,
    total_devices: 0,
    switches_count: 0,
    routers_count: 0,
    firewalls_count: 0,
    unknowns_count: 0
  });

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [folderName, setFolderName] = useState('configs');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'folder'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedDevice, setSelectedDevice] = useState(null); // Device for modal
  const [backendOnline, setBackendOnline] = useState(true);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedTypeDevices, setSelectedTypeDevices] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState(null);
  const [onTemplateUploadSuccess, setOnTemplateUploadSuccess] = useState(null);


  // Fetch all necessary data from FastAPI backend
  const fetchData = async () => {
    try {
      // 1. Health check & status update
      const healthRes = await fetch(`${API_BASE_URL}/api/health`).catch(() => null);
      if (!healthRes || !healthRes.ok) {
        setBackendOnline(false);
        return;
      }
      setBackendOnline(true);

      // 2. Fetch Jobs
      const jobsRes = await fetch(`${API_BASE_URL}/api/uploads`);
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData);
      }

      // 3. Fetch Devices
      const devicesRes = await fetch(`${API_BASE_URL}/api/devices`);
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setDevices(devicesData);
      }

      // 4. Fetch Stats
      const statsRes = await fetch(`${API_BASE_URL}/api/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setBackendOnline(false);
    }
  };

  // Poll for updates.
  // We poll every 2 seconds if there are jobs that are "pending" or "processing" (active jobs).
  // Otherwise, we poll every 5 seconds to reduce server load.
  useEffect(() => {
    fetchData(); // Initial load

    const getPollInterval = () => {
      const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing');
      return hasActive ? 2000 : 5000;
    };

    let intervalId = setInterval(fetchData, getPollInterval());

    // Re-adjust polling speed if jobs list status changes
    return () => clearInterval(intervalId);
  }, [jobs.map(j => j.status).join(',')]); // Triggers effect if any job status changes

  // Submit file uploads using fetch API
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(15);

    const formData = new FormData();
    formData.append('folder_name', folderName || 'configs');

    selectedFiles.forEach((file) => {
      // Use webkitRelativePath for folder structure if available, or just filename
      formData.append('files', file, file.webkitRelativePath || file.name);
    });

    setUploadProgress(40);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload files.');
      }

      setUploadProgress(100);
      setSelectedFiles([]);

      // Switch to Processing Queue tab to let user see parser working
      setActiveTab('queue');

      // Immediately refresh dashboard
      await fetchData();
    } catch (err) {
      console.error("Upload error:", err);
      addToast(`Upload Failed: ${err.message}`, "error");
    } finally {
      // Small timeout for smooth progress bar transition
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 800);
    }
  };

  // Delete an upload job and associated files/devices
  const handleDeleteJob = async (jobId) => {
    const confirmed = await showConfirm({
      title: "Delete Upload Batch",
      description: "Are you sure you want to delete this job and all its parsed devices? This cannot be undone.",
      type: "danger"
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/${jobId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        addToast("Upload batch deleted successfully.", "success");
        fetchData();
      } else {
        const errorData = await response.json();
        addToast(`Deletion failed: ${errorData.detail}`, "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      addToast(`Failed to delete job: ${err.message}`, "error");
    }
  };

  // Helper to get matching badge for job status
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-600 border border-amber-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Pending</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-cyan-50 text-cyan-600 border border-cyan-100">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
            <span>Processing</span>
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
            <span>Success</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-rose-50 text-rose-600 border border-rose-100">
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-50 text-slate-650 border border-slate-100">
            {status}
          </span>
        );
    }
  };

  // Format dates nicely
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  const handleTypeClick = (type, filteredList = null) => {
    let filtered = [];
    if (filteredList) {
      filtered = filteredList;
    } else {
      if (type === 'Unknown') {
        filtered = devices.filter(
          (device) => !['Switch', 'Router', 'Firewall', 'AccessPoint', 'WLC'].includes(device.device_type)
        );
      } else {
        filtered = devices.filter(
          (device) => device.device_type === type
        );
      }
    }

    setSelectedType(type);
    setSelectedTypeDevices(filtered);
    setShowTypeModal(true);
  };

  // Render content of active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'vendor_management':
        return <VendorManagement />;
      case 'device_management':
        return <DeviceManagement />;
      case 'template_management':
        return (
          <TemplateManagement
            onSuccess={() => {
              if (typeof onTemplateUploadSuccess === 'function') {
                onTemplateUploadSuccess();
              } else {
                setActiveTab('queue');
              }
            }}
          />
        );
      case 'audit_dashboard':
        return <AuditDashboard devices={devices} />;
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            jobs={jobs}
            devices={devices}
            onViewDevice={setSelectedDevice}
            setActiveTab={setActiveTab}
            apiBaseUrl={API_BASE_URL}
            setSelectedUploadId={setSelectedUploadId}
            setSelectedFolderName={setSelectedFolderName}
          />
        );
      case 'inventory':
        return (
          <Inventory
            devices={devices}
            jobs={jobs}
            onTypeClick={handleTypeClick}
          />
        );
      case 'upload':
        return (
          <UploadCenter
            folderName={folderName}
            setFolderName={setFolderName}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            uploadMode={uploadMode}
            setUploadMode={setUploadMode}
            uploading={uploading}
            uploadProgress={uploadProgress}
            backendOnline={backendOnline}
            handleUploadSubmit={handleUploadSubmit}
            jobs={jobs}
            devices={devices}
            formatDate={formatDate}
            renderStatusBadge={renderStatusBadge}
            setActiveTab={setActiveTab}
            setSelectedUploadId={setSelectedUploadId}
            setSelectedFolderName={setSelectedFolderName}
          />
        );
      case 'devices':
        return (
          <ParsedDevices
            devices={devices}
            jobs={jobs}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            onViewDevice={setSelectedDevice}
            formatDate={formatDate}
            apiBaseUrl={API_BASE_URL}
            selectedUploadId={selectedUploadId}
            setSelectedUploadId={setSelectedUploadId}
            selectedFolderName={selectedFolderName}
            setSelectedFolderName={setSelectedFolderName}
          />
        );
      case 'analytics':
        return (
          <Analytics
            stats={stats}
            devices={devices}
            jobs={jobs}
            apiBaseUrl={API_BASE_URL}
          />
        );
      case 'queue':
        return (
          <ProcessingQueue
            jobs={jobs}
            handleDeleteJob={handleDeleteJob}
            formatDate={formatDate}
            renderStatusBadge={renderStatusBadge}
            apiBaseUrl={API_BASE_URL}
            setActiveTab={setActiveTab}
            selectedUploadId={selectedUploadId}
            setSelectedUploadId={setSelectedUploadId}
            setOnTemplateUploadSuccess={setOnTemplateUploadSuccess}
            onViewDevice={setSelectedDevice}
          />
        );
      case 'configurations':
        return (
          <Configurations
            devices={devices}
            apiBaseUrl={API_BASE_URL}
          />
        );
      case 'downloads':
        return (
          <Downloads
            jobs={jobs}
            formatDate={formatDate}
            apiBaseUrl={API_BASE_URL}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            apiBaseUrl={API_BASE_URL}
            backendOnline={backendOnline}
          />
        );
      default:
        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 font-medium">
            Section coming soon.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* Fixed Left Sidebar navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`
    flex-1
    ${isCollapsed ? 'pl-20' : 'pl-64'}
    flex flex-col
    min-h-screen
    transition-all duration-300
  `}
      >
        {/* Top Header Navbar */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-5 flex items-center justify-between shadow-sm sticky top-0 z-20">
          <div>
            <h1 className="font-extrabold text-slate-800 text-lg leading-tight tracking-tight">
              Enterprise Network Dashboard
            </h1>
            <p className="text-[11px] text-slate-400">NetConfig Configuration Analysis Staging System</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-[11px] text-slate-500 font-mono bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time polling active</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative p-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow-sm"
              >
                <FaBell className="text-sm" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-150 rounded-2xl shadow-xl z-30 p-4 animate-scale-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-2.5">
                    <span className="font-bold text-xs text-slate-800">Alerts & Notifications</span>
                    <button
                      onClick={() => {
                        setNotifications(notifications.map(n => ({ ...n, read: true })));
                        addToast("All notifications marked as read.", "info");
                      }}
                      className="text-[9px] text-cyan-600 font-semibold hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          n.read ? 'bg-white border-slate-100' : 'bg-cyan-500/5 border-cyan-200/40'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-[10px] text-slate-800 leading-tight">{n.title}</span>
                          <span className="text-[8px] text-slate-400 font-mono shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic tab components */}
        <main className="flex-1 p-8 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* Configuration modal viewer overlay */}
      {selectedDevice && (
        <ConfigModal
          selectedDevice={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          apiBaseUrl={API_BASE_URL}
        />
      )}

      {/* Device Type listing modal popup */}
      {showTypeModal && (
        <TypeDevicesModal
          type={selectedType}
          devices={selectedTypeDevices}
          onClose={() => setShowTypeModal(false)}
          onViewDevice={(device) => {
            setShowTypeModal(false);
            setSelectedDevice(device);
          }}
        />
      )}
    </div>
  );
}

export default App;
