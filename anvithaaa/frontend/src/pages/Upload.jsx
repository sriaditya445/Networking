import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { uploadConfigs } from '../api/client'

export default function Upload() {
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: uploadConfigs,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/audit', { state: { batch: data } })
    },
  })

  const handleFiles = (fileList) => {
    const cfgFiles = Array.from(fileList).filter(
      (f) => f.name.endsWith('.cfg') || f.name.endsWith('.txt') || f.name.endsWith('.conf')
    )
    setFiles((prev) => [...prev, ...cfgFiles])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleUpload = () => {
    if (files.length) mutation.mutate(files)
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Upload Configurations</h2>
        <p className="text-slate-500 mt-1">Upload a folder of network device configuration files (.cfg, .txt, .conf)</p>
      </div>

      <div
        className={`card border-2 border-dashed transition-colors cursor-pointer ${
          dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📁</div>
          <p className="text-lg font-medium text-slate-700">Drop configuration folder here</p>
          <p className="text-sm text-slate-500 mt-2">or click to browse files</p>
          <p className="text-xs text-slate-400 mt-4">Supports: switch1.cfg, router1.cfg, wlc1.cfg, etc.</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold mb-4">{files.length} file(s) selected</h3>
          <ul className="max-h-48 overflow-y-auto space-y-1 text-sm">
            {files.map((f, i) => (
              <li key={i} className="flex justify-between py-1 border-b border-slate-100">
                <span>{f.webkitRelativePath || f.name}</span>
                <span className="text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary" onClick={handleUpload} disabled={mutation.isPending}>
              {mutation.isPending ? 'Uploading...' : 'Upload & Continue to Audit'}
            </button>
            <button className="btn-secondary" onClick={() => setFiles([])}>Clear</button>
          </div>
          {mutation.isError && (
            <p className="text-red-600 text-sm mt-3">Upload failed: {mutation.error.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
