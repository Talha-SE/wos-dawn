import { Routes, Route, Navigate } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import Overview from './pages/Overview'
import Users from './pages/Users'
import Rooms from './pages/Rooms'
import GiftCodes from './pages/GiftCodes'
import Slots from './pages/Slots'
import SupportTickets from './pages/SupportTickets'
import ActivityLogs from './pages/ActivityLogs'
import Settings from './pages/Settings'

export default function AdminApp() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
      
      <AdminSidebar />
      <main className="flex-1 min-h-screen p-4 md:p-8 relative">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Routes>
            <Route path="/" element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="users" element={<Users />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="gift-codes" element={<GiftCodes />} />
            <Route path="slots" element={<Slots />} />
            <Route path="support-tickets" element={<SupportTickets />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
