/**
 * Theme Factory
 * 
 * Functions for creating complete Theme objects from flat theme data.
 * Generates all design tokens (color variants, spacing, shadows, etc.)
 */

import { adjustColor, getContrastColor } from './colorUtils'
import {
  type Theme,
  type ThemeData,
  type LegacyTheme,
  type ThemeColors,
  DEFAULT_TYPOGRAPHY,
  DEFAULT_SPACING,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SHADOWS,
  DEFAULT_SEMANTIC_COLORS,
  DEFAULT_OVERLAY_COLORS,
} from '../types'

// Re-export ThemeData for convenience
export type { ThemeData } from '../types'

/**
 * Create a complete Theme object from flat ThemeData
 * 
 * Generates all design tokens including:
 * - Color variants (light/dark/on)
 * - Typography system
 * - Spacing scale
 * - Border radius scale
 * - Shadow scale
 * 
 * @param data - Flat theme data (from API or preset)
 * @returns Complete Theme object with all design tokens
 */
export function createTheme(data: ThemeData): Theme {
  const colors = createColors(data)
  const typography = createTypography(data)
  
  return {
    colors,
    typography,
    spacing: DEFAULT_SPACING,
    borderRadius: DEFAULT_BORDER_RADIUS,
    shadows: DEFAULT_SHADOWS,
    backgroundStyle: data.backgroundStyle,
  }
}

/**
 * Convert legacy theme format to new Theme format
 * 
 * @param legacy - Legacy theme object (flat structure)
 * @returns Complete Theme object with all design tokens
 */
export function legacyToTheme(legacy: LegacyTheme): Theme {
  return createTheme({
    primaryColor: legacy.primaryColor,
    secondaryColor: legacy.secondaryColor,
    accentColor: legacy.accentColor,
    bgColor: legacy.bgColor,
    textColor: legacy.textColor,
    displayFont: legacy.displayFont,
    headingFont: legacy.headingFont,
    bodyFont: legacy.bodyFont,
    backgroundStyle: legacy.backgroundStyle,
  })
}

/**
 * Create complete color system from flat theme data
 */
function createColors(data: ThemeData): ThemeColors {
  const { primaryColor, secondaryColor, accentColor, bgColor, textColor } = data

  return {
    // Primary palette
    primary: primaryColor,
    primaryLight: adjustColor(primaryColor, 20),
    primaryDark: adjustColor(primaryColor, -20),
    onPrimary: getContrastColor(primaryColor),
    
    // Secondary palette
    secondary: secondaryColor,
    secondaryLight: adjustColor(secondaryColor, 20),
    secondaryDark: adjustColor(secondaryColor, -20),
    onSecondary: getContrastColor(secondaryColor),
    
    // Accent palette
    accent: accentColor,
    accentLight: adjustColor(accentColor, 20),
    accentDark: adjustColor(accentColor, -20),
    onAccent: getContrastColor(accentColor),
    
    // Backgrounds
    background: bgColor,
    backgroundAlt: adjustColor(bgColor, 5),
    surface: bgColor,
    surfaceElevated: adjustColor(bgColor, 10),
    
    // Text
    onBackground: textColor,
    onSurface: textColor,
    onSurfaceMuted: adjustColor(textColor, 40),
    
    // Semantic colors (standardized)
    ...DEFAULT_SEMANTIC_COLORS,
    
    // Borders & Dividers
    border: adjustColor(bgColor, 15),
    borderLight: adjustColor(bgColor, 8),
    divider: adjustColor(bgColor, 12),
    
    // Overlay
    ...DEFAULT_OVERLAY_COLORS,
  }
}

/**
 * Create typography system from flat theme data
 */
function createTypography(data: ThemeData): typeof DEFAULT_TYPOGRAPHY {
  return {
    ...DEFAULT_TYPOGRAPHY,
    displayFont: data.displayFont,
    headingFont: data.headingFont,
    bodyFont: data.bodyFont,
  }
}

/**
 * Merge partial theme data with existing theme
 * 
 * @param base - Base theme to merge with
 * @param partial - Partial theme data to apply
 * @returns New theme with merged values
 */
export function mergeTheme(base: Theme, partial: Partial<ThemeData>): Theme {
  const currentData: ThemeData = {
    primaryColor: base.colors.primary,
    secondaryColor: base.colors.secondary,
    accentColor: base.colors.accent,
    bgColor: base.colors.background,
    textColor: base.colors.onBackground,
    displayFont: base.typography.displayFont,
    headingFont: base.typography.headingFont,
    bodyFont: base.typography.bodyFont,
    backgroundStyle: base.backgroundStyle,
  }
  
  return createTheme({ ...currentData, ...partial })
}

/**
 * Create a theme variant (e.g., dark mode)
 * 
 * @param base - Base theme
 * @param variant - Variant type
 * @returns New theme with variant applied
 */
export function createThemeVariant(
  base: Theme,
  variant: 'light' | 'dark'
): Theme {
  if (variant === 'dark') {
    return createTheme({
      primaryColor: base.colors.primary,
      secondaryColor: base.colors.secondary,
      accentColor: base.colors.accent,
      bgColor: '#0F172A',
      textColor: '#F8FAFC',
      displayFont: base.typography.displayFont,
      headingFont: base.typography.headingFont,
      bodyFont: base.typography.bodyFont,
      backgroundStyle: 'dark',
    })
  }
  
  return createTheme({
    primaryColor: base.colors.primary,
    secondaryColor: base.colors.secondary,
    accentColor: base.colors.accent,
    bgColor: '#FFFFFF',
    textColor: '#1E293B',
    displayFont: base.typography.displayFont,
    headingFont: base.typography.headingFont,
    bodyFont: base.typography.bodyFont,
    backgroundStyle: 'minimal',
  })
}
