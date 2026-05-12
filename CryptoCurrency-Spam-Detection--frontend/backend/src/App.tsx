import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useMemo, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Navbar } from './components/Navbar'
import { AlertsPanel } from './components/AlertsPanel'
import { Dashboard } from './pages/Dashboard'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { WatchlistPage } from './pages/Watchlist'
import { AlertSettingsPage } from './pages/AlertSettings'
import { GraphPage } from './pages/Graph'
import { BatchPage } from './pages/Batch'
import { TeamsPage } from './pages/Teams'
import { ReportPage } from './pages/Report'
import { AuditPage } from './pages/Audit'
import { IndexerStatusPage } from './pages/IndexerStatus'
import { OrganizationPage } from './pages/Organization'
import { ReportBuilderPage } from './pages/ReportBuilder'
import { SimulatorPage } from './pages/Simulator'
import { connectAlertsSocket } from './lib/alertsSocket'
import { fetchAlerts } from './lib/endpoints'
import type { AlertItem } from './types/api'

function AppShell() {
  const navigate = useNavigate()
  const [panelOpen, setPanelOpen] = useState(false)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts])

  useEffect(() => {
    const load = async () => {
      setLoadingAlerts(true)
      try {
        const data = await fetchAlerts()
        setAlerts(data)
      } finally {
        setLoadingAlerts(false)
      }
    }
    load().catch(() => {})
  }, [])

  useEffect(() => {
    const url = import.meta.env.VITE_ALERTS_WS_URL
    if (!url) return
    return connectAlertsSocket({
      url,
      onAlert: (a) => setAlerts((prev) => [a, ...prev]),
    })
  }, [])

  const onMarkAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
  }

  const onOpenAlert = (a: AlertItem) => {
    setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, read: true } : x)))
    setPanelOpen(false)
    navigate(`/address/${a.chain}/${a.address}`)
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      <Navbar unreadCount={unreadCount} onOpenAlerts={() => setPanelOpen(true)} />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/address/:chain/:address" element={<Dashboard />} />
          <Route path="/graph/:chain/:address" element={<GraphPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/alerts" element={<AlertSettingsPage />} />
          <Route path="/batch" element={<BatchPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/indexer-status" element={<IndexerStatusPage />} />
          <Route path="/organization" element={<OrganizationPage />} />
          <Route path="/report-builder" element={<ReportBuilderPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/reports/:chain/:address" element={<ReportPage />} />
          <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
          <Route path="*" element={<PlaceholderPage title="Not Found" />} />
        </Routes>
      </main>

      <AlertsPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        alerts={alerts}
        loading={loadingAlerts}
        onMarkAllRead={onMarkAllRead}
        onOpenAlert={onOpenAlert}
      />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(17,17,17,0.9)',
            color: 'rgba(229,231,235,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </BrowserRouter>
  )
}
