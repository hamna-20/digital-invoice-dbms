/**
 * The single source of truth for every color in the app.
 * Both palettes share the same keys; ThemeProvider converts each value into
 * an RGB triplet CSS variable (plus an alpha variable for rgba() values).
 * Edit a value here and the whole app updates - no other file needs changes.
 */

export const lightColors = {
  brand: '#4F46E5',
  brandHover: '#4338CA',
  brandLight: '#6366F1',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E8ECF3',
  lineSoft: '#F1F4F9',
  surface: '#F8FAFC',
  page: '#FBFCFE',
  card: '#FFFFFF',
  success: '#047857',
  successBg: '#D1FAE5',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  warningBorder: '#FDE68A',
  danger: '#E11D48',
  dangerBorder: '#FECDD3',
  dangerHoverBg: '#FFF1F2',
  indigo: '#4338CA',
  indigoBg: '#E0E7FF',
  inputBorder: '#DDE3EC',
  inputFocusBorder: '#818CF8',
  chipActiveBg: '#0F172A',
  overlay: 'rgba(15,23,42,.35)',
};

export const darkColors = {
  brand: '#4F46E5',
  brandHover: '#6366F1',
  brandLight: '#6366F1',
  ink: '#E2E8F0',
  muted: '#94A3B8',
  line: '#1E293B',
  lineSoft: '#172033',
  surface: '#16213A',
  page: '#0B1220',
  card: '#111A2E',
  success: '#34D399',
  successBg: 'rgba(16,185,129,.15)',
  warning: '#FBBF24',
  warningBg: 'rgba(245,158,11,.15)',
  warningBorder: 'rgba(245,158,11,.3)',
  danger: '#FB7185',
  dangerBorder: 'rgba(251,113,133,.3)',
  dangerHoverBg: 'rgba(251,113,133,.1)',
  indigo: '#A5B4FC',
  indigoBg: 'rgba(99,102,241,.18)',
  inputBorder: '#334155',
  inputFocusBorder: '#818CF8',
  chipActiveBg: '#E2E8F0',
  overlay: 'rgba(2,6,23,.6)',
};
