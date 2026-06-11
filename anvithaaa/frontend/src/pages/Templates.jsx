import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTemplate, deleteTemplate, getTemplates, updateTemplate } from '../api/client'

const EMPTY_TEMPLATE = {
  vendor: 'Cisco',
  device_type: 'switch',
  template_name: '',
  template_type: 'jinja2',
  template_content: '',
  sections: {},
}

export default function Templates() {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_TEMPLATE)
  const queryClient = useQueryClient()

  const { data: templates = [], isLoading } = useQuery({ queryKey: ['templates'], queryFn: getTemplates })

  const saveMutation = useMutation({
    mutationFn: (data) => (editing ? updateTemplate(editing, data) : createTemplate(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setEditing(null)
      setForm(EMPTY_TEMPLATE)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  const startEdit = (t) => {
    setEditing(t.id)
    setForm({
      vendor: t.vendor,
      device_type: t.device_type,
      template_name: t.template_name,
      template_type: t.template_type,
      template_content: t.template_content,
      sections: t.sections || {},
    })
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Golden Template Management</h2>
          <p className="text-slate-500 mt-1">Manage Jinja2 golden templates stored in MongoDB</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setEditing(null); setForm(EMPTY_TEMPLATE) }}
        >
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Templates ({templates.length})</h3>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{t.template_name}</p>
                      <p className="text-sm text-slate-500">{t.vendor} · {t.device_type}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Sections: {Object.keys(t.sections || {}).join(', ') || 'none parsed'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary text-xs" onClick={() => startEdit(t)}>Edit</button>
                      <button
                        className="text-red-600 text-xs hover:underline"
                        onClick={() => deleteMutation.mutate(t.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">{editing ? 'Edit Template' : 'Create Template'}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Vendor</label>
                <input className="input mt-1" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Device Type</label>
                <select className="input mt-1" value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })}>
                  <option value="switch">Switch</option>
                  <option value="router">Router</option>
                  <option value="wlc">WLC</option>
                  <option value="nexus">Nexus</option>
                  <option value="firewall">Firewall</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Template Name</label>
              <input className="input mt-1" value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Template Content (Jinja2)</label>
              <textarea
                className="input mt-1 font-mono text-xs h-64"
                value={form.template_content}
                onChange={(e) => setForm({ ...form, template_content: e.target.value })}
                placeholder="! === AAA ===&#10;aaa new-model&#10;..."
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.template_name || !form.template_content}
            >
              {saveMutation.isPending ? 'Saving...' : editing ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
