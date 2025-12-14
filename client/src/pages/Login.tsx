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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_10%_20%,rgba(37,99,235,0.2)_0%,transparent_50%),radial-gradient(circle_at_90%_80%,rgba(6,182,212,0.16)_0%,transparent_50%),radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.12)_0%,transparent_50%)] relative overflow-hidden">
      {/* Animated Aurora Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[rgba(37,99,235,0.15)] rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[rgba(6,182,212,0.15)] rounded-full blur-3xl animate-[pulse_10s_ease-in-out_1s_infinite]" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[rgba(168,85,247,0.12)] rounded-full blur-3xl animate-[pulse_12s_ease-in-out_2s_infinite]" />
      </div>
      
      <div className="fixed top-4 right-4 z-40">
        <TranslateSwitcher />
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-filter backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 relative">
          {/* Glowing orb behind card for glass effect */}
          <div className="glowing-orb" style={{top: '-60px', right: '-60px'}}></div>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-[0_8px_22px_rgba(59,130,246,0.6)]">
              <span className="text-2xl font-bold text-white">WD</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 font-[Inter]">Welcome Back</h1>
            <p className="text-white/70 text-sm font-[Inter]">Sign in to continue to WOS-DAWN</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Role Selector - sliding pill toggle */}
            <div className="role-selector">
              <label className="text-sm font-medium text-white/80 mb-2 block">Select Role</label>
              <div className={`toggle-pill ${role === 'admin' ? 'right' : ''}`} role="tablist" aria-label="Select role">
                <div className={`slider`} />
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  role="tab"
                  aria-selected={role === 'user'}
                  className={`option ${role === 'user' ? 'active' : ''}`}
                >
                  User
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  role="tab"
                  aria-selected={role === 'admin'}
                  className={`option ${role === 'admin' ? 'active' : ''}`}
                >
                  Admin
                </button>
              </div>
            </div>

            {/* Email Field (floating label) */}
            <div className="input-group">
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); try { localStorage.setItem('last_email', e.target.value) } catch {} }}
                required
                placeholder=" "
                className="modern-input w-full"
              />
              <label htmlFor="email" className="input-label">Email Address</label>
            </div>

            {/* Password Field (floating label) */}
            <div className="input-group" style={{position: 'relative'}}>
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder=" "
                className="modern-input w-full pr-12"
              />
              <label htmlFor="password" className="input-label">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 flex items-center justify-center px-3 text-white/50 hover:text-white transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Admin Notice */}
            {role === 'admin' && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-5">
                <p className="text-sm text-blue-300/90 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  You will be logged in as an administrator if your account has admin privileges.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-box">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-white font-medium py-3 rounded-xl transition-all duration-200"
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
          <div className="mt-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 discord-box">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-white/10">
                <span className="text-base opacity-80">💬</span>
              </div>
              <div>
                <div className="text-sm font-medium">Join the WOS Dawn Discord</div>
                <div className="text-xs">Chat with other commanders</div>
              </div>
            </div>
            <a
              href="https://discord.gg/Q8J5sgWNb4"
              target="_blank"
              rel="noreferrer"
              className="discord-join-btn"
            >
              Join
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
        <div className="mt-8 text-center text-xs text-white/20">
          WOS-DAWN © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
