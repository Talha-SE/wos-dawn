import { Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import QuickRedeem from './pages/QuickRedeem'
import { useAuth } from './state/AuthContext'
import AdminApp from './admin/AdminApp'

function Protected({ children }: { children: JSX.Element }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

function AdminProtected({ children }: { children: JSX.Element }) {
  const { token, user } = useAuth()
  const isAdmin = token && user?.isAdmin
  return isAdmin ? children : <Navigate to="/login?role=admin" replace />
}

export default function App() {
  return (
    <div className="app-shell">
      <div className="ambient-orb orb-1 animate-float" aria-hidden="true" />
      <div className="ambient-orb orb-2 animate-float" aria-hidden="true" />
      <div className="grid-overlay" aria-hidden="true" />
      <div className="relative z-10 min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/quick-redeem" element={<QuickRedeem />} />
          <Route path="/dashboard/*" element={<Protected><Dashboard /></Protected>} />
          <Route path="/admin/*" element={<AdminProtected><AdminApp /></AdminProtected>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
      <Analytics />
    </div>
  )
}
