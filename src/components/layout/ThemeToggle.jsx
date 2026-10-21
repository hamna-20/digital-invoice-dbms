import useTheme from '../../hooks/useTheme';
import { MoonIcon, SunIcon } from '../icons/Icons';

/** Navbar icon button that switches between explicit light and dark themes. */
export default function ThemeToggle() {
  const { resolved, setMode } = useTheme();
  const isDark = resolved === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-avatar border border-line bg-card text-muted transition-colors hover:text-ink"
    >
      {isDark ? <MoonIcon size={18} /> : <SunIcon size={18} />}
    </button>
  );
}
