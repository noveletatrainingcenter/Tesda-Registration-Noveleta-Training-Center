import { Sun, Moon, Leaf, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function AppHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, setTheme } = useThemeStore();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch (_) {}
    clearAuth();
    toast.success('Logged out successfully.');
    navigate('/');
  }

  const themes = [
    { key: 'light', icon: Sun, label: 'Light' },
    { key: 'dark', icon: Moon, label: 'Dark' },
    { key: 'green', icon: Leaf, label: 'Green' },
  ] as const;

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', position: 'sticky', top: 0, zIndex: 30 }}>
      
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
          <div className="w-5 h-0.5 mb-1" style={{ background: 'currentColor' }} />
          <div className="w-4 h-0.5 mb-1" style={{ background: 'currentColor' }} />
          <div className="w-5 h-0.5" style={{ background: 'currentColor' }} />
        </button>
        <div>
          <div className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            TESDA Noveleta Training Center
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Registration Management System</div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          {themes.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTheme(key)} title={label}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: theme === key ? 'var(--accent)' : 'transparent',
                color: theme === key ? 'white' : 'var(--text-muted)',
              }}>
              <Icon size={15} />
            </button>
          ))}
        </div>

        {/* Notifications */}
        <button className="w-9 h-9 rounded-xl flex items-center justify-center relative"
          style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: user?.role === 'admin' ? 'var(--accent)' : '#3b82f6' }}>
              {user?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</div>
              <div className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role}</div>
            </div>
            <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-12 z-50 w-52 card p-1.5" style={{ boxShadow: 'var(--shadow-lg)' }}>
                <div className="px-3 py-2 mb-1">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ID: {user?.id}</div>
                </div>
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                  style={{ color: '#ef4444' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
