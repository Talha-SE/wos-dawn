import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, MessageSquare, Gift, Calendar, Activity, Cog, LogOut } from 'lucide-react'
 import type { ReactNode } from 'react'
 
function NavItem({ to, icon, label, active }: { to: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-white shadow-lg shadow-blue-500/10' 
          : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
      }`}
    >
      <span className="grid place-items-center shrink-0">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  )
}

export default function AdminSidebar() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 backdrop-blur-xl min-h-screen px-4 py-6 hidden md:block">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">WD</span>
          </div>
          <div className="font-display text-xl font-bold text-white">Admin</div>
        </div>
        <div className="text-[11px] uppercase tracking-wider text-white/50 pl-10">Management Console</div>
      </div>
      <nav className="flex flex-col gap-1.5">
        <NavItem to="/admin/overview" icon={<LayoutDashboard size={18} />} label="Overview" active={pathname.includes('/admin/overview')} />
        <NavItem to="/admin/users" icon={<Users size={18} />} label="Users" active={pathname.includes('/admin/users')} />
        <NavItem to="/admin/rooms" icon={<MessageSquare size={18} />} label="Alliance Rooms" active={pathname.includes('/admin/rooms')} />
        <NavItem to="/admin/gift-codes" icon={<Gift size={18} />} label="Gift Codes" active={pathname.includes('/admin/gift-codes')} />
        <NavItem to="/admin/slots" icon={<Calendar size={18} />} label="SVS Slots" active={pathname.includes('/admin/slots')} />
        <NavItem to="/admin/activity-logs" icon={<Activity size={18} />} label="Activity Logs" active={pathname.includes('/admin/activity-logs')} />
        <div className="my-2 border-t border-white/10" />
        <NavItem to="/admin/settings" icon={<Cog size={18} />} label="Settings" active={pathname.includes('/admin/settings')} />
      </nav>
      <div className="mt-auto pt-6 border-t border-white/10 absolute bottom-6 left-4 right-4">
        <button
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-500/20 hover:border-red-500/30 px-3 py-2.5 transition-all duration-200 font-medium text-sm"
          onClick={() => { localStorage.removeItem('admin_session'); nav('/login?role=admin') }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  )
}
