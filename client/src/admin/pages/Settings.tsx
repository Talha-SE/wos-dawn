import { useState, useEffect } from 'react'
import Input from '../../components/Input'
import Button from '../../components/Button'
import api from '../../services/api'
import TranslateSwitcher from '../../components/TranslateSwitcher'

export default function Settings() {
  const [dbBackupStatus, setDbBackupStatus] = useState<string>('')
  const [isClearing, setIsClearing] = useState(false)

  async function clearOldLogs() {
    if (!confirm('Clear activity logs older than 30 days? This cannot be undone.')) return
    setIsClearing(true)
    try {
      const { data } = await api.delete('/admin/clear-old-logs')
      alert(data.message || 'Old logs cleared successfully')
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to clear old logs')
    } finally {
      setIsClearing(false)
    }
  }

  async function exportAllData() {
    try {
      const { data } = await api.get('/admin/export-data')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wos-dawn-backup-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
      alert('Data exported successfully')
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to export data')
    }
  }

  async function checkDatabaseHealth() {
    try {
      setDbBackupStatus('Checking...')
      const { data } = await api.get('/admin/health-check')
      setDbBackupStatus(`✓ Database: ${data.database} | Collections: ${data.collections} | Status: ${data.status}`)
    } catch (e: any) {
      setDbBackupStatus('✗ Health check failed')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Admin Settings</h1>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Translation Settings</h2>
        <div className="text-sm text-white/70">
          Manage auto-translation and choose a manual language for the admin dashboard.
        </div>
        <div className="pt-1">
          <TranslateSwitcher />
        </div>
      </div>

      {/* Info Notice */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
          <div>
            <h3 className="text-white font-semibold mb-1">Authentication Method</h3>
            <p className="text-sm text-white/70">
              Admin authentication is now handled through your user account. No separate admin secret is required. 
              All API calls use your login token for authentication.
            </p>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-white">System Health</h2>
        <div className="space-y-3">
          <Button onClick={checkDatabaseHealth} variant="secondary">
            Check Database Health
          </Button>
          {dbBackupStatus && (
            <div className="text-sm text-white/70 bg-white/5 p-3 rounded-lg">
              {dbBackupStatus}
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Data Management</h2>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Export All Data</h3>
              <p className="text-sm text-white/60">
                Download a complete backup of all users, rooms, slots, and gift codes in JSON format.
              </p>
            </div>
            <Button onClick={exportAllData} variant="secondary">
              Export JSON
            </Button>
          </div>

          <div className="border-t border-white/10 pt-3" />

          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Clear Old Activity Logs</h3>
              <p className="text-sm text-white/60">
                Remove activity logs older than 30 days to free up database space.
              </p>
            </div>
            <Button onClick={clearOldLogs} variant="danger" disabled={isClearing}>
              {isClearing ? 'Clearing...' : 'Clear Logs'}
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-600/30 bg-red-600/10 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        <p className="text-sm text-white/70">
          Destructive actions that permanently affect the system. Use with extreme caution.
        </p>
        <div className="text-xs text-white/50">
          • Permanent user/room deletions are available on respective management pages<br />
          • Data backups should be performed regularly before major changes<br />
          • Contact system administrator for critical operations
        </div>
      </div>

      {/* Information */}
      <div className="rounded-2xl border border-blue-600/30 bg-blue-600/10 p-5">
        <h3 className="text-white font-semibold mb-2">ℹ️ Admin Access Info</h3>
        <div className="text-sm text-white/70 space-y-1">
          <p>• Admin authentication uses your login token automatically</p>
          <p>• All admin actions are logged and can be audited in Activity Logs</p>
          <p>• Keep your admin credentials secure and never share them</p>
        </div>
      </div>
    </div>
  )
}
