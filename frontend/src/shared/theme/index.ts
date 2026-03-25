// Theme Provider and Context
export { ThemeProvider, useThemeContext, ThemeContext } from './ThemeProvider';
export { useTheme, useCurrentTheme, useIsThemeActive } from './useTheme';

// Types (V2 - Complete Design Token System)
export type {
  Theme as CompleteTheme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeBorderRadius,
  ThemeShadows,
  ThemeData,
  LegacyTheme,
  ThemePreset as ThemePresetV2,
  BackgroundStyle,
} from './types';

// Legacy types (for backward compatibility)
export type { Theme, ThemePreset, ThemeContextValue } from './ThemeProvider';

// Presets
export { THEME_PRESETS, getPresetByName, getDefaultPreset } from './presets';
export type { ThemePresetData } from './presets';

// Utils (V2 - Design Token Generators)
export { createTheme, legacyToTheme, mergeTheme, createThemeVariant } from './utils/themeFactory';
export { generateCSSVariables, applyCSSVariables, generateCSSString } from './utils/cssVariables';
export {
  adjustColor,
  getContrastColor,
  getContrastRatio,
  isLightColor,
  isDarkColor,
  mixColors,
  hexToRgb,
  rgbToHex,
} from './utils/colorUtils';
export {
  getThemedClasses,
  getThemedStyles,
  useThemeClasses,
  themedClassNames,
} from './utils/classes';
export type {
  ThemedClasses,
  ThemedButtonClasses,
  ThemedCardClasses,
  ThemedInputClasses,
  ThemedBadgeClasses,
  ThemedTextClasses,
  ThemedBackgroundClasses,
  ThemedSpacingClasses,
  ThemedGradientClasses,
} from './utils/classes';

// Default design tokens
export {
  DEFAULT_TYPOGRAPHY,
  DEFAULT_SPACING,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SHADOWS,
  DEFAULT_SEMANTIC_COLORS,
  DEFAULT_OVERLAY_COLORS,
} from './types';
