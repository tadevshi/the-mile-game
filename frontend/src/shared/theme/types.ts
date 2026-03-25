/**
 * Theme System Types
 * Complete type definitions for the EventHub theme system
 */

import { adjustColor, getContrastColor } from './utils/colorUtils'

// ============================================
// Background Styles
// ============================================

export type BackgroundStyle = 'watercolor' | 'butterfly' | 'sparkles' | 'minimal' | 'dark' | 'solid' | 'party'

// ============================================
// Color System
// ============================================

export interface ThemeColors {
  // Primary palette
  primary: string
  primaryLight: string
  primaryDark: string
  onPrimary: string
  
  // Secondary palette
  secondary: string
  secondaryLight: string
  secondaryDark: string
  onSecondary: string
  
  // Accent / Tertiary
  accent: string
  accentLight: string
  accentDark: string
  onAccent: string
  
  // Backgrounds
  background: string
  backgroundAlt: string
  surface: string
  surfaceElevated: string
  
  // Text
  onBackground: string
  onSurface: string
  onSurfaceMuted: string
  
  // Semantic
  success: string
  warning: string
  error: string
  info: string
  
  // Borders & Dividers
  border: string
  borderLight: string
  divider: string
  
  // Overlay
  overlay: string
  overlayLight: string
}

// ============================================
// Typography System
// ============================================

export interface ThemeTypography {
  // Font families
  displayFont: string
  headingFont: string
  bodyFont: string
  monoFont: string
  
  // Font sizes (rem-based for accessibility)
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
    '5xl': string
    '6xl': string
    '7xl': string
    '8xl': string
    '9xl': string
  }
  
  // Line heights
  lineHeight: {
    none: string
    tight: string
    snug: string
    normal: string
    relaxed: string
    loose: string
  }
  
  // Font weights
  fontWeight: {
    light: number
    normal: number
    medium: number
    semibold: number
    bold: number
  }
}

// ============================================
// Spacing System
// ============================================

export interface ThemeSpacing {
  // Base unit (typically 4px)
  unit: number
  
  // Spacing scale (multiples of base unit)
  0: string
  1: string
  2: string
  3: string
  4: string
  5: string
  6: string
  8: string
  10: string
  12: string
  16: string
  20: string
  24: string
  32: string
  40: string
  48: string
  56: string
  64: string
  80: string
  96: string
  128: string
}

// ============================================
// Border Radius System
// ============================================

export interface ThemeBorderRadius {
  none: string
  sm: string
  DEFAULT: string
  md: string
  lg: string
  xl: string
  '2xl': string
  '3xl': string
  full: string
}

// ============================================
// Shadows
// ============================================

export interface ThemeShadows {
  none: string
  sm: string
  base: string
  md: string
  lg: string
  xl: string
  '2xl': string
  inner: string
  innerMd: string
}

// ============================================
// Complete Theme
// ============================================

export interface Theme {
  // Identity
  id?: string
  eventId?: string
  name?: string
  
  // Colors
  colors: ThemeColors
  
  // Typography
  typography: ThemeTypography
  
  // Spacing
  spacing: ThemeSpacing
  
  // Border radius
  borderRadius: ThemeBorderRadius
  
  // Shadows
  shadows: ThemeShadows
  
  // Background
  backgroundStyle: BackgroundStyle
  
  // Media paths
  logoPath?: string
  heroImagePath?: string
  faviconPath?: string
}

// ============================================
// Flat Theme Data (for storage/API)
// ============================================

export interface ThemeData {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  bgColor: string
  textColor: string
  displayFont: string
  headingFont: string
  bodyFont: string
  backgroundStyle: BackgroundStyle
}

// ============================================
// Legacy Theme Compatibility
// ============================================

/**
 * Legacy theme format (used by existing backend API)
 * Kept for backward compatibility during migration
 */
export interface LegacyTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  bgColor: string
  textColor: string
  displayFont: string
  headingFont: string
  bodyFont: string
  backgroundStyle: BackgroundStyle
}

// ============================================
// Theme Preset
// ============================================

export interface ThemePreset {
  id: string
  name: string
  label: string
  description: string
  
  // For preview UI
  gradientFrom: string
  gradientTo: string
  gradientVia?: string
  
  // The actual theme data
  theme: Theme
}

// ============================================
// Default Design Tokens
// ============================================

export const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  displayFont: 'Great Vibes',
  headingFont: 'Playfair Display',
  bodyFont: 'Montserrat',
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
}

export const DEFAULT_SPACING: ThemeSpacing = {
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
}

export const DEFAULT_BORDER_RADIUS: ThemeBorderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
}

export const DEFAULT_SHADOWS: ThemeShadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  innerMd: 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
}

export const DEFAULT_SEMANTIC_COLORS = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
}

export const DEFAULT_OVERLAY_COLORS = {
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
}
