import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultTemplates = [
  {
    id: 't1',
    name: 'Cisco_C3650_Golden_Template',
    vendorId: 'v1',
    vendorName: 'Cisco',
    deviceType: 'L2 Switch',
    modelNumber: 'WS-C3650-24TD-S',
    templateType: 'Paste',
    version: '1.0.0',
    content: `hostname {{ hostname }}\nip domain-name {{ domain_name }}\nntp server {{ ntp_server }}\nsnmp-server community {{ community }}`,
    createdAt: '2026-05-01T10:00:00.000Z'
  }
];

export const useTemplateStore = create(
  persist(
    (set) => ({
      templates: defaultTemplates,

      addTemplate: (template) => set((state) => ({
        templates: [
          ...state.templates,
          {
            ...template,
            id: 't_' + Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString()
          }
        ]
      })),

      // Retain compatibility with UploadTemplateModal
      uploadTemplate: (template) => set((state) => {
        const filteredTemplates = state.templates.filter(
          (t) => t.deviceId !== template.deviceId
        );
        return {
          templates: [
            ...filteredTemplates,
            {
              ...template,
              id: 't_' + Math.random().toString(36).substr(2, 9),
              createdAt: new Date().toISOString(),
              version: template.version || '1.0.0',
              templateType: 'Upload'
            }
          ]
        };
      }),

      updateTemplate: (id, updatedFields) => set((state) => ({
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, ...updatedFields } : t
        )
      })),

      deleteTemplate: (id) => set((state) => ({
        templates: state.templates.filter((t) => t.id !== id)
      })),

      deleteTemplateByDevice: (deviceId) => set((state) => ({
        templates: state.templates.filter((t) => t.deviceId !== deviceId)
      })),
    }),
    {
      name: 'netconfig-templates-v2',
    }
  )
);
