import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import { useAuth } from '../state/AuthContext'
import TranslateSwitcher from '../components/TranslateSwitcher'
import logo from '../assets/wos-dawn.png'

export default function Signup() {
  const nav = useNavigate()
  const { signup } = useAuth()
  const [email, setEmail] = useState('')
  const [gameName, setGameName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await signup(email, password, confirm, gameName)
      nav('/dashboard')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Signup failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="fixed top-4 right-4 z-40">
        <TranslateSwitcher />
      </div>
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-center mb-4">
          <img src={logo} alt="WOS Dawn" className="h-12 w-12 rounded-2xl object-cover shadow-xl" />
        </div>
        <h1 className="text-2xl font-semibold mb-1 text-center">Create your account</h1>
        <p className="text-center text-white/60 text-sm mb-6">Sign up to start using WOS‑DAWN</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-white/70">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-white/70">Name</label>
            <Input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Your in-game name" />
          </div>
          <div>
            <label className="text-sm text-white/70">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-white/70">Confirm Password</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Sign up'}</Button>
        </form>
        <div className="mt-4 text-sm text-white/60">
          Have an account? <Link className="text-accent" to="/login">Sign in</Link>
        </div>
        <div className="mt-6 border-t border-white/10 pt-4 text-sm">
          <div className="font-semibold text-white/80 mb-2">How to get started</div>
          <ol className="list-decimal ml-5 space-y-1 text-white/70">
            <li>Sign up and then sign in to your account.</li>
            <li>Open the Dashboard to manage profile and features.</li>
            <li>Use the left sidebar to navigate: Profile, Redeem, Alliance, Chat AI.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
