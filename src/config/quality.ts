// src/config/quality.ts
import { getGPUTier, TierResult } from 'detect-gpu';

export interface QualityPreset {
  isMobile: boolean;
  tier: number;
  dprCap: number;
  buildingCount: number;
  enablePostProcessing: boolean;
  simplifiedClouds: boolean;
  shadows: boolean; // Blob fake shadows only
}

export const DEFAULT_QUALITY: QualityPreset = {
  isMobile: false,
  tier: 2,
  dprCap: 2.0, // Desktop cap [1, 2.0] per visual specification
  buildingCount: 160,
  enablePostProcessing: true,
  simplifiedClouds: false,
  shadows: true
};

export const MOBILE_QUALITY: QualityPreset = {
  isMobile: true,
  tier: 1,
  dprCap: 1.5, // Mobile cap [1, 1.5] per visual specification
  buildingCount: 80, // half building count for mobile
  enablePostProcessing: false,
  simplifiedClouds: true,
  shadows: false
};

let activeQuality: QualityPreset = DEFAULT_QUALITY;

export async function detectQualitySettings(): Promise<QualityPreset> {
  try {
    const gpuTier: TierResult = await getGPUTier();
    const isMobileDevice = gpuTier.isMobile || window.innerWidth < 768;

    if (isMobileDevice) {
      activeQuality = {
        ...MOBILE_QUALITY,
        tier: gpuTier.tier || 1
      };
    } else {
      activeQuality = {
        isMobile: false,
        tier: gpuTier.tier || 2,
        dprCap: 2.0, // Desktop DPR cap [1, 2.0]
        buildingCount: gpuTier.tier >= 3 ? 180 : 120,
        enablePostProcessing: gpuTier.tier >= 2,
        simplifiedClouds: gpuTier.tier < 2,
        shadows: true
      };
    }
  } catch {
    // Fallback safe defaults based on viewport
    const isMobile = window.innerWidth < 768;
    activeQuality = isMobile ? MOBILE_QUALITY : DEFAULT_QUALITY;
  }
  return activeQuality;
}

export function getQuality(): QualityPreset {
  return activeQuality;
}

