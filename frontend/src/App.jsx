import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  // State variables
  const [jobs, setJobs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({
    total_jobs: 0,
    pending_jobs: 0,
    success_jobs: 0,
    failed_jobs: 0,
    total_devices: 0,
    switches_count: 0,
    routers_count: 0,
    firewalls_count: 0,
    unknowns_count: 0
  });

  // UI state
  const [folderName, setFolderName] = useState('configs');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'folder'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedDevice, setSelectedDevice] = useState(null); // Device for modal
  const [backendOnline, setBackendOnline] = useState(true);

  // Refs
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

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
      const jobsRes = await fetch(`${API_BASE_URL}/api/jobs`);
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

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      
      // Auto-suggest folder name if directory path exists, or default to first file name
      if (uploadMode === 'folder' && filesArray.length > 0 && filesArray[0].webkitRelativePath) {
        const rootFolder = filesArray[0].webkitRelativePath.split('/')[0];
        setFolderName(rootFolder);
      } else if (filesArray.length > 0 && folderName === 'configs') {
        setFolderName('batch_' + new Date().toISOString().slice(0,10).replace(/-/g, ''));
      }
    }
  };

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
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';

      // Immediately refresh dashboard
      await fetchData();
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Upload Failed: ${err.message}`);
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
    if (!window.confirm("Are you sure you want to delete this job and all its parsed devices?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchData();
      } else {
        const errorData = await response.json();
        alert(`Deletion failed: ${errorData.detail}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Failed to delete job: ${err.message}`);
    }
  };

  // Helper to get matching badge for job status
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-pending"><span className="status-dot"></span>Pending</span>;
      case 'processing':
        return <span className="badge badge-processing"><span className="status-dot"></span>Processing</span>;
      case 'success':
        return <span className="badge badge-success">Success</span>;
      case 'failed':
        return <span className="badge badge-failed">Failed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Format dates nicely
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  // Filter devices list based on search query and type filter
  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.device_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          device.configuration.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || device.device_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">N</div>
          <div className="logo-text">
            <h1>NetConfig Parser</h1>
            <p>Automated Network Configuration Parsing System</p>
          </div>
        </div>

        <div className={`connection-status ${backendOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          {backendOnline ? 'Backend Online' : 'Backend Disconnected'}
        </div>
      </header>

      {/* Analytics Statistics Grid */}
      <section className="stats-grid">
        <div className="stat-card accent">
          <span className="stat-label">Total Uploads</span>
          <span className="stat-value">{stats.total_jobs}</span>
          <span className="stat-subtext">{stats.pending_jobs} active parser running</span>
        </div>
        <div className="stat-card purple-accent">
          <span className="stat-label">Parsed Devices</span>
          <span className="stat-value">{stats.total_devices}</span>
          <span className="stat-subtext">Across all completed uploads</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Switches</span>
          <span className="stat-value">{stats.switches_count}</span>
          <span className="stat-subtext">Identified via "switchport"</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Routers</span>
          <span className="stat-value">{stats.routers_count}</span>
          <span className="stat-subtext">Identified via "router ospf"</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Firewalls</span>
          <span className="stat-value">{stats.firewalls_count}</span>
          <span className="stat-subtext">Identified via "firewall"</span>
        </div>
      </section>

      {/* Main Grid Layout */}
      <main className="dashboard-layout">
        {/* Left Side: Upload & Jobs List */}
        <div className="layout-col">
          <div className="glass-card">
            <h2 className="card-title">
              <span>📤</span> Upload Configurations
            </h2>
            
            {/* Upload Mode Toggles */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button 
                type="button"
                className={`btn ${uploadMode === 'file' ? 'btn-primary' : ''}`}
                style={{ flex: 1, padding: '8px 16px', background: uploadMode === 'file' ? '' : 'rgba(255,255,255,0.05)', color: uploadMode === 'file' ? '' : '#fff' }}
                onClick={() => { setUploadMode('file'); setSelectedFiles([]); }}
              >
                Files Mode
              </button>
              <button 
                type="button"
                className={`btn ${uploadMode === 'folder' ? 'btn-primary' : ''}`}
                style={{ flex: 1, padding: '8px 16px', background: uploadMode === 'folder' ? '' : 'rgba(255,255,255,0.05)', color: uploadMode === 'folder' ? '' : '#fff' }}
                onClick={() => { setUploadMode('folder'); setSelectedFiles([]); }}
              >
                Folder Mode
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="upload-form">
              <div className="form-group">
                <label className="form-label" htmlFor="folderNameInput">Batch / Folder Label</label>
                <input 
                  id="folderNameInput"
                  type="text" 
                  className="text-input" 
                  value={folderName} 
                  onChange={(e) => setFolderName(e.target.value)} 
                  placeholder="e.g. branch_office_configs"
                  required
                />
              </div>

              {/* Conditional inputs depending on upload mode */}
              {uploadMode === 'file' ? (
                <div 
                  className="dropzone"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <div className="upload-icon">📄</div>
                  <span className="dropzone-text">Click to choose config files</span>
                  <span className="dropzone-subtext">Supports .cfg, .txt, .conf, etc. (Multiple files allowed)</span>
                  <input 
                    aria-label="Upload configuration files"
                    type="file" 
                    ref={fileInputRef}
                    style={{ display: 'none' }} 
                    onChange={handleFileChange}
                    multiple 
                    required
                  />
                </div>
              ) : (
                <div 
                  className="dropzone"
                  onClick={() => folderInputRef.current && folderInputRef.current.click()}
                >
                  <div className="upload-icon">📁</div>
                  <span className="dropzone-text">Click to select folder</span>
                  <span className="dropzone-subtext">This uploads all files within the selected directory</span>
                  <input 
                    aria-label="Upload folder of configuration files"
                    type="file" 
                    ref={folderInputRef}
                    style={{ display: 'none' }} 
                    onChange={handleFileChange}
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    required
                  />
                </div>
              )}

              {/* Show selected files */}
              {selectedFiles.length > 0 && (
                <div className="selected-files-list">
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>Selected Files ({selectedFiles.length}):</div>
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="selected-file-item">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                        {file.webkitRelativePath || file.name}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={selectedFiles.length === 0 || uploading || !backendOnline}
              >
                {uploading ? 'Uploading...' : 'Process configurations'}
              </button>

              {uploading && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Sending files...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Jobs List */}
          <div className="glass-card" style={{ marginTop: '2rem' }}>
            <h2 className="card-title">
              <span>📋</span> Upload Jobs Queue
            </h2>

            <div className="jobs-list">
              {jobs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div>No upload jobs yet. Upload files above to trigger parser.</div>
                </div>
              ) : (
                jobs.map((job) => (
                  <div key={job._id || job.id} className="job-item">
                    <div className="job-info">
                      <div className="job-name">{job.folder_name}</div>
                      <div className="job-meta">
                        <span>{job.files_count} files</span>
                        <span>•</span>
                        <span>{formatDate(job.created_at)}</span>
                      </div>
                      {job.error_message && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', maxWidth: '300px' }}>
                          Error: {job.error_message}
                        </div>
                      )}
                    </div>

                    <div className="job-actions">
                      {renderStatusBadge(job.status)}
                      <button 
                        type="button"
                        className="btn-danger-icon"
                        onClick={() => handleDeleteJob(job._id || job.id)}
                        title="Delete Job"
                        aria-label={`Delete job ${job.folder_name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Parsed Devices List */}
        <div className="layout-col">
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="card-title">
              <span>🖥️</span> Parsed Network Devices
            </h2>

            {/* Controls for filtering and searching */}
            <div className="devices-controls">
              <input 
                type="text" 
                className="text-input search-input" 
                placeholder="Search device name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '8px 16px' }}
                aria-label="Search parsed devices"
              />

              <select 
                className="filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter devices by type"
              >
                <option value="All">All Types</option>
                <option value="Switch">Switches</option>
                <option value="Router">Routers</option>
                <option value="Firewall">Firewalls</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            {/* Devices Table */}
            <div className="devices-table-container" style={{ flexGrow: 1, maxHeight: '680px', overflowY: 'auto' }}>
              {filteredDevices.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <div>No devices match the filters or configurations haven't been parsed yet.</div>
                </div>
              ) : (
                <table className="devices-table">
                  <thead>
                    <tr>
                      <th>Device Name</th>
                      <th>Device Type</th>
                      <th>Parent Upload</th>
                      <th>Parsed At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((device) => (
                      <tr key={device._id || device.id}>
                        <td style={{ fontWeight: 600 }}>{device.device_name}</td>
                        <td>
                          <span className={`device-type-badge device-type-${device.device_type}`}>
                            {device.device_type}
                          </span>
                        </td>
                        <td>{device.file_path ? device.file_path.split('/').slice(-2)[0] : 'config'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatDate(device.parsed_at)}
                        </td>
                        <td>
                          <button 
                            type="button"
                            className="btn" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.08)', color: '#fff' }}
                            onClick={() => setSelectedDevice(device)}
                          >
                            View Config
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal: View Full Configuration */}
      {selectedDevice && (
        <div className="modal-overlay" onClick={() => setSelectedDevice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Configuration Viewer: {selectedDevice.device_name}</h3>
              <button 
                type="button"
                className="modal-close" 
                onClick={() => setSelectedDevice(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <div>
                  <strong>Device Type:</strong> <span className={`device-type-badge device-type-${selectedDevice.device_type}`}>{selectedDevice.device_type}</span>
                </div>
                <div>
                  <strong>Location:</strong> {selectedDevice.file_path}
                </div>
              </div>
              <pre className="config-pre">
                {selectedDevice.configuration || 'Empty configuration file.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
