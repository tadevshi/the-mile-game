import { describe, it, expect } from 'vitest'
import { generateCSSVariables, applyCSSVariables, generateCSSString } from '../cssVariables'
import { createTheme } from '../themeFactory'
import type { ThemeData } from '../../types'

describe('cssVariables', () => {
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
  // generateCSSVariables
  // ============================================
  describe('generateCSSVariables', () => {
    it('generates all primary color variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--color-primary']).toBe('#D22E7F')
      expect(vars['--color-primary-light']).toBeDefined()
      expect(vars['--color-primary-dark']).toBeDefined()
      expect(vars['--color-on-primary']).toBeDefined()
    })

    it('generates all secondary color variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--color-secondary']).toBe('#FBCFE8')
      expect(vars['--color-secondary-light']).toBeDefined()
      expect(vars['--color-secondary-dark']).toBeDefined()
      expect(vars['--color-on-secondary']).toBeDefined()
    })

    it('generates all accent color variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--color-accent']).toBe('#B0236A')
      expect(vars['--color-accent-light']).toBeDefined()
      expect(vars['--color-accent-dark']).toBeDefined()
      expect(vars['--color-on-accent']).toBeDefined()
    })

    it('generates background and surface variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--color-background']).toBe('#FFF5F7')
      expect(vars['--color-background-alt']).toBeDefined()
      expect(vars['--color-surface']).toBeDefined()
      expect(vars['--color-surface-elevated']).toBeDefined()
    })

    it('generates text color variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--color-on-background']).toBe('#1E293B')
      expect(vars['--color-on-surface']).toBeDefined()
      expect(vars['--color-on-surface-muted']).toBeDefined()
    })

    it('generates semantic color variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--color-success']).toBe('#10B981')
      expect(vars['--color-warning']).toBe('#F59E0B')
      expect(vars['--color-error']).toBe('#EF4444')
      expect(vars['--color-info']).toBe('#3B82F6')
    })

    it('generates border and divider variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--color-border']).toBeDefined()
      expect(vars['--color-border-light']).toBeDefined()
      expect(vars['--color-divider']).toBeDefined()
    })

    it('generates overlay variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--color-overlay']).toBe('rgba(0, 0, 0, 0.5)')
      expect(vars['--color-overlay-light']).toBe('rgba(0, 0, 0, 0.1)')
    })

    it('generates typography variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--font-display']).toBe('Great Vibes')
      expect(vars['--font-heading']).toBe('Playfair Display')
      expect(vars['--font-body']).toBe('Montserrat')
      expect(vars['--font-mono']).toBe('JetBrains Mono, monospace')
    })

    it('generates font size variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--font-size-xs']).toBe('0.75rem')
      expect(vars['--font-size-sm']).toBe('0.875rem')
      expect(vars['--font-size-base']).toBe('1rem')
      expect(vars['--font-size-lg']).toBe('1.125rem')
      expect(vars['--font-size-2xl']).toBe('1.5rem')
    })

    it('generates line height variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--line-height-none']).toBe('1')
      expect(vars['--line-height-tight']).toBe('1.25')
      expect(vars['--line-height-normal']).toBe('1.5')
    })

    it('generates font weight variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--font-weight-light']).toBe('300')
      expect(vars['--font-weight-normal']).toBe('400')
      expect(vars['--font-weight-bold']).toBe('700')
    })

    it('generates spacing variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--spacing-unit']).toBe('4')
      expect(vars['--spacing-0']).toBe('0')
      expect(vars['--spacing-1']).toBe('0.25rem')
      expect(vars['--spacing-4']).toBe('1rem')
      expect(vars['--spacing-8']).toBe('2rem')
    })

    it('generates border radius variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--radius-none']).toBe('0')
      expect(vars['--radius-sm']).toBe('0.125rem')
      expect(vars['--radius-md']).toBe('0.375rem')
      expect(vars['--radius-lg']).toBe('0.5rem')
      expect(vars['--radius-full']).toBe('9999px')
    })

    it('generates shadow variables', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--shadow-none']).toBe('none')
      expect(vars['--shadow-sm']).toBeDefined()
      expect(vars['--shadow-md']).toBeDefined()
      expect(vars['--shadow-lg']).toBeDefined()
    })

    it('generates background style variable', () => {
      const vars = generateCSSVariables(theme)
      expect(vars['--theme-background-style']).toBe('watercolor')
    })

    it('generates Tailwind-compatible shortcuts', () => {
      const vars = generateCSSVariables(theme)
      
      expect(vars['--tw-primary']).toBe('#D22E7F')
      expect(vars['--tw-secondary']).toBe('#FBCFE8')
      expect(vars['--tw-accent']).toBe('#B0236A')
      expect(vars['--tw-bg']).toBe('#FFF5F7')
      expect(vars['--tw-text']).toBe('#1E293B')
    })

    it('returns an object with all expected keys', () => {
      const vars = generateCSSVariables(theme)
      const keys = Object.keys(vars)
      
      // Should have 50+ CSS variables
      expect(keys.length).toBeGreaterThan(50)
      
      // All keys should start with --
      keys.forEach(key => {
        expect(key.startsWith('--')).toBe(true)
      })
    })
  })

  // ============================================
  // generateCSSString
  // ============================================
  describe('generateCSSString', () => {
    it('generates valid CSS string for :root', () => {
      const css = generateCSSString(theme)
      
      expect(css.startsWith(':root {')).toBe(true)
      expect(css.endsWith('}')).toBe(true)
    })

    it('includes all CSS variables in the string', () => {
      const css = generateCSSString(theme)
      
      expect(css).toContain('--color-primary: #D22E7F;')
      expect(css).toContain('--font-display: Great Vibes;')
      expect(css).toContain('--spacing-4: 1rem;')
      expect(css).toContain('--radius-md: 0.375rem;')
    })

    it('formats each variable on its own line', () => {
      const css = generateCSSString(theme)
      const lines = css.split('\n')
      
      // Should have multiple lines
      expect(lines.length).toBeGreaterThan(10)
    })
  })

  // ============================================
  // applyCSSVariables
  // ============================================
  describe('applyCSSVariables', () => {
    it('applies CSS variables to document root', () => {
      const cleanup = applyCSSVariables(theme)
      
      const root = document.documentElement
      expect(root.style.getPropertyValue('--color-primary')).toBe('#D22E7F')
      expect(root.style.getPropertyValue('--spacing-4')).toBe('1rem')
      
      // Cleanup
      cleanup()
    })

    it('applies background style class to body', () => {
      const cleanup = applyCSSVariables(theme)
      
      expect(document.body.className).toBe('theme-watercolor')
      
      cleanup()
    })

    it('returns cleanup function that removes variables', () => {
      const cleanup = applyCSSVariables(theme)
      
      // Variables are applied
      expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#D22E7F')
      
      // Cleanup
      cleanup()
      
      // Variables are removed
      expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('')
      expect(document.body.className).toBe('')
    })

    it('can be called multiple times safely', () => {
      const cleanup1 = applyCSSVariables(theme)
      const cleanup2 = applyCSSVariables(theme)
      
      // Both cleanups should work
      cleanup1()
      cleanup2()
      
      // Should not throw
    })
  })
})
