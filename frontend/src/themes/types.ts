/**
 * Theme System Types
 * Complete type definitions for the EventHub theme system
 */

// ============================================
// Color System
// ============================================

export interface ThemeColors {
  // Primary palette
  primary: string;
  primaryLight: string;
  primaryDark: string;
  onPrimary: string;
  
  // Secondary palette
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  onSecondary: string;
  
  // Accent / Tertiary
  accent: string;
  accentLight: string;
  accentDark: string;
  onAccent: string;
  
  // Backgrounds
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceElevated: string;
  
  // Text
  onBackground: string;
  onSurface: string;
  onSurfaceMuted: string;
  
  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Borders & Dividers
  border: string;
  borderLight: string;
  divider: string;
  
  // Overlay
  overlay: string;
  overlayLight: string;
}

// ============================================
// Typography System
// ============================================

export interface ThemeTypography {
  // Font families
  displayFont: string;
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  
  // Font sizes (rem-based for accessibility)
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
    '6xl': string;
    '7xl': string;
    '8xl': string;
    '9xl': string;
  };
  
  // Line heights
  lineHeight: {
    none: string;
    tight: string;
    snug: string;
    normal: string;
    relaxed: string;
    loose: string;
  };
  
  // Font weights
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
}

// ============================================
// Spacing System
// ============================================

export interface ThemeSpacing {
  // Base unit (typically 4px)
  unit: number;
  
  // Spacing scale (multiples of base unit)
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
  20: string;
  24: string;
  32: string;
  40: string;
  48: string;
  56: string;
  64: string;
  80: string;
  96: string;
  128: string;
}

// ============================================
// Border Radius System
// ============================================

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  DEFAULT: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

// ============================================
// Shadows
// ============================================

export interface ThemeShadows {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  innerMd: string;
}

// ============================================
// Background Styles
// ============================================

export type BackgroundStyle = 'watercolor' | 'butterfly' | 'sparkles' | 'minimal' | 'dark' | 'solid' | 'party';

// Preview theme for admin panel
export interface PreviewTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  displayFont: string;
  headingFont: string;
  bodyFont: string;
  backgroundStyle: BackgroundStyle;
}

// ============================================
// Complete Theme
// ============================================

export interface Theme {
  // Identity
  id?: string;
  eventId?: string;
  name?: string;
  
  // Colors
  colors: ThemeColors;
  
  // Typography
  typography: ThemeTypography;
  
  // Spacing
  spacing: ThemeSpacing;
  
  // Border radius
  borderRadius: ThemeBorderRadius;
  
  // Shadows
  shadows: ThemeShadows;
  
  // Background
  backgroundStyle: BackgroundStyle;
  
  // Media paths
  logoPath?: string;
  heroImagePath?: string;
  faviconPath?: string;
}

// ============================================
// Theme Preset
// ============================================

export interface ThemePreset {
  id: string;
  name: string;
  label: string;
  description: string;
  
  // For preview UI
  gradientFrom: string;
  gradientTo: string;
  gradientVia?: string;
  
  // The actual theme data
  theme: Theme;
}

// ============================================
// Legacy Theme Compatibility
// ============================================

/**
 * Legacy theme format (used by existing backend API)
 * Kept for backward compatibility during migration
 */
export interface LegacyTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  displayFont: string;
  headingFont: string;
  bodyFont: string;
  backgroundStyle: BackgroundStyle;
}

/**
 * Convert legacy theme to new format
 */
export function legacyToTheme(legacy: LegacyTheme): Theme {
  return {
    colors: {
      primary: legacy.primaryColor,
      primaryLight: adjustColor(legacy.primaryColor, 20),
      primaryDark: adjustColor(legacy.primaryColor, -20),
      onPrimary: getContrastColor(legacy.primaryColor),
      
      secondary: legacy.secondaryColor,
      secondaryLight: adjustColor(legacy.secondaryColor, 20),
      secondaryDark: adjustColor(legacy.secondaryColor, -20),
      onSecondary: getContrastColor(legacy.secondaryColor),
      
      accent: legacy.accentColor,
      accentLight: adjustColor(legacy.accentColor, 20),
      accentDark: adjustColor(legacy.accentColor, -20),
      onAccent: getContrastColor(legacy.accentColor),
      
      background: legacy.bgColor,
      backgroundAlt: adjustColor(legacy.bgColor, 5),
      surface: legacy.bgColor,
      surfaceElevated: adjustColor(legacy.bgColor, 10),
      
      onBackground: legacy.textColor,
      onSurface: legacy.textColor,
      onSurfaceMuted: adjustColor(legacy.textColor, 40),
      
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      
      border: adjustColor(legacy.bgColor, 15),
      borderLight: adjustColor(legacy.bgColor, 8),
      divider: adjustColor(legacy.bgColor, 12),
      
      overlay: 'rgba(0, 0, 0, 0.5)',
      overlayLight: 'rgba(0, 0, 0, 0.1)',
    },
    typography: {
      displayFont: legacy.displayFont,
      headingFont: legacy.headingFont,
      bodyFont: legacy.bodyFont,
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
    backgroundStyle: legacy.backgroundStyle,
    logoPath: undefined,
    heroImagePath: undefined,
    faviconPath: undefined,
  };
}

// ============================================
// Color Utilities
// ============================================

/**
 * Adjust color brightness by percentage
 */
export function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

/**
 * Get contrasting color (black or white) for text on colored background
 * Uses WCAG 2.1 relative luminance formula for accurate contrast calculation
 * 
 * Returns #1E293B (dark) for light backgrounds, #FFFFFF (light) for dark backgrounds.
 * The threshold of ~0.18 is where black-on-color and white-on-color contrast ratios
 * cross, ensuring optimal readability for all color values.
 */
export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // WCAG 2.1 relative luminance formula with gamma correction
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Threshold ~0.18 is the crossover point where black-on-color contrast
  // equals white-on-color contrast. Above this, black text reads better.
  return luminance > 0.179 ? '#1E293B' : '#FFFFFF';
}
