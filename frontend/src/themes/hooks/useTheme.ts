/**
 * useTheme Hook
 * Access and manipulate the current theme in components
 */

import { useCallback, useMemo } from 'react';
import { useTheme as useThemeContext } from '../ThemeProvider';
import { applyCSSVariables, generateCSSVariables } from '../utils/cssVariables';
import type { Theme, LegacyTheme } from '../types';
import { legacyToTheme } from '../types';

/**
 * Extended theme hook with additional utilities
 */
export function useTheme() {
  const context = useThemeContext();
  
  /**
   * Convert legacy theme format to new Theme object
   */
  const convertLegacyTheme = useCallback((legacy: LegacyTheme): Theme => {
    return legacyToTheme(legacy);
  }, []);
  
  /**
   * Generate CSS variables for current theme
   */
  const cssVariables = useMemo(() => {
    const legacyTheme: LegacyTheme = {
      primaryColor: context.theme.primaryColor,
      secondaryColor: context.theme.secondaryColor,
      accentColor: context.theme.accentColor,
      bgColor: context.theme.bgColor,
      textColor: context.theme.textColor,
      displayFont: context.theme.displayFont,
      headingFont: context.theme.headingFont,
      bodyFont: context.theme.bodyFont,
      backgroundStyle: context.theme.backgroundStyle,
    };
    const theme = legacyToTheme(legacyTheme);
    return generateCSSVariables(theme);
  }, [
    context.theme.primaryColor,
    context.theme.secondaryColor,
    context.theme.accentColor,
    context.theme.bgColor,
    context.theme.textColor,
    context.theme.displayFont,
    context.theme.headingFont,
    context.theme.bodyFont,
    context.theme.backgroundStyle,
  ]);
  
  /**
   * Apply theme CSS variables to document
   */
  const applyTheme = useCallback(() => {
    const legacyTheme: LegacyTheme = {
      primaryColor: context.theme.primaryColor,
      secondaryColor: context.theme.secondaryColor,
      accentColor: context.theme.accentColor,
      bgColor: context.theme.bgColor,
      textColor: context.theme.textColor,
      displayFont: context.theme.displayFont,
      headingFont: context.theme.headingFont,
      bodyFont: context.theme.bodyFont,
      backgroundStyle: context.theme.backgroundStyle,
    };
    const theme = legacyToTheme(legacyTheme);
    return applyCSSVariables(theme);
  }, [context.theme]);
  
  /**
   * Check if a color meets WCAG contrast requirements
   */
  const getContrastRatio = useCallback((color1: string, color2: string): number => {
    const getLuminance = (hex: string): number => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = (num >> 16) / 255;
      const g = ((num >> 8) & 0xff) / 255;
      const b = (num & 0xff) / 255;
      
      const toLinear = (c: number) => 
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }, []);
  
  /**
   * Check if current primary color meets AA standards for text
   */
  const isPrimaryAccessible = useCallback((): boolean => {
    const ratio = getContrastRatio(context.theme.primaryColor, '#FFFFFF');
    return ratio >= 4.5;
  }, [context.theme.primaryColor, getContrastRatio]);
  
  return {
    ...context,
    convertLegacyTheme,
    cssVariables,
    applyTheme,
    getContrastRatio,
    isPrimaryAccessible,
  };
}

/**
 * Hook to get theme color as CSS variable
 */
export function useThemeColor(colorPath: string): string {
  const context = useThemeContext();
  
  // Map common color paths to theme properties
  const colorMap: Record<string, string> = {
    'primary': context.theme.primaryColor,
    'secondary': context.theme.secondaryColor,
    'accent': context.theme.accentColor,
    'background': context.theme.bgColor,
    'text': context.theme.textColor,
  };
  
  return colorMap[colorPath] || '';
}

/**
 * Hook to get theme font
 */
export function useThemeFont(fontType: 'display' | 'heading' | 'body'): string {
  const context = useThemeContext();
  
  const fontMap = {
    'display': context.theme.displayFont,
    'heading': context.theme.headingFont,
    'body': context.theme.bodyFont,
  };
  
  return fontMap[fontType] || 'sans-serif';
}
