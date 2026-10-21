/**
 * Tailwind configuration for Ledgerly.
 * Every semantic color resolves to a CSS variable written by ThemeProvider,
 * so switching themes only swaps variables on <html>.
 * All raw color values live in src/theme/colors.js (gradients live here).
 */

// <alpha-value> is replaced by Tailwind with 1 (or a modifier such as 0.5).
// The optional --color-NAME-a variable carries the alpha of rgba() palette values.
const colorVar = (name) => `rgb(var(--color-${name}) / var(--color-${name}-a, <alpha-value>))`;

// Tailwind class name -> CSS variable name (key in src/theme/colors.js)
const palette = {
  brand: 'brand',
  'brand-hover': 'brandHover',
  'brand-light': 'brandLight',
  ink: 'ink',
  muted: 'muted',
  line: 'line',
  'line-soft': 'lineSoft',
  surface: 'surface',
  page: 'page',
  card: 'card',
  success: 'success',
  'success-bg': 'successBg',
  warning: 'warning',
  'warning-bg': 'warningBg',
  'warning-border': 'warningBorder',
  danger: 'danger',
  'danger-border': 'dangerBorder',
  'danger-hover-bg': 'dangerHoverBg',
  indigo: 'indigo',
  'indigo-bg': 'indigoBg',
  'input-border': 'inputBorder',
  'input-focus': 'inputFocusBorder',
  'chip-active': 'chipActiveBg',
  overlay: 'overlay',
};

const colors = {};
Object.entries(palette).forEach(([className, variableName]) => {
  colors[className] = colorVar(variableName);
});

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx}', './public/index.html'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #4F46E5, #6366F1)',
        'grad-logo': 'linear-gradient(135deg, #4F46E5, #06B6D4)',
        'grad-avatar': 'linear-gradient(135deg, #F59E0B, #F97316)',
        'grad-stat-sales': 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        'grad-stat-tax': 'linear-gradient(135deg, #0EA5E9, #06B6D4)',
        'grad-stat-pending': 'linear-gradient(135deg, #F59E0B, #F97316)',
        'grad-stat-customers': 'linear-gradient(135deg, #10B981, #059669)',
        'grad-bar': 'linear-gradient(180deg, #818CF8, #4F46E5)',
        'grad-notice': 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.05)',
        primary: '0 2px 8px rgba(79,70,229,.25)',
        'primary-hover': '0 6px 16px rgba(79,70,229,.3)',
        danger: '0 2px 8px rgba(225,29,72,.25)',
        stat: '0 8px 24px rgba(15,23,42,.08)',
        'tab-active': '0 1px 3px rgba(15,23,42,.08), 0 2px 8px rgba(15,23,42,.05)',
        modal: '0 24px 60px rgba(15,23,42,.2)',
        logo: '0 4px 12px rgba(79,70,229,.3)',
        toast: '0 10px 30px rgba(15,23,42,.25)',
      },
      borderRadius: {
        card: '16px',
        modal: '20px',
        input: '11px',
        btn: '12px',
        'btn-sm': '9px',
        nav: '14px',
        tab: '10px',
        totals: '14px',
        notice: '12px',
        toast: '14px',
        logo: '10px',
        pill: '9999px',
        avatar: '50%',
      },
    },
  },
  plugins: [],
};
