import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from '../common/ConfirmDialog';
import { THEME_OPTIONS } from '../../config/constants';
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import Chip from '../ui/Chip';

/**
 * First letter of the first and last name ("Hassan Ahmed" -> "HA").
 * A single name falls back to its first two letters ("Hassan" -> "HA").
 */
const initials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const capitalize = (value) => value[0].toUpperCase() + value.slice(1);

/** Avatar button + dropdown: account details, theme choice and sign out. */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setConfirmingSignOut(false);
    }
  };

  return (
    <div ref={containerRef} className="relative shrink-0 max-[560px]:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        title={user.business}
        aria-label={`Open account menu for ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-avatar bg-grad-avatar text-xs font-semibold text-white"
      >
        {initials(user.name)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[260px] rounded-card border border-line bg-card p-4 shadow-modal"
        >
          <p className="truncate text-[13px] font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.business}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>

          <div className="my-3 border-t border-line" />

          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Theme</p>
          <div className="flex flex-wrap gap-1.5">
            {THEME_OPTIONS.map((option) => (
              <Chip key={option} active={mode === option} onClick={() => setMode(option)}>
                {capitalize(option)}
              </Chip>
            ))}
          </div>

          <div className="my-3 border-t border-line" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setConfirmingSignOut(true);
            }}
            className="w-full rounded-btn-sm px-2 py-2 text-left text-[13px] font-medium text-danger transition-colors hover:bg-danger-hover-bg"
          >
            Sign out
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingSignOut}
        title="Sign out?"
        message="You will need to sign in again to access your invoices."
        confirmLabel="Sign out"
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={handleSignOut}
        loading={signingOut}
      />
    </div>
  );
}
