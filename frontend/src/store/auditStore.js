import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuditStore = create(
  persist(
    (set) => ({
      selectedAuditType: 'Full Audit',
      auditResults: [],

      setAuditType: (type) => set({ selectedAuditType: type }),

      runAudit: (deviceId, deviceName, auditType, matchedTemplate) => {
        const auditId = 'a_' + Math.random().toString(36).substr(2, 9);
        
        const newAudit = {
          id: auditId,
          deviceId,
          deviceName,
          auditType,
          status: 'Processing',
          templateName: matchedTemplate ? matchedTemplate.name : 'None',
          runDate: new Date().toISOString(),
          diffResult: null
        };

        // Add to run history
        set((state) => ({
          auditResults: [newAudit, ...state.auditResults]
        }));

        // Simulate background processing
        setTimeout(() => {
          let status = 'Success';
          let diffResult = [];

          if (matchedTemplate) {
            const templateLines = matchedTemplate.content.split('\n');
            const isFailed = Math.random() > 0.3; // 30% chance of failure for realistic auditing
            status = isFailed ? 'Failed' : 'Success';

            templateLines.forEach((tLine, i) => {
              if (tLine.trim() === '') return;
              
              // Handle template variables
              if (tLine.includes('{{')) {
                const varName = tLine.match(/\{\{\s*([\w_]+)\s*\}\}/)?.[1] || 'val';
                if (isFailed && i === 0) {
                  diffResult.push({ type: 'removed', text: tLine, line: i + 1 });
                  diffResult.push({ type: 'added', text: tLine.replace(/\{\{\s*[\w_]+\s*\}\}/g, `mismatched_${varName}_value`), line: i + 1 });
                } else {
                  diffResult.push({ type: 'unchanged', text: tLine.replace(/\{\{\s*[\w_]+\s*\}\}/g, `${deviceName}_${varName}`), line: i + 1 });
                }
              } else {
                diffResult.push({ type: 'unchanged', text: tLine, line: i + 1 });
              }
            });
          } else {
            status = 'Failed';
            diffResult = [
              { type: 'error', text: 'Audit failed: No matching golden template found for this device specifications.', line: 1 }
            ];
          }

          set((state) => ({
            auditResults: state.auditResults.map((audit) =>
              audit.id === auditId
                ? { ...audit, status, diffResult }
                : audit
            )
          }));
        }, 1500);

        return auditId;
      },

      clearAuditHistory: () => set({ auditResults: [] })
    }),
    {
      name: 'netconfig-audits-v2',
    }
  )
);
