/**
 * Theme Presets Index
 * Export all theme presets from a single entry point
 */

export { etherealGala } from './ethereal-gala';
export { autumnalVows } from './autumnal-vows';
export { kidsCarnival } from './kids-carnival';
export { monolithEditorial } from './monolith-editorial';
export { nocturneElegance } from './nocturne-elegance';
export { executiveSuite } from './executive-suite';

export type { ThemePreset } from '../types';

// All presets as an array for easy iteration
import { etherealGala } from './ethereal-gala';
import { autumnalVows } from './autumnal-vows';
import { kidsCarnival } from './kids-carnival';
import { monolithEditorial } from './monolith-editorial';
import { nocturneElegance } from './nocturne-elegance';
import { executiveSuite } from './executive-suite';
import type { ThemePreset } from '../types';

export const ALL_PRESETS: ThemePreset[] = [
  etherealGala,
  autumnalVows,
  kidsCarnival,
  monolithEditorial,
  nocturneElegance,
  executiveSuite,
];

/**
 * Get a preset by its ID
 */
export function getPresetById(id: string): ThemePreset | undefined {
  return ALL_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get a preset by its name (slug)
 */
export function getPresetByName(name: string): ThemePreset | undefined {
  return ALL_PRESETS.find((preset) => preset.name === name);
}

/**
 * Get the default preset (first in the list)
 */
export function getDefaultPreset(): ThemePreset {
  return ALL_PRESETS[0];
}
