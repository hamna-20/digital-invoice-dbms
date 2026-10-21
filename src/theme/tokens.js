/** Non-color design tokens used from JavaScript (colors live in colors.js). */

export const FONT_SIZES = {
  caption: '11px',
  label: '12px',
  body: '13px',
  title: '15px',
  heading: '19px',
  page: '26px',
};

/** Used with the matching `max-[Npx]:` Tailwind variants. */
export const BREAKPOINTS = {
  avatarHidden: 560,
  fieldsStacked: 600,
  columnsHidden: 820,
  headerWrapped: 900,
};

export const LAYOUT = {
  headerMaxWidth: '1120px',
  mainMaxWidth: '1080px',
  chartBarHeight: 160,
};

export const TIMING = {
  transitionFast: 150,
  modalFade: 180,
  modalPanel: 220,
  toast: 200,
  toastVisibleMs: 2400,
};
