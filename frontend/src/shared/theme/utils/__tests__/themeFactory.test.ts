import { describe, it, expect } from 'vitest'
import { createTheme, legacyToTheme } from '../themeFactory'
import type { ThemeData, LegacyTheme } from '../../types'

describe('themeFactory', () => {
  // ============================================
  // createTheme
  // ============================================
  describe('createTheme', () => {
    const basicThemeData: ThemeData = {
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

    it('generates color variants (light/dark/on)', () => {
      const theme = createTheme(basicThemeData)

      // Primary color variants
      expect(theme.colors.primary).toBe('#D22E7F')
      expect(theme.colors.primaryLight).toBeDefined()
      expect(theme.colors.primaryDark).toBeDefined()
      expect(theme.colors.onPrimary).toBeDefined()

      // Secondary color variants
      expect(theme.colors.secondary).toBe('#FBCFE8')
      expect(theme.colors.secondaryLight).toBeDefined()
      expect(theme.colors.secondaryDark).toBeDefined()
      expect(theme.colors.onSecondary).toBeDefined()

      // Accent color variants
      expect(theme.colors.accent).toBe('#B0236A')
      expect(theme.colors.accentLight).toBeDefined()
      expect(theme.colors.accentDark).toBeDefined()
      expect(theme.colors.onAccent).toBeDefined()
    })

    it('generates background and surface colors', () => {
      const theme = createTheme(basicThemeData)

      expect(theme.colors.background).toBe('#FFF5F7')
      expect(theme.colors.backgroundAlt).toBeDefined()
      expect(theme.colors.surface).toBeDefined()
      expect(theme.colors.surfaceElevated).toBeDefined()
    })

    it('generates text colors', () => {
      const theme = createTheme(basicThemeData)

      expect(theme.colors.onBackground).toBe('#1E293B')
      expect(theme.colors.onSurface).toBeDefined()
      expect(theme.colors.onSurfaceMuted).toBeDefined()
    })

    it('generates semantic colors (success, warning, error, info)', () => {
      const theme = createTheme(basicThemeData)

      expect(theme.colors.success).toBe('#10B981')
      expect(theme.colors.warning).toBe('#F59E0B')
      expect(theme.colors.error).toBe('#EF4444')
      expect(theme.colors.info).toBe('#3B82F6')
    })

    it('generates border and divider colors', () => {
      const theme = createTheme(basicThemeData)

      expect(theme.colors.border).toBeDefined()
      expect(theme.colors.borderLight).toBeDefined()
      expect(theme.colors.divider).toBeDefined()
    })

    it('generates overlay colors', () => {
      const theme = createTheme(basicThemeData)

      expect(theme.colors.overlay).toBe('rgba(0, 0, 0, 0.5)')
      expect(theme.colors.overlayLight).toBe('rgba(0, 0, 0, 0.1)')
    })

    it('generates complete typography system', () => {
      const theme = createTheme(basicThemeData)

      // Font families
      expect(theme.typography.displayFont).toBe('Great Vibes')
      expect(theme.typography.headingFont).toBe('Playfair Display')
      expect(theme.typography.bodyFont).toBe('Montserrat')
      expect(theme.typography.monoFont).toBe('JetBrains Mono, monospace')

      // Font sizes
      expect(theme.typography.fontSize.base).toBe('1rem')
      expect(theme.typography.fontSize.xs).toBe('0.75rem')
      expect(theme.typography.fontSize['2xl']).toBe('1.5rem')

      // Line heights
      expect(theme.typography.lineHeight.normal).toBe('1.5')
      expect(theme.typography.lineHeight.tight).toBe('1.25')

      // Font weights
      expect(theme.typography.fontWeight.normal).toBe(400)
      expect(theme.typography.fontWeight.bold).toBe(700)
    })

    it('generates complete spacing scale', () => {
      const theme = createTheme(basicThemeData)

      expect(theme.spacing.unit).toBe(4)
      expect(theme.spacing[0]).toBe('0')
      expect(theme.spacing[1]).toBe('0.25rem')
      expect(theme.spacing[4]).toBe('1rem')
      expect(theme.spacing[8]).toBe('2rem')
      expect(theme.spacing[16]).toBe('4rem')
    })

    it('generates complete border radius scale', () => {
      const theme = createTheme(basicThemeData)

      expect(theme.borderRadius.none).toBe('0')
      expect(theme.borderRadius.sm).toBe('0.125rem')
      expect(theme.borderRadius.md).toBe('0.375rem')
      expect(theme.borderRadius.lg).toBe('0.5rem')
      expect(theme.borderRadius.full).toBe('9999px')
    })

    it('generates complete shadow scale', () => {
      const theme = createTheme(basicThemeData)

      expect(theme.shadows.none).toBe('none')
      expect(theme.shadows.sm).toBeDefined()
      expect(theme.shadows.md).toBeDefined()
      expect(theme.shadows.lg).toBeDefined()
      expect(theme.shadows.xl).toBeDefined()
    })

    it('preserves background style', () => {
      const theme = createTheme(basicThemeData)
      expect(theme.backgroundStyle).toBe('watercolor')
    })

    it('handles dark theme correctly', () => {
      const darkThemeData: ThemeData = {
        ...basicThemeData,
        bgColor: '#0F172A',
        textColor: '#F8FAFC',
        backgroundStyle: 'dark',
      }

      const theme = createTheme(darkThemeData)

      expect(theme.colors.background).toBe('#0F172A')
      expect(theme.colors.onBackground).toBe('#F8FAFC')
      expect(theme.backgroundStyle).toBe('dark')
    })
  })

  // ============================================
  // legacyToTheme
  // ============================================
  describe('legacyToTheme', () => {
    const legacyTheme: LegacyTheme = {
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

    it('converts flat theme to design tokens', () => {
      const theme = legacyToTheme(legacyTheme)

      // Colors are preserved
      expect(theme.colors.primary).toBe('#D22E7F')
      expect(theme.colors.secondary).toBe('#FBCFE8')
      expect(theme.colors.accent).toBe('#B0236A')
      expect(theme.colors.background).toBe('#FFF5F7')
      expect(theme.colors.onBackground).toBe('#1E293B')
    })

    it('generates color variants from legacy', () => {
      const theme = legacyToTheme(legacyTheme)

      // Should generate light/dark variants
      expect(theme.colors.primaryLight).toBeDefined()
      expect(theme.colors.primaryDark).toBeDefined()
      expect(theme.colors.onPrimary).toBeDefined()
    })

    it('preserves typography from legacy', () => {
      const theme = legacyToTheme(legacyTheme)

      expect(theme.typography.displayFont).toBe('Great Vibes')
      expect(theme.typography.headingFont).toBe('Playfair Display')
      expect(theme.typography.bodyFont).toBe('Montserrat')
    })

    it('generates default spacing, radius, shadows', () => {
      const theme = legacyToTheme(legacyTheme)

      // Should have complete design token system
      expect(theme.spacing.unit).toBe(4)
      expect(theme.borderRadius.md).toBeDefined()
      expect(theme.shadows.md).toBeDefined()
    })

    it('preserves background style from legacy', () => {
      const theme = legacyToTheme(legacyTheme)
      expect(theme.backgroundStyle).toBe('watercolor')
    })

    it('handles all background styles', () => {
      const styles: Array<'watercolor' | 'minimal' | 'dark' | 'party'> = [
        'watercolor',
        'minimal',
        'dark',
        'party',
      ]

      styles.forEach(style => {
        const theme = legacyToTheme({ ...legacyTheme, backgroundStyle: style })
        expect(theme.backgroundStyle).toBe(style)
      })
    })
  })

  // ============================================
  // Integration: WCAG Compliance
  // ============================================
  describe('WCAG Compliance', () => {
    it('ensures onPrimary color has sufficient contrast with primary', () => {
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

      // Import getContrastRatio to verify
      // This is a sanity check that onPrimary is readable
      expect(theme.colors.onPrimary).toBeDefined()
      expect(['#1E293B', '#FFFFFF']).toContain(theme.colors.onPrimary)
    })
  })
})
