import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FilePlus, FileText, Settings, Users, ClipboardList, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const encoderNav = [
  { to: '/encoder', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/encoder/register', icon: FilePlus, label: 'New Registration' },
  { to: '/encoder/reports', icon: ClipboardList, label: 'Reports' },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const navItems = user?.role === 'admin' ? adminNav : encoderNav;

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside className={clsx(
        'sidebar fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'var(--accent)' }}>T</div>
            <span className="font-display font-bold text-sm text-white">TESDA NTC</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="text-xs font-semibold uppercase tracking-wider mb-3 px-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {user?.role === 'admin' ? 'Administration' : 'Encoding'}
          </div>
          <div className="flex flex-col gap-1">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink key={to} to={to} end={end} onClick={onClose}
                className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}>
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: user?.role === 'admin' ? 'var(--accent)' : '#3b82f6' }}>
              {user?.full_name?.[0] || '?'}
            </div>
            <div>
              <div className="text-xs font-semibold text-white truncate max-w-[140px]">{user?.full_name}</div>
              <div className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.role}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
