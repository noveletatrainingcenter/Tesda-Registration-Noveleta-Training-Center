// frontend/src/components/AppHeader.tsx
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';
import clsx from 'clsx';

export default function AppHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch (_) {}
    clearAuth();
    toast.success('Logged out successfully.');
    navigate('/');
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-bg-secondary sticky top-0 z-30">

      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex flex-col gap-[3px] p-2 rounded-lg text-text-secondary"
        >
          <div className="w-5 h-0.5 bg-current rounded" />
          <div className="w-4 h-0.5 bg-current rounded" />
          <div className="w-5 h-0.5 bg-current rounded" />
        </button>
        <div>
          <div className="font-bold text-sm text-text-primary">
            TESDA Noveleta Training Center
          </div>
          <div className="text-xs text-text-muted">
            Registration Management System
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <button className="w-9 h-9 rounded-xl flex items-center justify-center relative bg-bg-input border border-border text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-input border border-border hover:border-accent transition-colors"
          >
            <div className={clsx(
              'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white',
              user?.role === 'admin' ? 'bg-accent' : 'bg-blue-500'
            )}>
              {user?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-text-primary">{user?.full_name}</div>
              <div className="text-xs capitalize text-text-muted">{user?.role}</div>
            </div>
            <ChevronDown size={13} className="text-text-muted" />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-12 z-50 w-52 card p-1.5">
                <div className="px-3 py-2 mb-1">
                  <div className="text-sm font-semibold text-text-primary">{user?.full_name}</div>
                  <div className="text-xs text-text-muted">ID: {user?.id}</div>
                </div>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
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