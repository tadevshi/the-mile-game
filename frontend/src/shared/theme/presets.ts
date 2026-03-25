/**
 * Theme Presets - Single source of truth for all theme presets
 * Used by both the Admin Panel (ThemeTab) and the Wizard (Step3_Theme)
 * 
 * IMPORTANT: The gradient classes below are for PREVIEW ONLY (button visuals).
 * The actual theme colors used at runtime come from the backend via /api/themes/presets
 */

export interface ThemePresetData {
  name: string;
  label: string;
  // Actual theme colors (from backend)
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  displayFont: string;
  headingFont: string;
  bodyFont: string;
  backgroundStyle: 'watercolor' | 'minimal' | 'dark' | 'party';
  // Preview gradient for UI buttons (Tailwind classes)
  gradientFrom: string;
  gradientTo: string;
}

export const THEME_PRESETS: ThemePresetData[] = [
  {
    name: 'princess',
    label: 'Princess',
    primaryColor: '#D22E7F', // WCAG AA compliant (4.73:1 with white)
    secondaryColor: '#FBCFE8',
    accentColor: '#B0236A', // Darkened to match
    bgColor: '#FFF5F7',
    textColor: '#1E293B',
    displayFont: 'Great Vibes',
    headingFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    backgroundStyle: 'watercolor',
    gradientFrom: 'from-pink-400',
    gradientTo: 'to-rose-500',
  },
  {
    name: 'elegant',
    label: 'Elegant',
    primaryColor: '#7E4FE9', // WCAG AA compliant (5.02:1 with white)
    secondaryColor: '#DDD6FE',
    accentColor: '#6D28D9',
    bgColor: '#F5F3FF',
    textColor: '#1E293B',
    displayFont: 'Playfair Display',
    headingFont: 'Cinzel',
    bodyFont: 'Lato',
    backgroundStyle: 'minimal',
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-violet-500',
  },
  {
    name: 'party',
    label: 'Party',
    primaryColor: '#F59E0B', // WCAG AA compliant (6.81:1 with dark)
    secondaryColor: '#FDE68A',
    accentColor: '#D97706',
    bgColor: '#FFFBEB',
    textColor: '#1E293B',
    displayFont: 'Fredoka One',
    headingFont: 'Nunito',
    bodyFont: 'Open Sans',
    backgroundStyle: 'party',
    gradientFrom: 'from-yellow-400',
    gradientTo: 'to-amber-500',
  },
  {
    name: 'dark',
    label: 'Dark',
    primaryColor: '#06B6D4', // WCAG AA compliant (6.03:1 with dark)
    secondaryColor: '#67E8F9',
    accentColor: '#0891B2',
    bgColor: '#0F172A',
    textColor: '#F8FAFC',
    displayFont: 'Inter',
    headingFont: 'Roboto',
    bodyFont: 'Inter',
    backgroundStyle: 'dark',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-slate-700',
  },
  {
    name: 'corporate',
    label: 'Corporate',
    primaryColor: '#2168DC', // WCAG AA compliant (5.15:1 with white)
    secondaryColor: '#BFDBFE',
    accentColor: '#1E5AB8', // Darkened to match
    bgColor: '#EFF6FF',
    textColor: '#1E293B',
    displayFont: 'Montserrat',
    headingFont: 'Raleway',
    bodyFont: 'Source Sans Pro',
    backgroundStyle: 'minimal',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-600',
  },
  {
    name: 'kids',
    label: 'Kids',
    primaryColor: '#10B981', // WCAG AA compliant (5.77:1 with dark)
    secondaryColor: '#A7F3D0',
    accentColor: '#059669',
    bgColor: '#ECFDF5',
    textColor: '#1E293B',
    displayFont: 'Bubblegum Sans',
    headingFont: 'Comic Neue',
    bodyFont: 'Nunito',
    backgroundStyle: 'party',
    gradientFrom: 'from-green-400',
    gradientTo: 'to-emerald-500',
  },
  // ============================================
  // Phase 2: New Presets (Tareas 5-7)
  // ============================================

  /**
   * Task 5: Ethereal Gala
   * "The Digital Gala" - Sophisticated rose and blush tones
   * Design: intentional asymmetry, tonal depth, glassmorphism
   */
  {
    name: 'ethereal-gala',
    label: 'Ethereal Gala',
    primaryColor: '#b70049',
    secondaryColor: '#ff7290',
    accentColor: '#48223a',
    bgColor: '#fff4f7',
    textColor: '#48223a',
    displayFont: 'Great Vibes',
    headingFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    backgroundStyle: 'watercolor',
    gradientFrom: 'from-pink-600',
    gradientTo: 'to-rose-400',
  },

  /**
   * Task 6: Autumnal Vows
   * "The Tactile Keepsake" - Earth tones: terracotta & sage
   * Design: organic asymmetry, editorial warmth
   */
  {
    name: 'autumnal-vows',
    label: 'Autumnal Vows',
    primaryColor: '#813a29',
    secondaryColor: '#58624b',
    accentColor: '#9f513e',
    bgColor: '#fdf9f3',
    textColor: '#1c1c18',
    displayFont: 'Cormorant Garamond',
    headingFont: 'Noto Serif',
    bodyFont: 'Manrope',
    backgroundStyle: 'minimal',
    gradientFrom: 'from-amber-700',
    gradientTo: 'to-orange-600',
  },

  /**
   * Task 7: Kids Carnival
   * "The Kinetic Playground" - Gold, lime, sky blue
   * Design: high energy, whimsical, bouncy interactions
   */
  {
    name: 'kids-carnival',
    label: 'Kids Carnival',
    primaryColor: '#705d00',
    secondaryColor: '#cae6ff',
    accentColor: '#bb0054',
    bgColor: '#eeffdd',
    textColor: '#092100',
    displayFont: 'Fredoka One',
    headingFont: 'Baloo 2',
    bodyFont: 'Be Vietnam Pro',
    backgroundStyle: 'party',
    gradientFrom: 'from-yellow-600',
    gradientTo: 'to-lime-400',
  },

  /**
   * Task 9: Monolith Editorial
   * "The Silent Authority" - B&W Brutalist
   * Colores: black #09090B, grayscale
   * Tipografía: Inter (todo)
   * Border-radius: 0px (NONE)
   * Estilo brutalist/minimalista
   */
  {
    name: 'monolith-editorial',
    label: 'Monolith Editorial',
    primaryColor: '#FAFAFA',
    secondaryColor: '#A1A1AA',
    accentColor: '#71717A',
    bgColor: '#09090B',
    textColor: '#FAFAFA',
    displayFont: 'Inter',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    backgroundStyle: 'minimal',
    gradientFrom: 'from-zinc-800',
    gradientTo: 'to-zinc-950',
  },

  /**
   * Task 10: Nocturne Elegance
   * "The Midnight Curator" - Dark/Gold
   * Colores: dark #0C0A1D, gold #FACC15
   * Tipografía: Cinzel, Playfair Display, Crimson Pro
   * Dark mode por defecto
   * Glassmorphism dorado
   */
  {
    name: 'nocturne-elegance',
    label: 'Nocturne Elegance',
    primaryColor: '#FACC15',
    secondaryColor: '#FBBF24',
    accentColor: '#C084FC',
    bgColor: '#0C0A1D',
    textColor: '#FEF3C7',
    displayFont: 'Cinzel',
    headingFont: 'Playfair Display',
    bodyFont: 'Crimson Pro',
    backgroundStyle: 'dark',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-yellow-700',
  },

  /**
   * Task 11: Executive Suite
   * "The Digital Concierge" - Navy/Corporate
   * Colores: navy #1E3A8A, emerald accents
   * Tipografía: Raleway, Source Sans 3
   * Estilo corporate/profesional
   * Corner radius: 0.5rem default
   */
  {
    name: 'executive-suite',
    label: 'Executive Suite',
    primaryColor: '#1E3A8A',
    secondaryColor: '#0EA5E9',
    accentColor: '#6366F1',
    bgColor: '#F0F5FF',
    textColor: '#1E293B',
    displayFont: 'Montserrat',
    headingFont: 'Raleway',
    bodyFont: 'Source Sans 3',
    backgroundStyle: 'minimal',
    gradientFrom: 'from-blue-700',
    gradientTo: 'to-sky-500',
  },
];

/**
 * Get preset by name
 */
export function getPresetByName(name: string): ThemePresetData | undefined {
  return THEME_PRESETS.find(p => p.name === name);
}

/**
 * Get default preset (princess)
 */
export function getDefaultPreset(): ThemePresetData {
  return THEME_PRESETS[0];
}

/**
 * Task 8: Theme Presets Index
 * Export all presets as a keyed object for easy lookup
 */
export const themePresets: Record<string, ThemePresetData> = THEME_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.name] = preset;
    return acc;
  },
  {} as Record<string, ThemePresetData>
);
