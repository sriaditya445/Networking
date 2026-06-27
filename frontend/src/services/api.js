const API_BASE_URL = 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Set default content type to JSON if not uploading FormData
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (_) {
      // ignore
    }
    const message = errorData.detail || errorData.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  // Handle file/blob downloads
  const contentType = response.headers.get('Content-Type');
  if (contentType && (contentType.includes('application/pdf') || 
                      contentType.includes('application/vnd.openxmlformats-officedocument') || 
                      contentType.includes('application/zip') ||
                      contentType.includes('application/octet-stream'))) {
    return response.blob();
  }

  return response.json();
}

export const api = {
  baseUrl: API_BASE_URL,

  // Health
  async healthCheck() {
    return request('/api/health');
  },

  // Stats
  async getStats() {
    return request('/api/stats');
  },

  // Upload Jobs
  async getUploads() {
    return request('/api/uploads');
  },

  async getUpload(uploadId) {
    return request(`/api/uploads/${uploadId}`);
  },

  async deleteUpload(uploadId) {
    return request(`/api/uploads/${uploadId}`, { method: 'DELETE' });
  },

  async uploadFiles(files, folderName) {
    const formData = new FormData();
    formData.append('folder_name', folderName || 'configs');
    files.forEach((file) => {
      formData.append('files', file, file.webkitRelativePath || file.name);
    });

    return request('/api/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async getUploadGroups(uploadId) {
    return request(`/api/uploads/${uploadId}/groups`);
  },

  async saveAuditSelection(uploadId, selections) {
    return request(`/api/uploads/${uploadId}/audit-selection`, {
      method: 'POST',
      body: JSON.stringify({ selections }),
    });
  },

  // Devices
  async getDevices(params = {}) {
    const query = new URLSearchParams();
    if (params.upload_id) query.append('upload_id', params.upload_id);
    if (params.group_id) query.append('group_id', params.group_id);
    if (params.processing_status) query.append('processing_status', params.processing_status);
    
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/devices${queryString}`);
  },

  async getDevice(deviceId) {
    return request(`/api/devices/${deviceId}`);
  },

  // Templates
  async getTemplates() {
    return request('/api/templates');
  },

  async getTemplate(templateId) {
    return request(`/api/templates/${templateId}`);
  },

  async uploadTemplate(formData) {
    return request('/api/templates/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Vendors
  async getVendors() {
    return request('/api/vendors');
  },

  async createVendor(vendorData) {
    return request('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(vendorData),
    });
  },

  async deleteVendor(vendorId) {
    return request(`/api/vendors/${vendorId}`, {
      method: 'DELETE',
    });
  },

  // Audits and Reports
  async getAuditResults() {
    return request('/api/audit/results');
  },

  async getAuditResult(resultId) {
    return request(`/api/audit/results/${resultId}`);
  },

  async getAuditReports() {
    return request('/api/audit/reports');
  },

  // Export URLs (returns Blob helper directly)
  async downloadDevicePdf(reportId) {
    return request(`/api/audit/reports/${reportId}/pdf`);
  },

  async downloadDeviceExcel(reportId) {
    return request(`/api/audit/reports/${reportId}/excel`);
  },

  async downloadGroupPdf(groupId, uploadId) {
    return request(`/api/groups/${encodeURIComponent(groupId)}/report/pdf?upload_id=${uploadId}`);
  },

  async downloadGroupExcel(groupId, uploadId) {
    return request(`/api/groups/${encodeURIComponent(groupId)}/report/excel?upload_id=${uploadId}`);
  },

  async downloadUploadPdf(uploadId) {
    return request(`/api/uploads/${uploadId}/report/pdf`);
  },

  async downloadUploadExcel(uploadId) {
    return request(`/api/uploads/${uploadId}/report/excel`);
  },

  async downloadUploadZip(uploadId) {
    return request(`/api/uploads/${uploadId}/download`);
  }
};
export default api;
