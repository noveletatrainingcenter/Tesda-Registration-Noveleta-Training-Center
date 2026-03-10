// frontend/src/components/ThemeToggle.tsx
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import clsx from 'clsx';

const themes = [
  { key: 'light', icon: Sun, label: 'Light' },
  { key: 'dark', icon: Moon, label: 'Dark' },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="theme-toggle-wrap">
      {themes.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          title={label}
          className={clsx('theme-toggle-btn', theme === key && 'active')}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}