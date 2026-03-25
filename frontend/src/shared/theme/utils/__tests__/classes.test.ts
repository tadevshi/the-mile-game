import { describe, it, expect } from 'vitest'
import { getThemedClasses, getThemedStyles, useThemeClasses } from '../classes'
import { createTheme } from '../themeFactory'
import type { ThemeData } from '../../types'

describe('classes', () => {
  const themeData: ThemeData = {
    primaryColor: '#D22E7F',
    secondaryColor: '#FBCFE8',
    accentColor: '#B0236A',
    bgColor: '#FFF5F7',
    textColor: '#1E293B',
    displayFont: 'Great Vibes',
    headingFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    backgroundStyle: 'watercolor',
  }
  
  const theme = createTheme(themeData)

  // ============================================
  // getThemedClasses
  // ============================================
  describe('getThemedClasses', () => {
    it('returns button classes with CSS variables', () => {
      const classes = getThemedClasses(theme)
      
      expect(classes.button.primary).toContain('bg-[var(--color-primary)]')
      expect(classes.button.primary).toContain('text-[var(--color-on-primary)]')
      expect(classes.button.secondary).toContain('bg-[var(--color-secondary)]')
      expect(classes.button.outline).toContain('border-[var(--color-primary)]')
    })

    it('returns card classes with CSS variables', () => {
      const classes = getThemedClasses(theme)
      
      expect(classes.card.base).toContain('bg-[var(--color-surface)]')
      expect(classes.card.elevated).toContain('shadow-[var(--shadow-md)]')
      expect(classes.card.rounded).toContain('rounded-[var(--radius-lg)]')
    })

    it('returns input classes with CSS variables', () => {
      const classes = getThemedClasses(theme)
      
      expect(classes.input.base).toContain('border-[var(--color-border)]')
      expect(classes.input.focus).toContain('border-[var(--color-primary)]')
    })

    it('returns badge classes with CSS variables', () => {
      const classes = getThemedClasses(theme)
      
      expect(classes.badge.primary).toContain('bg-[var(--color-primary)]')
      expect(classes.badge.secondary).toContain('bg-[var(--color-secondary)]')
    })

    it('returns text classes with CSS variables', () => {
      const classes = getThemedClasses(theme)
      
      expect(classes.text.primary).toContain('text-[var(--color-primary)]')
      expect(classes.text.secondary).toContain('text-[var(--color-secondary') // includes -dark variant
      expect(classes.text.muted).toContain('text-[var(--color-on-surface-muted)]')
    })

    it('returns background classes with CSS variables', () => {
      const classes = getThemedClasses(theme)
      
      expect(classes.background.primary).toContain('bg-[var(--color-primary)]')
      expect(classes.background.secondary).toContain('bg-[var(--color-secondary)]')
      expect(classes.background.surface).toContain('bg-[var(--color-surface)]')
    })

    it('returns spacing classes with CSS variables', () => {
      const classes = getThemedClasses(theme)
      
      expect(classes.spacing.p4).toContain('p-[var(--spacing-4)]')
      expect(classes.spacing.px4).toContain('px-[var(--spacing-4)]')
      expect(classes.spacing.gap4).toContain('gap-[var(--spacing-4)]')
    })

    it('returns gradient classes with CSS variables', () => {
      const classes = getThemedClasses(theme)
      
      expect(classes.gradient.primary).toContain('from-[var(--color-primary)]')
      expect(classes.gradient.primary).toContain('to-[var(--color-accent)]')
    })
  })

  // ============================================
  // getThemedStyles
  // ============================================
  describe('getThemedStyles', () => {
    it('returns button styles object', () => {
      const styles = getThemedStyles(theme)
      
      expect(styles.button.primary.backgroundColor).toBe('var(--color-primary)')
      expect(styles.button.primary.color).toBe('var(--color-on-primary)')
    })

    it('returns card styles object', () => {
      const styles = getThemedStyles(theme)
      
      expect(styles.card.base.backgroundColor).toBe('var(--color-surface)')
      expect(styles.card.elevated.boxShadow).toBe('var(--shadow-md)')
    })

    it('returns text styles object', () => {
      const styles = getThemedStyles(theme)
      
      expect(styles.text.primary.color).toBe('var(--color-primary)')
      expect(styles.text.font.fontFamily).toBe('var(--font-body)')
    })
  })

  // ============================================
  // useThemeClasses
  // ============================================
  describe('useThemeClasses', () => {
    it('returns classes for use in components', () => {
      const { button, card, input, badge, text, background, spacing, gradient } = useThemeClasses(theme)
      
      expect(button).toBeDefined()
      expect(card).toBeDefined()
      expect(input).toBeDefined()
      expect(badge).toBeDefined()
      expect(text).toBeDefined()
      expect(background).toBeDefined()
      expect(spacing).toBeDefined()
      expect(gradient).toBeDefined()
    })
  })

  // ============================================
  // Integration: Class composition
  // ============================================
  describe('Class composition', () => {
    it('composes multiple classes correctly', () => {
      const classes = getThemedClasses(theme)
      
      const buttonClasses = `${classes.button.primary} ${classes.button.rounded}`
      expect(buttonClasses).toContain('bg-[var(--color-primary)]')
      expect(buttonClasses).toContain('rounded-[var(--radius-lg)]')
    })

    it('works with Tailwind arbitrary values', () => {
      const classes = getThemedClasses(theme)
      
      // These should be valid Tailwind arbitrary values
      expect(classes.button.primary).toMatch(/bg-\[var\(--[a-z-]+\)\]/)
      expect(classes.text.primary).toMatch(/text-\[var\(--[a-z-]+\)\]/)
    })
  })
})