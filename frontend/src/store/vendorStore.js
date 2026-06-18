import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultVendors = [
  { id: 'v1', name: 'Cisco', code: 'CSCO', contact: 'John Smith', email: 'john.smith@cisco.com', phone: '+1-408-555-0100', status: 'Active', createdAt: '2026-01-15T08:00:00.000Z' },
  { id: 'v2', name: 'Juniper', code: 'JNPR', contact: 'Sarah Jenkins', email: 'sjenkins@juniper.net', phone: '+1-408-555-0200', status: 'Active', createdAt: '2026-02-10T09:30:00.000Z' },
  { id: 'v3', name: 'Arista', code: 'ANET', contact: 'Michael Chang', email: 'mchang@arista.com', phone: '+1-415-555-0300', status: 'Active', createdAt: '2026-03-05T11:15:00.000Z' },
  { id: 'v4', name: 'Fortinet', code: 'FTNT', contact: 'Emma Watson', email: 'ewatson@fortinet.com', phone: '+1-408-555-0400', status: 'Active', createdAt: '2026-03-20T14:45:00.000Z' },
  { id: 'v5', name: 'Palo Alto', code: 'PANW', contact: 'David Miller', email: 'dmiller@paloaltonetworks.com', phone: '+1-866-320-3224', status: 'Active', createdAt: '2026-04-01T10:00:00.000Z' },
];

export const useVendorStore = create(
  persist(
    (set) => ({
      vendors: defaultVendors,
      
      addVendor: (vendor) => set((state) => ({
        vendors: [
          ...state.vendors,
          {
            ...vendor,
            id: 'v_' + Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString()
          }
        ]
      })),

      updateVendor: (id, updatedFields) => set((state) => ({
        vendors: state.vendors.map((vendor) =>
          vendor.id === id ? { ...vendor, ...updatedFields } : vendor
        )
      })),

      deleteVendor: (id) => set((state) => ({
        vendors: state.vendors.filter((vendor) => vendor.id !== id)
      })),
    }),
    {
      name: 'netconfig-vendors',
    }
  )
);
