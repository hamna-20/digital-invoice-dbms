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
  brand: '#8984E8',
  brandHover: '#9B96F0',
  brandLight: '#AAA6F4',
  ink: '#E9ECF4',
  muted: '#A7B0C0',
  line: '#343D4D',
  lineSoft: '#293140',
  surface: '#272F3D',
  page: '#171B25',
  card: '#202632',
  success: '#78D4B0',
  successBg: 'rgba(71,166,129,.17)',
  warning: '#E5BF73',
  warningBg: 'rgba(194,151,63,.16)',
  warningBorder: 'rgba(211,169,84,.32)',
  danger: '#F08FA1',
  dangerBorder: 'rgba(240,143,161,.32)',
  dangerHoverBg: 'rgba(240,143,161,.12)',
  indigo: '#C0BDF0',
  indigoBg: 'rgba(137,132,232,.18)',
  inputBorder: '#414B5D',
  inputFocusBorder: '#AAA6F4',
  chipActiveBg: '#E9ECF4',
  overlay: 'rgba(2,6,23,.6)',
};
