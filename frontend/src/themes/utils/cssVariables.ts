/**
 * CSS Variables Generator
 * Converts Theme objects to CSS custom properties
 */

import type { Theme, ThemeColors, ThemeTypography, ThemeSpacing, ThemeBorderRadius, ThemeShadows } from '../types';

/**
 * Generate CSS custom properties from a Theme object
 * Returns a record of CSS variable name to value
 */
export function generateCSSVariables(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {};
  
  // Colors
  const colorVars = generateColorVariables(theme.colors);
  Object.assign(vars, colorVars);
  
  // Typography
  const typographyVars = generateTypographyVariables(theme.typography);
  Object.assign(vars, typographyVars);
  
  // Spacing
  const spacingVars = generateSpacingVariables(theme.spacing);
  Object.assign(vars, spacingVars);
  
  // Border radius
  const radiusVars = generateBorderRadiusVariables(theme.borderRadius);
  Object.assign(vars, radiusVars);
  
  // Shadows
  const shadowVars = generateShadowVariables(theme.shadows);
  Object.assign(vars, shadowVars);
  
  // Background style
  vars['--theme-background-style'] = theme.backgroundStyle;
  
  return vars;
}

/**
 * Generate color CSS variables
 */
function generateColorVariables(colors: ThemeColors): Record<string, string> {
  return {
    // Primary
    '--color-primary': colors.primary,
    '--color-primary-light': colors.primaryLight,
    '--color-primary-dark': colors.primaryDark,
    '--color-on-primary': colors.onPrimary,
    
    // Secondary
    '--color-secondary': colors.secondary,
    '--color-secondary-light': colors.secondaryLight,
    '--color-secondary-dark': colors.secondaryDark,
    '--color-on-secondary': colors.onSecondary,
    
    // Accent
    '--color-accent': colors.accent,
    '--color-accent-light': colors.accentLight,
    '--color-accent-dark': colors.accentDark,
    '--color-on-accent': colors.onAccent,
    
    // Backgrounds
    '--color-background': colors.background,
    '--color-background-alt': colors.backgroundAlt,
    '--color-surface': colors.surface,
    '--color-surface-elevated': colors.surfaceElevated,
    
    // Text
    '--color-on-background': colors.onBackground,
    '--color-on-surface': colors.onSurface,
    '--color-on-surface-muted': colors.onSurfaceMuted,
    
    // Semantic
    '--color-success': colors.success,
    '--color-warning': colors.warning,
    '--color-error': colors.error,
    '--color-info': colors.info,
    
    // Borders
    '--color-border': colors.border,
    '--color-border-light': colors.borderLight,
    '--color-divider': colors.divider,
    
    // Overlay
    '--color-overlay': colors.overlay,
    '--color-overlay-light': colors.overlayLight,
    
    // Tailwind-compatible shortcuts
    '--tw-primary': colors.primary,
    '--tw-secondary': colors.secondary,
    '--tw-accent': colors.accent,
    '--tw-bg': colors.background,
    '--tw-text': colors.onBackground,
  };
}

/**
 * Generate typography CSS variables
 */
function generateTypographyVariables(typography: ThemeTypography): Record<string, string> {
  return {
    // Font families
    '--font-display': typography.displayFont,
    '--font-heading': typography.headingFont,
    '--font-body': typography.bodyFont,
    '--font-mono': typography.monoFont,
    
    // Font sizes
    '--font-size-xs': typography.fontSize.xs,
    '--font-size-sm': typography.fontSize.sm,
    '--font-size-base': typography.fontSize.base,
    '--font-size-lg': typography.fontSize.lg,
    '--font-size-xl': typography.fontSize.xl,
    '--font-size-2xl': typography.fontSize['2xl'],
    '--font-size-3xl': typography.fontSize['3xl'],
    '--font-size-4xl': typography.fontSize['4xl'],
    '--font-size-5xl': typography.fontSize['5xl'],
    '--font-size-6xl': typography.fontSize['6xl'],
    '--font-size-7xl': typography.fontSize['7xl'],
    '--font-size-8xl': typography.fontSize['8xl'],
    '--font-size-9xl': typography.fontSize['9xl'],
    
    // Line heights
    '--line-height-none': typography.lineHeight.none,
    '--line-height-tight': typography.lineHeight.tight,
    '--line-height-snug': typography.lineHeight.snug,
    '--line-height-normal': typography.lineHeight.normal,
    '--line-height-relaxed': typography.lineHeight.relaxed,
    '--line-height-loose': typography.lineHeight.loose,
    
    // Font weights
    '--font-weight-light': String(typography.fontWeight.light),
    '--font-weight-normal': String(typography.fontWeight.normal),
    '--font-weight-medium': String(typography.fontWeight.medium),
    '--font-weight-semibold': String(typography.fontWeight.semibold),
    '--font-weight-bold': String(typography.fontWeight.bold),
  };
}

/**
 * Generate spacing CSS variables
 */
function generateSpacingVariables(spacing: ThemeSpacing): Record<string, string> {
  return {
    '--spacing-unit': String(spacing.unit),
    '--spacing-0': spacing[0],
    '--spacing-1': spacing[1],
    '--spacing-2': spacing[2],
    '--spacing-3': spacing[3],
    '--spacing-4': spacing[4],
    '--spacing-5': spacing[5],
    '--spacing-6': spacing[6],
    '--spacing-8': spacing[8],
    '--spacing-10': spacing[10],
    '--spacing-12': spacing[12],
    '--spacing-16': spacing[16],
    '--spacing-20': spacing[20],
    '--spacing-24': spacing[24],
    '--spacing-32': spacing[32],
    '--spacing-40': spacing[40],
    '--spacing-48': spacing[48],
    '--spacing-56': spacing[56],
    '--spacing-64': spacing[64],
    '--spacing-80': spacing[80],
    '--spacing-96': spacing[96],
    '--spacing-128': spacing[128],
  };
}

/**
 * Generate border radius CSS variables
 */
function generateBorderRadiusVariables(radius: ThemeBorderRadius): Record<string, string> {
  return {
    '--radius-none': radius.none,
    '--radius-sm': radius.sm,
    '--radius': radius.DEFAULT,
    '--radius-md': radius.md,
    '--radius-lg': radius.lg,
    '--radius-xl': radius.xl,
    '--radius-2xl': radius['2xl'],
    '--radius-3xl': radius['3xl'],
    '--radius-full': radius.full,
  };
}

/**
 * Generate shadow CSS variables
 */
function generateShadowVariables(shadows: ThemeShadows): Record<string, string> {
  return {
    '--shadow-none': shadows.none,
    '--shadow-sm': shadows.sm,
    '--shadow': shadows.base,
    '--shadow-md': shadows.md,
    '--shadow-lg': shadows.lg,
    '--shadow-xl': shadows.xl,
    '--shadow-2xl': shadows['2xl'],
    '--shadow-inner': shadows.inner,
    '--shadow-inner-md': shadows.innerMd,
  };
}

/**
 * Apply CSS variables to the document root
 */
export function applyCSSVariables(theme: Theme): () => void {
  const root = document.documentElement;
  const vars = generateCSSVariables(theme);
  
  // Store original values for cleanup
  const originalValues: Record<string, string | null> = {};
;
  
  // Apply each variable
  Object.entries(vars).forEach(([key, value]) => {
    originalValues[key] = root.style.getPropertyValue(key) || null;
    root.style.setProperty(key, value);
  });
  
  // Apply background style class
  document.body.className = `theme-${theme.backgroundStyle}`;
  
  // Return cleanup function
  return () => {
    Object.keys(vars).forEach((key) => {
      if (originalValues[key] === null) {
        root.style.removeProperty(key);
      } else if (originalValues[key] !== undefined) {
        root.style.setProperty(key, originalValues[key]!);
      }
    });
    document.body.className = '';
  };
}

/**
 * Generate CSS string (for SSR/Server-side rendering)
 */
export function generateCSSString(theme: Theme): string {
  const vars = generateCSSVariables(theme);
  const lines = Object.entries(vars).map(([key, value]) => `  ${key}: ${value};`);
  return `:root {\n${lines.join('\n')}\n}`;
}
