import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { darkColors, lightColors } from './colors';
import { STORAGE_KEYS, THEME_OPTIONS } from '../config/constants';
import { get, set } from '../services/storage';

export const ThemeContext = createContext(null);

/** Converts a hex/rgba palette value into an RGB triplet plus its alpha. */
function parseColor(value) {
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
    const number = parseInt(full, 16);
    return { triplet: `${(number >> 16) & 255} ${(number >> 8) & 255} ${number & 255}`, alpha: 1 };
  }
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return { triplet: '0 0 0', alpha: 1 };
  const parts = match[1].split(',').map((part) => part.trim());
  return { triplet: `${parts[0]} ${parts[1]} ${parts[2]}`, alpha: parts[3] === undefined ? 1 : Number(parts[3]) };
}

/** Writes the active palette to CSS variables on <html> and toggles `dark`. */
function applyPalette(palette, isDark) {
  const root = document.documentElement;
  Object.entries(palette).forEach(([name, value]) => {
    const { triplet, alpha } = parseColor(value);
    root.style.setProperty(`--color-${name}`, triplet);
    if (alpha < 1) root.style.setProperty(`--color-${name}-a`, String(alpha));
    else root.style.removeProperty(`--color-${name}-a`);
  });
  root.classList.toggle('dark', isDark);
}

/**
 * Holds the theme choice (light / dark / system) and keeps the CSS variables,
 * the `dark` class and the saved choice in sync. Printing always uses light.
 */
export default function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    const saved = get(STORAGE_KEYS.THEME, 'system');
    return THEME_OPTIONS.includes(saved) ? saved : 'system';
  });
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  const palette = resolved === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    applyPalette(palette, resolved === 'dark');
    set(STORAGE_KEYS.THEME, mode);
  }, [palette, resolved, mode]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // Printing always uses the light palette, then restores the active theme.
  useEffect(() => {
    const handleBeforePrint = () => applyPalette(lightColors, false);
    const handleAfterPrint = () => applyPalette(palette, resolved === 'dark');
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [palette, resolved]);

  const setMode = useCallback((nextMode) => {
    if (THEME_OPTIONS.includes(nextMode)) setModeState(nextMode);
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
