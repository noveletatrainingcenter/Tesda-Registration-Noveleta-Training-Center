// frontend/src/components/Sidebar.tsx
import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ClipboardList, Users2, BookOpen,
  Users, ScrollText, Settings, ChevronUp, X, DatabaseBackup, UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import clsx from 'clsx';
import tesdalogo from '@/assets/TESDA-LOGO.png';

const adminNav = [
  { to: '/admin',             icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/admin/applicants',  icon: UserCheck,       label: 'Applicants'           },
  { to: '/admin/courses',     icon: BookOpen,        label: 'Courses'              },
  { to: '/admin/reports',     icon: FileText,        label: 'Reports'              },
];

const encoderNav = [
  { to: '/encoder',            icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/encoder/applicants', icon: UserCheck,       label: 'Applicants'           },
  { to: '/encoder/courses',    icon: BookOpen,        label: 'Courses'              },
  { to: '/encoder/reports',    icon: ClipboardList,   label: 'Reports'              },
];

const adminSettingsNav = [
  { to: '/admin/users',   icon: Users,          label: 'User Management' },
  { to: '/admin/audit',   icon: ScrollText,      label: 'Audit Trail'     },
  { to: '/admin/backup',  icon: DatabaseBackup,  label: 'Backup & Restore'},
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user      = useAuthStore(state => state.user);
  const clearAuth = useAuthStore(state => state.clearAuth);
  const navigate  = useNavigate();
  const navItems  = user?.role === 'admin' ? adminNav : encoderNav;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={clsx(
        'sidebar fixed top-0 left-0 h-full z-40 transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <img
              src={tesdalogo}
              alt="TESDA Logo"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span className="font-bold text-sm text-white">TESDA NTC</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3 px-2">
            {user?.role === 'admin' ? 'Administration' : 'Encoding'}
          </div>

          <div className="flex flex-col gap-1">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
              >
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            ))}

            {user?.role === 'admin' && (
              <div ref={settingsRef}>
                <button
                  onClick={() => setSettingsOpen(prev => !prev)}
                  className={clsx('sidebar-link w-full', settingsOpen && 'active')}
                >
                  <Settings size={17} />
                  <span className="flex-1 text-left">Settings</span>
                  <ChevronUp
                    size={14}
                    className={clsx(
                      'transition-transform duration-200 text-white/40',
                      settingsOpen ? 'rotate-0' : 'rotate-180'
                    )}
                  />
                </button>

                {settingsOpen && (
                  <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-white/10 pl-3">
                    {adminSettingsNav.map(({ to, icon: Icon, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={onClose}
                        className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
                      >
                        <Icon size={16} />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

      </aside>
    </>
  );
}