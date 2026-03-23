/**
 * Theme System - EventHub
 * Complete theming infrastructure for customizable event themes
 */

// ============================================
// Core Types
// ============================================

export type {
  Theme,
  ThemePreset,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeBorderRadius,
  ThemeShadows,
  BackgroundStyle,
  LegacyTheme,
  PreviewTheme,
} from './types';

// ============================================
// Utility Functions
// ============================================

export {
  generateCSSVariables,
  applyCSSVariables,
  generateCSSString,
} from './utils/cssVariables';

// Type exports from types
export { legacyToTheme } from './types';

// ============================================
// Presets
// ============================================

export {
  etherealGala,
  autumnalVows,
  kidsCarnival,
  monolithEditorial,
  nocturneElegance,
  executiveSuite,
  ALL_PRESETS,
  getPresetById,
  getPresetByName,
  getDefaultPreset,
} from './presets';

// ============================================
// Components & Hooks
// ============================================

export { ThemeProvider, useTheme, ThemeContext } from './ThemeProvider';
export type { ThemeProviderProps, ThemeContextType } from './ThemeProvider';

export {
  useTheme as useThemeHook,
  useThemeColor,
  useThemeFont,
} from './hooks/useTheme';

// ============================================
// Default Theme
// ============================================

export { defaultTheme as DEFAULT_THEME } from './ThemeProvider';
