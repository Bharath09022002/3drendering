// src/config/palette.ts
// Single source of truth for all color tokens in canvas and HTML overlays

export const PALETTE = {
  bg: '#F6FAF8',
  ink: '#0B1F1A',
  
  // 3D fill only, never used for text
  primaryFill: '#0FA37F',
  
  // Primary text, buttons & accessible UI highlights
  primary: '#0B7F63',
  primaryDark: '#0B7F63',
  primaryLight: '#DDF3EB',
  
  // Urgent accents (rider, order, CTA only, ink text on it)
  accent: '#FF6B4A',
  accentCoral: '#FF6B4A',
  coral: '#FF6B4A',
  
  // Tonal mint and night navy (dusk & logo reveal)
  mint: '#DDF3EB',
  nightNavy: '#0A1A2F',
  
  // Neutral tonal values derived for 3D flat shading and UI surfaces
  surface: '#FFFFFF',
  surfaceSubtle: '#EFF6F3',
  border: '#D8E8E1',
  mutedText: '#5A736B',
  
  // Grey-box / Scene 3D flat-shading palette
  greybox: {
    phoneBody: '#1F2937',
    phoneScreen: '#FFFFFF',
    cloud: '#D2EDE2',
    pharmacyFloor: '#E5EFEA',
    pharmacyShelf: '#B8D5CB',
    packageBox: '#E29578',
    bikeBody: '#0FA37F',
    riderVest: '#FF6B4A',
    road: '#2A3633',
    roadStripes: '#FFFFFF',
    building: '#C5DCD4',
    buildingAccent: '#9FC4B8',
    customer: '#3D5A80'
  }
} as const;

export type Palette = typeof PALETTE;

