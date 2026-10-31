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
export const CHARACTER_CONFIGS: Record<string, CharacterRoleConfig> = {
  pharmacist: {
    role: 'pharmacist',
    modelPath: '/assets/glb/character.glb',
    defaultClip: 'idle',
    walkClip: 'walk',
    paletteOverrides: {
      shirt: '#FFFFFF',
      trousers: '#334155',
      hair: '#3E2723',
      skin: '#E0AC69',
      hasLabCoat: true,
      coat: '#F8FAFC',
    },
  },
  rider: {
    role: 'rider',
    modelPath: '/assets/glb/character.glb',
    defaultClip: 'idle',
    walkClip: 'walk',
    paletteOverrides: {
      shirt: PALETTE.accent, // Coral delivery jacket
      trousers: '#1E293B',
      hair: '#1E293B',
      skin: '#D99B61',
      hasHelmet: true,
      coat: PALETTE.accent,
    },
  },
  customer: {
    role: 'customer',
    modelPath: '/assets/glb/character.glb',
    defaultClip: 'idle',
    walkClip: 'walk',
    paletteOverrides: {
      shirt: '#1D4ED8', // Rich sapphire blue knit sweater for crisp contrast
      trousers: '#1E293B', // Charcoal trousers
      hair: '#1F2937',
      skin: '#E2AD82',
    },
  },
};

