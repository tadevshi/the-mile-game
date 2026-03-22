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
    primaryColor: '#EC4899',
    secondaryColor: '#FBCFE8',
    accentColor: '#DB2777',
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
    primaryColor: '#8B5CF6',
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
    primaryColor: '#F59E0B',
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
    primaryColor: '#06B6D4',
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
    primaryColor: '#3B82F6',
    secondaryColor: '#BFDBFE',
    accentColor: '#2563EB',
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
    primaryColor: '#10B981',
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
