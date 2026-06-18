import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultDevices = [
  { id: 'd1', vendorId: 'v1', vendorName: 'Cisco', deviceName: 'cisco-switch-01', deviceType: 'L2 Switch', modelNumber: 'WS-C3650-24TD-S', description: 'Branch access switch layer 2', status: 'Active', createdAt: '2026-01-16T10:00:00.000Z' },
  { id: 'd2', vendorId: 'v2', vendorName: 'Juniper', deviceName: 'juniper-router-01', deviceType: 'Router', modelNumber: 'MX240', description: 'Core edge router', status: 'Active', createdAt: '2026-02-12T11:30:00.000Z' },
  { id: 'd3', vendorId: 'v3', vendorName: 'Arista', deviceName: 'arista-core-01', deviceType: 'Core Switch', modelNumber: 'DCS-7050SX3-48YC12', description: 'Data center core switch', status: 'Active', createdAt: '2026-03-06T09:15:00.000Z' },
  { id: 'd4', vendorId: 'v4', vendorName: 'Fortinet', deviceName: 'fortinet-fw-01', deviceType: 'Firewall', modelNumber: 'FG-100F', description: 'Office firewall gateway', status: 'Active', createdAt: '2026-03-22T16:00:00.000Z' },
  { id: 'd5', vendorId: 'v5', vendorName: 'Palo Alto', deviceName: 'paloalto-fw-01', deviceType: 'Firewall', modelNumber: 'PA-220', description: 'Edge perimeter firewall', status: 'Active', createdAt: '2026-04-02T14:20:00.000Z' }
];

export const useDeviceStore = create(
  persist(
    (set) => ({
      devices: defaultDevices,

      addDevice: (device) => set((state) => ({
        devices: [
          ...state.devices,
          {
            ...device,
            id: 'd_' + Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString()
          }
        ]
      })),

      updateDevice: (id, updatedFields) => set((state) => ({
        devices: state.devices.map((device) =>
          device.id === id ? { ...device, ...updatedFields } : device
        )
      })),

      deleteDevice: (id) => set((state) => ({
        devices: state.devices.filter((device) => device.id !== id)
      })),
    }),
    {
      name: 'netconfig-devices',
    }
  )
);
