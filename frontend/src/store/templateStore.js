import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTemplateStore = create(
  persist(
    (set) => ({
      templates: [],

      uploadTemplate: (template) => set((state) => {
        // Filter out any existing template for the same device (each device has ONE golden template)
        const filteredTemplates = state.templates.filter(
          (t) => t.deviceId !== template.deviceId
        );
        return {
          templates: [
            ...filteredTemplates,
            {
              ...template,
              id: 't_' + Math.random().toString(36).substr(2, 9),
              uploadDate: new Date().toISOString(),
              version: template.version || '1.0.0',
              status: 'Uploaded'
            }
          ]
        };
      }),

      deleteTemplate: (id) => set((state) => ({
        templates: state.templates.filter((t) => t.id !== id)
      })),

      deleteTemplateByDevice: (deviceId) => set((state) => ({
        templates: state.templates.filter((t) => t.deviceId !== deviceId)
      })),
    }),
    {
      name: 'netconfig-templates',
    }
  )
);
