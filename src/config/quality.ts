// src/config/quality.ts
import { getGPUTier, TierResult } from 'detect-gpu';

export type QualityTierName = 'Ultra' | 'Standard' | 'Mobile';

export interface QualityPreset {
  tierName: QualityTierName;
  isMobile: boolean;
  tier: number;
  dprCap: number;
  shadowMapSize: number;
  multisampling: number;
  anisotropy: number;
  enableAO: boolean;
  enablePostProcessing: boolean;
  buildingCount: number;
  simplifiedClouds: boolean;
  shadows: boolean;
  steppedDown?: boolean;
}

export const ULTRA_QUALITY: QualityPreset = {
  tierName: 'Ultra',
  isMobile: false,
  tier: 3,
  dprCap: 2.0,
  shadowMapSize: 4096,
  multisampling: 4,
  anisotropy: 16,
  enableAO: true,
  enablePostProcessing: true,
  buildingCount: 180,
  simplifiedClouds: false,
  shadows: true,
};

export const STANDARD_QUALITY: QualityPreset = {
  tierName: 'Standard',
  isMobile: false,
  tier: 2,
  dprCap: 1.75,
  shadowMapSize: 2048,
  multisampling: 4,
  anisotropy: 16,
  enableAO: true,
  enablePostProcessing: true,
  buildingCount: 120,
  simplifiedClouds: false,
  shadows: true,
};

export const MOBILE_QUALITY: QualityPreset = {
  tierName: 'Mobile',
  isMobile: true,
  tier: 1,
  dprCap: 1.5,
  shadowMapSize: 1024,
  multisampling: 0,
  anisotropy: 4,
  enableAO: false,
  enablePostProcessing: false,
  buildingCount: 80,
  simplifiedClouds: true,
  shadows: false,
};

export const DEFAULT_QUALITY: QualityPreset = ULTRA_QUALITY;

let activeQuality: QualityPreset = ULTRA_QUALITY;
const listeners = new Set<(q: QualityPreset) => void>();

export function subscribeQuality(fn: (q: QualityPreset) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyQualityChange() {
  listeners.forEach((fn) => fn(activeQuality));
  if (typeof window !== 'undefined') {
    (window as any).__ACTIVE_QUALITY__ = activeQuality;
  }
}

export async function detectQualitySettings(): Promise<QualityPreset> {
  // Check URL override: ?tier=ultra | standard | mobile
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const tierParam = params.get('tier')?.toLowerCase();
    if (tierParam === 'ultra') {
      activeQuality = { ...ULTRA_QUALITY };
      notifyQualityChange();
      return activeQuality;
    }
    if (tierParam === 'standard') {
      activeQuality = { ...STANDARD_QUALITY };
      notifyQualityChange();
      return activeQuality;
    }
    if (tierParam === 'mobile') {
      activeQuality = { ...MOBILE_QUALITY };
      notifyQualityChange();
      return activeQuality;
    }
  }

  try {
    const gpuTier: TierResult = await getGPUTier();
    const isMobileDevice = gpuTier.isMobile || (typeof window !== 'undefined' && window.innerWidth < 768);

    if (isMobileDevice) {
      activeQuality = {
        ...MOBILE_QUALITY,
        tier: gpuTier.tier || 1,
      };
    } else if (gpuTier.tier >= 3) {
      activeQuality = {
        ...ULTRA_QUALITY,
        tier: gpuTier.tier,
      };
    } else {
      activeQuality = {
        ...STANDARD_QUALITY,
        tier: gpuTier.tier || 2,
      };
    }
  } catch {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    activeQuality = isMobile ? { ...MOBILE_QUALITY } : { ...ULTRA_QUALITY };
  }

  notifyQualityChange();
  return activeQuality;
}

export function getQuality(): QualityPreset {
  return activeQuality;
}

export function stepDownToStandard(): QualityPreset {
  if (activeQuality.tierName === 'Ultra') {
    activeQuality = {
      ...STANDARD_QUALITY,
      steppedDown: true,
    };
    notifyQualityChange();
  }
  return activeQuality;
}
