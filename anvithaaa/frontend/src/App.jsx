import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Audit from './pages/Audit'
import Templates from './pages/Templates'
import Reports from './pages/Reports'
import Trends from './pages/Trends'
import Inventory from './pages/Inventory'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="audit" element={<Audit />} />
            <Route path="templates" element={<Templates />} />
            <Route path="reports" element={<Reports />} />
            <Route path="trends" element={<Trends />} />
            <Route path="inventory" element={<Inventory />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
