/**
 * Themed CSS Classes Generator
 * 
 * Provides helper functions to generate Tailwind-compatible CSS classes
 * using CSS variables from the theme system.
 * 
 * This enables components to use theme colors without hardcoding values.
 * 
 * @example
 * const classes = getThemedClasses(theme)
 * <button className={classes.button.primary}>Click me</button>
 */

import type { Theme } from '../types'

/**
 * Themed button classes
 */
export interface ThemedButtonClasses {
  primary: string
  secondary: string
  outline: string
  ghost: string
  rounded: string
}

/**
 * Themed card classes
 */
export interface ThemedCardClasses {
  base: string
  elevated: string
  rounded: string
}

/**
 * Themed input classes
 */
export interface ThemedInputClasses {
  base: string
  focus: string
  error: string
}

/**
 * Themed badge classes
 */
export interface ThemedBadgeClasses {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
}

/**
 * Themed text classes
 */
export interface ThemedTextClasses {
  primary: string
  secondary: string
  accent: string
  muted: string
  onBackground: string
}

/**
 * Themed background classes
 */
export interface ThemedBackgroundClasses {
  primary: string
  secondary: string
  surface: string
  elevated: string
}

/**
 * Themed spacing classes
 */
export interface ThemedSpacingClasses {
  p0: string
  p1: string
  p2: string
  p4: string
  p6: string
  p8: string
  px4: string
  py4: string
  gap2: string
  gap4: string
  gap6: string
}

/**
 * Themed gradient classes
 */
export interface ThemedGradientClasses {
  primary: string
  secondary: string
  accent: string
}

/**
 * Complete themed classes object
 */
export interface ThemedClasses {
  button: ThemedButtonClasses
  card: ThemedCardClasses
  input: ThemedInputClasses
  badge: ThemedBadgeClasses
  text: ThemedTextClasses
  background: ThemedBackgroundClasses
  spacing: ThemedSpacingClasses
  gradient: ThemedGradientClasses
}

/**
 * Generate themed CSS classes for use in components
 * 
 * @param theme - Complete Theme object
 * @returns Object with themed class strings
 * 
 * @example
 * const classes = getThemedClasses(theme)
 * <button className={classes.button.primary}>Click me</button>
 */
export function getThemedClasses(_theme: Theme): ThemedClasses {
  return {
    button: {
      primary: 'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-dark)] transition-colors',
      secondary: 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)] hover:bg-[var(--color-secondary-dark)] transition-colors',
      outline: 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors',
      ghost: 'text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors',
      rounded: 'rounded-[var(--radius-lg)]',
    },
    
    card: {
      base: 'bg-[var(--color-surface)] text-[var(--color-on-surface)]',
      elevated: 'bg-[var(--color-surface-elevated)] shadow-[var(--shadow-md)]',
      rounded: 'rounded-[var(--radius-lg)]',
    },
    
    input: {
      base: 'border-b border-[var(--color-border)] focus:border-[var(--color-primary)] bg-transparent text-[var(--color-on-background)]',
      focus: 'border-[var(--color-primary)] outline-none ring-1 ring-[var(--color-primary)]',
      error: 'border-[var(--color-error)] focus:border-[var(--color-error)] ring-[var(--color-error)]',
    },
    
    badge: {
      primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
      secondary: 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary-dark)]',
      success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
      warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
      error: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
    },
    
    text: {
      primary: 'text-[var(--color-primary)]',
      secondary: 'text-[var(--color-secondary-dark)]',
      accent: 'text-[var(--color-accent)]',
      muted: 'text-[var(--color-on-surface-muted)]',
      onBackground: 'text-[var(--color-on-background)]',
    },
    
    background: {
      primary: 'bg-[var(--color-primary)]',
      secondary: 'bg-[var(--color-secondary)]',
      surface: 'bg-[var(--color-surface)]',
      elevated: 'bg-[var(--color-surface-elevated)]',
    },
    
    spacing: {
      p0: 'p-[var(--spacing-0)]',
      p1: 'p-[var(--spacing-1)]',
      p2: 'p-[var(--spacing-2)]',
      p4: 'p-[var(--spacing-4)]',
      p6: 'p-[var(--spacing-6)]',
      p8: 'p-[var(--spacing-8)]',
      px4: 'px-[var(--spacing-4)]',
      py4: 'py-[var(--spacing-4)]',
      gap2: 'gap-[var(--spacing-2)]',
      gap4: 'gap-[var(--spacing-4)]',
      gap6: 'gap-[var(--spacing-6)]',
    },
    
    gradient: {
      primary: 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]',
      secondary: 'bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)]',
      accent: 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)]',
    },
  }
}

/**
 * Themed styles object (for inline styles)
 */
export interface ThemedStyles {
  button: {
    primary: React.CSSProperties
    secondary: React.CSSProperties
  }
  card: {
    base: React.CSSProperties
    elevated: React.CSSProperties
  }
  text: {
    primary: React.CSSProperties
    font: React.CSSProperties
  }
}

/**
 * Generate themed inline styles for use in components
 * 
 * @param theme - Complete Theme object
 * @returns Object with themed style objects
 * 
 * @example
 * const styles = getThemedStyles(theme)
 * <button style={styles.button.primary}>Click me</button>
 */
export function getThemedStyles(_theme: Theme): ThemedStyles {
  return {
    button: {
      primary: {
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-on-primary)',
      },
      secondary: {
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-on-secondary)',
      },
    },
    
    card: {
      base: {
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-on-surface)',
        borderRadius: 'var(--radius-lg)',
      },
      elevated: {
        backgroundColor: 'var(--color-surface-elevated)',
        boxShadow: 'var(--shadow-md)',
      },
    },
    
    text: {
      primary: {
        color: 'var(--color-primary)',
      },
      font: {
        fontFamily: 'var(--font-body)',
      },
    },
  }
}

/**
 * Hook-like function to get themed classes
 * 
 * This is a convenience function that combines getThemedClasses
 * and getThemedStyles for easy use in components.
 * 
 * @param theme - Complete Theme object
 * @returns Object with both classes and styles
 * 
 * @example
 * const { button, card, text } = useThemeClasses(theme)
 * <button className={button.primary}>Click me</button>
 */
export function useThemeClasses(_theme: Theme): ThemedClasses {
  return getThemedClasses(_theme)
}

/**
 * Common themed class combinations for quick use
 */
export const themedClassNames = {
  /**
   * Primary button with rounded corners
   */
  buttonPrimary: 'bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-lg)] px-[var(--spacing-4)] py-[var(--spacing-2)] transition-colors hover:bg-[var(--color-primary-dark)]',
  
  /**
   * Secondary button with rounded corners
   */
  buttonSecondary: 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)] rounded-[var(--radius-lg)] px-[var(--spacing-4)] py-[var(--spacing-2)] transition-colors hover:bg-[var(--color-secondary-dark)]',
  
  /**
   * Card with elevation and rounded corners
   */
  card: 'bg-[var(--color-surface)] text-[var(--color-on-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] p-[var(--spacing-4)]',
  
  /**
   * Input with theme-aware border
   */
  input: 'border-b border-[var(--color-border)] bg-transparent text-[var(--color-on-background)] focus:border-[var(--color-primary)] outline-none py-[var(--spacing-2)]',
  
  /**
   * Primary text color
   */
  textPrimary: 'text-[var(--color-primary)]',
  
  /**
   * Muted text color
   */
  textMuted: 'text-[var(--color-on-surface-muted)]',
  
  /**
   * Primary gradient background
   */
  gradientPrimary: 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]',
}