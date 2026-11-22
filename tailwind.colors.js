// Colours come from CSS variables (src/styles/theme.css) so light and dark share one set of class names.
const channel = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export const colors = {
  surface: {
    DEFAULT: channel('surface'),
    'container-low': channel('surface-container-low'),
    container: channel('surface-container'),
    'container-high': channel('surface-container-high'),
    'container-highest': channel('surface-container-highest'),
    'container-lowest': channel('surface-container-lowest'),
    bright: channel('surface-bright'),
  },
  primary: {
    DEFAULT: channel('primary'),
    container: channel('primary-container'),
    fixed: channel('primary-fixed'),
    'on-fixed': channel('primary-on-fixed'),
  },
  secondary: {
    DEFAULT: channel('secondary'),
    container: channel('secondary-container'),
    'on-container': channel('secondary-on-container'),
  },
  tertiary: {
    DEFAULT: channel('tertiary'),
    container: channel('tertiary-container'),
    'on-container': channel('tertiary-on-container'),
  },
  'on-surface': {
    DEFAULT: channel('on-surface'),
    variant: channel('on-surface-variant'),
  },
  outline: {
    DEFAULT: channel('outline'),
    variant: 'rgb(var(--c-outline) / 0.2)',
  },
  danger: {
    DEFAULT: channel('danger'),
    container: channel('danger-container'),
    'on-container': channel('danger-on-container'),
  },
  scrim: channel('scrim'),
  success: {
    DEFAULT: channel('success'),
    container: channel('success-container'),
    'on-container': channel('success-on-container'),
  },
};

export const boxShadow = {
  ambient: 'var(--shadow-ambient)',
  'ambient-elevated': 'var(--shadow-ambient-elevated)',
  'ambient-sm': 'var(--shadow-ambient-sm)',
};
