import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import { useAuth } from '../state/AuthContext'
import TranslateSwitcher from '../components/TranslateSwitcher'
import api from '../services/api'

export default function Login() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'user' | 'admin'>('user')

  useEffect(() => {
    const url = new URL(window.location.href)
    const r = (url.searchParams.get('role') || '').toLowerCase()
    if (r === 'admin') setRole('admin')
    // prefill last used email
    try {
      const last = localStorage.getItem('last_email')
      if (last) setEmail(last)
    } catch {}
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const em = email.trim()
    const pw = password
    // quick client-side validation to avoid unnecessary request
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Please enter a valid email address')
      return
    }
    if (!pw) {
      setError('Password is required')
      return
    }
    setLoading(true)
    try {
      const user = await login(em, pw)
      try { localStorage.setItem('last_email', em) } catch {}
      if (role === 'admin') {
        if (!user?.isAdmin) {
          setError('You do not have admin privileges')
          return
        }
        localStorage.setItem('admin_session', '1')
        nav('/admin')
        return
      }
      nav('/dashboard')
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
      
      {/* Animated Gradient Orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="fixed top-4 right-4 z-40">
        <TranslateSwitcher />
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-900/90 backdrop-blur-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
              <span className="text-2xl font-bold text-white">WD</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/60 text-sm">Sign in to continue to WOS-DAWN</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Role Selector */}
            <div>
              <label className="text-sm font-medium text-white/80 mb-2 block">Select Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`relative rounded-xl border px-4 py-3 font-medium transition-all duration-200 ${
                    role === 'user'
                      ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50 text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {role === 'user' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  )}
                  User
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`relative rounded-xl border px-4 py-3 font-medium transition-all duration-200 ${
                    role === 'admin'
                      ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50 text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {role === 'admin' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  )}
                  Admin
                </button>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="text-sm font-medium text-white/80 mb-2 block">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); try { localStorage.setItem('last_email', e.target.value) } catch {} }}
                required
                placeholder="Enter your email"
                className="bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="text-sm font-medium text-white/80 mb-2 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="pr-12 bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-white/50 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Admin Notice */}
            {role === 'admin' && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-300/90 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  You will be logged in as an administrator if your account has admin privileges.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl shadow-lg transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                role === 'admin' ? 'Sign in as Admin' : 'Sign in'
              )}
            </Button>
          </form>

          {/* Discord Invite */}
          <div className="mt-6 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-slate-900/60 to-purple-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-sky-500 flex items-center justify-center shadow-[0_8px_22px_rgba(59,130,246,0.6)]">
                <span className="text-lg">💬</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Join the WOS Dawn Discord</div>
                <div className="text-xs text-white/60">Chat with other commanders, get updates and share strategies.</div>
              </div>
            </div>
            <a
              href="https://discord.gg/Q8J5sgWNb4"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 shadow-[0_10px_24px_rgba(59,130,246,0.7)] transition-transform hover:translate-y-px active:scale-95"
            >
              Open Discord
            </a>
          </div>

          {/* Footer Links */}
          {role === 'user' && (
            <div className="mt-6 text-center text-sm text-white/60">
              No account?{' '}
              <Link className="text-blue-400 hover:text-blue-300 font-medium transition-colors" to="/signup">
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Brand Footer */}
        <div className="mt-4 text-center text-xs text-white/40">
          WOS-DAWN © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
