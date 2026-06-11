import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

export const uploadConfigs = async (files) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  const { data } = await api.post('/api/audit/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const runAudit = async (configId, auditMode = 'full') => {
  const { data } = await api.post(`/api/audit/run/${configId}?audit_mode=${auditMode}`)
  return data
}

export const runBatchAudit = async (configIds, auditMode = 'full') => {
  const { data } = await api.post(`/api/audit/run-batch?audit_mode=${auditMode}`, { config_ids: configIds })
  return data
}

export const getReports = async () => {
  const { data } = await api.get('/api/audit/reports')
  return data
}

export const getReport = async (reportId) => {
  const { data } = await api.get(`/api/audit/reports/${reportId}`)
  return data
}

export const getDashboard = async () => {
  const { data } = await api.get('/api/audit/dashboard')
  return data
}

export const getDevices = async () => {
  const { data } = await api.get('/api/audit/devices')
  return data
}

export const getTemplates = async () => {
  const { data } = await api.get('/api/templates')
  return data
}

export const createTemplate = async (template) => {
  const { data } = await api.post('/api/templates', template)
  return data
}

export const updateTemplate = async (id, template) => {
  const { data } = await api.put(`/api/templates/${id}`, template)
  return data
}

export const deleteTemplate = async (id) => {
  const { data } = await api.delete(`/api/templates/${id}`)
  return data
}

export const exportPdf = (reportId) => `/api/audit/reports/${reportId}/export/pdf`
export const exportExcel = (reportId) => `/api/audit/reports/${reportId}/export/excel`

export default api
