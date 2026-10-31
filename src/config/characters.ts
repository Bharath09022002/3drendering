// src/config/characters.ts
import { PALETTE } from './palette';

export interface CharacterRoleConfig {
  role: 'pharmacist' | 'rider' | 'customer';
  modelPath: string;
  defaultClip: string;
  walkClip: string;
  paletteOverrides: {
    shirt: string;
    trousers: string;
    hair: string;
    skin: string;
    hasLabCoat?: boolean;
    hasHelmet?: boolean;
    coat?: string;
  };
}

/**
 * Character asset mapping configuration.
 * Maps logical roles to GLB model files and palette-driven material overrides.
 * Reuses single humanoid model file with distinct role-specific outfit colors.
 */
const isLegacy = typeof window !== 'undefined' && window.location.search.includes('legacy=1');
const DEFAULT_MODEL = isLegacy ? '/assets/glb/character.glb' : '/assets/glb/human.glb';

export const CHARACTER_CONFIGS: Record<string, CharacterRoleConfig> = {
  pharmacist: {
    role: 'pharmacist',
    modelPath: DEFAULT_MODEL,
    defaultClip: 'idle',
    walkClip: 'walk',
    paletteOverrides: {
      shirt: '#FFFFFF',
      trousers: '#1E293B',
      hair: '#2D1B12',
      skin: '#F5D0B5',
      hasLabCoat: true,
      coat: '#F8FAFC',
    },
  },
  rider: {
    role: 'rider',
    modelPath: DEFAULT_MODEL,
    defaultClip: 'idle',
    walkClip: 'walk',
    paletteOverrides: {
      shirt: PALETTE.accent, // Coral delivery jacket
      trousers: '#1E293B',
      hair: '#1E293B',
      skin: '#E8B595',
      hasHelmet: true,
      coat: PALETTE.accent,
    },
  },
  customer: {
    role: 'customer',
    modelPath: DEFAULT_MODEL,
    defaultClip: 'idle',
    walkClip: 'walk',
    paletteOverrides: {
      shirt: '#2563EB', // Sapphire blue knit sweater
      trousers: '#334155', // Charcoal trousers
      hair: '#1F1A18',
      skin: '#EDC5A5',
      coat: '#2563EB',
    },
  },
};

