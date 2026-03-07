// frontend/src/components/ThemeToggle.tsx
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

const themes = [
  { key: 'light', icon: Sun, label: 'Light' },
  { key: 'dark', icon: Moon, label: 'Dark' },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl"
      style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
    >
      {themes.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          title={label}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: theme === key ? 'var(--accent)' : 'transparent',
            color: theme === key ? 'white' : 'var(--text-muted)',
          }}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}