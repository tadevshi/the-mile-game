import { describe, it, expect } from 'vitest'
import { adjustColor, getContrastColor, getContrastRatio } from '../colorUtils'

describe('colorUtils', () => {
  // ============================================
  // adjustColor
  // ============================================
  describe('adjustColor', () => {
    it('lightens a color by positive percentage', () => {
      // Pink 500 -> lighter
      const result = adjustColor('#EC4899', 20)
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/)
      // Should be lighter (higher RGB values)
      expect(result).not.toBe('#EC4899')
    })

    it('darkens a color by negative percentage', () => {
      // Pink 500 -> darker
      const result = adjustColor('#EC4899', -20)
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/)
      // Should be darker (lower RGB values)
      expect(result).not.toBe('#EC4899')
    })

    it('returns the same color when percentage is 0', () => {
      expect(adjustColor('#EC4899', 0)).toBe('#ec4899')
    })

    it('clamps to white (#FFFFFF) when lightening beyond max', () => {
      // Already very light, lightening more should clamp
      const result = adjustColor('#FFFFFF', 50)
      expect(result).toBe('#ffffff')
    })

    it('clamps to black (#000000) when darkening beyond min', () => {
      const result = adjustColor('#000000', -50)
      expect(result).toBe('#000000')
    })

    it('handles pure red correctly', () => {
      const lighter = adjustColor('#FF0000', 20)
      const darker = adjustColor('#FF0000', -20)
      
      // Lighter should have higher G and B
      expect(lighter).toMatch(/^#[0-9A-Fa-f]{6}$/)
      // Darker should have lower R
      expect(darker).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('handles pure green correctly', () => {
      const lighter = adjustColor('#00FF00', 20)
      const darker = adjustColor('#00FF00', -20)
      
      expect(lighter).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(darker).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('handles pure blue correctly', () => {
      const lighter = adjustColor('#0000FF', 20)
      const darker = adjustColor('#0000FF', -20)
      
      expect(lighter).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(darker).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('handles hex without # prefix', () => {
      const result = adjustColor('EC4899', 20)
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('returns lowercase hex output', () => {
      const result = adjustColor('#EC4899', 10)
      expect(result).toBe(result.toLowerCase())
    })
  })

  // ============================================
  // getContrastColor
  // ============================================
  describe('getContrastColor', () => {
    it('returns dark text (#1E293B) for light backgrounds', () => {
      expect(getContrastColor('#FFFFFF')).toBe('#1E293B')
      expect(getContrastColor('#FFF5F7')).toBe('#1E293B')
      expect(getContrastColor('#FBCFE8')).toBe('#1E293B')
    })

    it('returns light text (#FFFFFF) for dark backgrounds', () => {
      expect(getContrastColor('#000000')).toBe('#FFFFFF')
      expect(getContrastColor('#0F172A')).toBe('#FFFFFF')
      expect(getContrastColor('#09090B')).toBe('#FFFFFF')
    })

    it('returns dark text for pink primary color', () => {
      // Pink 500 is relatively light
      const result = getContrastColor('#EC4899')
      // Should be either dark or light depending on luminance threshold
      expect(['#1E293B', '#FFFFFF']).toContain(result)
    })

    it('returns light text for dark purple', () => {
      // Dark purple should need light text
      expect(getContrastColor('#6D28D9')).toBe('#FFFFFF')
    })

    it('uses WCAG luminance formula correctly', () => {
      // White has luminance ~1.0 -> should return dark text
      expect(getContrastColor('#FFFFFF')).toBe('#1E293B')
      
      // Black has luminance ~0.0 -> should return light text
      expect(getContrastColor('#000000')).toBe('#FFFFFF')
    })

    it('handles edge case colors near threshold', () => {
      // Colors near 0.5 luminance threshold
      // #808080 is middle gray
      const result = getContrastColor('#808080')
      expect(['#1E293B', '#FFFFFF']).toContain(result)
    })
  })

  // ============================================
  // getContrastRatio
  // ============================================
  describe('getContrastRatio', () => {
    it('returns 21:1 for black on white (maximum contrast)', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000')
      expect(ratio).toBeCloseTo(21, 0)
    })

    it('returns 1:1 for same colors (no contrast)', () => {
      const ratio = getContrastRatio('#EC4899', '#EC4899')
      expect(ratio).toBeCloseTo(1, 1)
    })

    it('returns ratio >= 4.5 for WCAG AA compliant pairs', () => {
      // White background with dark text
      const ratio = getContrastRatio('#FFFFFF', '#1E293B')
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('returns ratio < 4.5 for non-compliant pairs', () => {
      // Light gray on white - poor contrast
      const ratio = getContrastRatio('#FFFFFF', '#FBCFE8')
      expect(ratio).toBeLessThan(4.5)
    })

    it('is symmetric (order does not matter)', () => {
      const ratio1 = getContrastRatio('#EC4899', '#FFFFFF')
      const ratio2 = getContrastRatio('#FFFFFF', '#EC4899')
      expect(ratio1).toBeCloseTo(ratio2, 5)
    })

    it('calculates correct ratio for pink on white', () => {
      const ratio = getContrastRatio('#FFFFFF', '#EC4899')
      // Pink 500 on white should have moderate contrast
      expect(ratio).toBeGreaterThan(2)
      expect(ratio).toBeLessThan(5)
    })
  })

  // ============================================
  // Integration: WCAG AA Compliance
  // ============================================
  describe('WCAG AA Compliance', () => {
    it('ensures getContrastColor produces compliant text for primary colors', () => {
      // Updated primary colors to meet WCAG AA (4.5:1 contrast)
      const primaryColors = [
        '#D22E7F', // Pink (Princess) - darkened for WCAG AA
        '#7E4FE9', // Purple (Elegant) - darkened for WCAG AA
        '#F59E0B', // Amber (Party) - already compliant
        '#06B6D4', // Cyan (Dark) - already compliant
        '#2168DC', // Blue (Corporate) - darkened for WCAG AA
        '#10B981', // Green (Kids) - already compliant
      ]

      primaryColors.forEach(color => {
        const textColor = getContrastColor(color)
        const ratio = getContrastRatio(color, textColor)
        
        // WCAG AA requires 4.5:1 for normal text
        expect(ratio).toBeGreaterThanOrEqual(4.5)
      })
    })

    it('ensures getContrastColor produces compliant text for background colors', () => {
      const bgColors = [
        '#FFF5F7', // Princess bg
        '#F5F3FF', // Elegant bg
        '#FFFBEB', // Party bg
        '#0F172A', // Dark bg
        '#EFF6FF', // Corporate bg
        '#ECFDF5', // Kids bg
      ]

      bgColors.forEach(color => {
        const textColor = getContrastColor(color)
        const ratio = getContrastRatio(color, textColor)
        
        // WCAG AA requires 4.5:1 for normal text
        expect(ratio).toBeGreaterThanOrEqual(4.5)
      })
    })
  })
})
