import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuditStore = create(
  persist(
    (set) => ({
      selectedAuditType: 'Full Audit',
      auditResults: [], // { id, deviceId, deviceName, auditType, status: 'Success'|'Failed'|'Processing'|'Pending', runDate }

      setAuditType: (type) => set({ selectedAuditType: type }),

      runAudit: (deviceId, deviceName, auditType) => {
        const auditId = 'a_' + Math.random().toString(36).substr(2, 9);
        
        const newAudit = {
          id: auditId,
          deviceId,
          deviceName,
          auditType,
          status: 'Processing',
          runDate: new Date().toISOString()
        };

        // Add to run history
        set((state) => ({
          auditResults: [newAudit, ...state.auditResults]
        }));

        // Simulate background processing
        setTimeout(() => {
          set((state) => ({
            auditResults: state.auditResults.map((audit) =>
              audit.id === auditId
                ? { ...audit, status: Math.random() > 0.1 ? 'Success' : 'Failed' }
                : audit
            )
          }));
        }, 1500);

        return auditId;
      },

      clearAuditHistory: () => set({ auditResults: [] })
    }),
    {
      name: 'netconfig-audits',
    }
  )
);
