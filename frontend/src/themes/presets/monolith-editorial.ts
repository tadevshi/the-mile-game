/**
 * Monolith Editorial Theme Preset
 * Bold, high-contrast theme for impactful presentations
 */

import type { Theme, ThemePreset } from '../types';
import { adjustColor, getContrastColor } from '../types';

const primaryColor = '#F59E0B';
const secondaryColor = '#FDE68A';
const accentColor = '#D97706';
const bgColor = '#FFFBEB';
const textColor = '#1E293B';

const theme: Theme = {
  id: 'monolith-editorial',
  name: 'Monolith Editorial',
  colors: {
    primary: primaryColor,
    primaryLight: adjustColor(primaryColor, 20),
    primaryDark: adjustColor(primaryColor, -20),
    onPrimary: getContrastColor(primaryColor),
    
    secondary: secondaryColor,
    secondaryLight: adjustColor(secondaryColor, 20),
    secondaryDark: adjustColor(secondaryColor, -20),
    onSecondary: getContrastColor(secondaryColor),
    
    accent: accentColor,
    accentLight: adjustColor(accentColor, 20),
    accentDark: adjustColor(accentColor, -20),
    onAccent: getContrastColor(accentColor),
    
    background: bgColor,
    backgroundAlt: adjustColor(bgColor, 5),
    surface: bgColor,
    surfaceElevated: adjustColor(bgColor, 10),
    
    onBackground: textColor,
    onSurface: textColor,
    onSurfaceMuted: adjustColor(textColor, 40),
    
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    border: adjustColor(bgColor, 15),
    borderLight: adjustColor(bgColor, 8),
    divider: adjustColor(bgColor, 12),
    
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.1)',
  },
  typography: {
    displayFont: 'Fredoka One, cursive',
    headingFont: 'Nunito, sans-serif',
    bodyFont: 'Open Sans, sans-serif',
    monoFont: 'JetBrains Mono, monospace',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
      '7xl': '4.5rem',
      '8xl': '6rem',
      '9xl': '8rem',
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    unit: 4,
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    40: '10rem',
    48: '12rem',
    56: '14rem',
    64: '16rem',
    80: '20rem',
    96: '24rem',
    128: '32rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    innerMd: 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  backgroundStyle: 'party',
};

export const monolithEditorial: ThemePreset = {
  id: 'monolith-editorial',
  name: 'monolith-editorial',
  label: 'Monolith Editorial',
  description: 'Bold and energetic with warm yellow tones, perfect for dynamic events',
  gradientFrom: 'from-yellow-400',
  gradientTo: 'to-amber-500',
  theme,
};
