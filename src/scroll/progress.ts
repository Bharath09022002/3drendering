// src/scroll/progress.ts
// Continuous sub-pixel float reference driving all 3D scene elements and camera frames.
// CRITICAL: Sourced directly from Lenis smooth scroll engine as a readonly getter.
import { getLenis } from './lenis';

export interface ScrollProgressRef {
  readonly current: number;
}

export const scrollProgress: ScrollProgressRef = {
  get current(): number {
    const lenis = getLenis();
    if (lenis && !(lenis as any).isDestroyed) {
      return lenis.progress;
    }
    if (typeof window !== 'undefined') {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      return maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    }
    return 0;
  },
};

export interface SceneWindowDef {
  id: number;
  key: SceneKey;
  weight: number;
  name: string;
  headline: string;
  subhead: string;
}

export interface SceneWindow extends SceneWindowDef {
  start: number;
  end: number;
}

export interface WindowBounds {
  start: number;
  end: number;
}

export type SceneKey =
  | 'phoneRotates'
  | 'appOpens'
  | 'searchMedicine'
  | 'placeOrder'
  | 'orderToCloud'
  | 'cameraToPharmacy'
  | 'retailerPacks'
  | 'riderPickup'
  | 'bikeThroughCity'
  | 'customerReceives'
  | 'logoReveal';

// Pacing weights: Sum = 100% exactly
// 1 Phone rotates 5, 2 App opens 5, 3 Search 7, 4 Place order 6, 5 Order to cloud 8,
// 6 Camera to pharmacy 8, 7 Retailer packs 10, 8 Rider pickup 14, 9 Bike through city 24,
// 10 Customer receives 9, 11 Logo reveal 4.
const RAW_SCENE_DEFS: readonly SceneWindowDef[] = [
  { id: 1, key: 'phoneRotates', weight: 5, name: 'Phone Rotates', headline: 'Your pharmacy. In your pocket.', subhead: 'Instant access to healthcare essentials from trusted neighborhood pharmacies.' },
  { id: 2, key: 'appOpens', weight: 5, name: 'App Opens', headline: 'Open Pharmafly.', subhead: 'Seamless mobile experience designed for speed and clarity.' },
  { id: 3, key: 'searchMedicine', weight: 7, name: 'Search Medicine', headline: 'Find any medicine.', subhead: 'Smart catalog search with verified stock status across all licensed partners.' },
  { id: 4, key: 'placeOrder', weight: 6, name: 'Place Order', headline: 'Order in one tap.', subhead: 'Encrypted checkout and immediate order routing.' },
  { id: 5, key: 'orderToCloud', weight: 8, name: 'Order to Cloud', headline: 'Sent to the nearest pharmacy.', subhead: 'Intelligent georouting matches your prescription with the closest inventory.' },
  { id: 6, key: 'cameraToPharmacy', weight: 8, name: 'Camera to Pharmacy', headline: 'Pharmacy confirms.', subhead: 'Licensed pharmacist reviews and approves your prescription in real time.' },
  { id: 7, key: 'retailerPacks', weight: 10, name: 'Retailer Packs', headline: 'Packed and verified.', subhead: 'Tamper-evident packaging and barcode double-check protocol.' },
  { id: 8, key: 'riderPickup', weight: 14, name: 'Rider Pickup', headline: 'Rider on the way.', subhead: 'Dedicated delivery partner assigned within seconds of dispatch.' },
  { id: 9, key: 'bikeThroughCity', weight: 24, name: 'Bike Through City', headline: 'Across the city.', subhead: 'Real-time telemetry and temperature-controlled transit.' },
  { id: 10, key: 'customerReceives', weight: 9, name: 'Customer Receives', headline: 'Delivered.', subhead: 'Contactless handover with digital signature confirmation.' },
  { id: 11, key: 'logoReveal', weight: 4, name: 'Logo Reveal', headline: 'Pharmafly.', subhead: 'Medicines, delivered fast.' },
] as const;

// Compute start and end dynamically so they ALWAYS chain without gaps
let runningTotal = 0;
export const SCENE_WINDOWS: readonly SceneWindow[] = RAW_SCENE_DEFS.map((s) => {
  const start = runningTotal / 100;
  runningTotal += s.weight;
  const end = runningTotal / 100;
  return {
    ...s,
    start: Number(start.toFixed(4)),
    end: Number(end.toFixed(4)),
  };
});

/**
 * Single source of truth lookup: W.<sceneKey> = { start, end }
 * Also supports alias W.scene1 through W.scene11
 */
export const W: Record<SceneKey, WindowBounds> & Record<string, WindowBounds> = (() => {
  const map: Record<string, WindowBounds> = {};
  for (const sw of SCENE_WINDOWS) {
    map[sw.key] = { start: sw.start, end: sw.end };
    map[`scene${sw.id}`] = { start: sw.start, end: sw.end };
  }
  return map as Record<SceneKey, WindowBounds> & Record<string, WindowBounds>;
})();

/**
 * Lookup scene window by 1-based id
 */
export function win(id: number): SceneWindow {
  return SCENE_WINDOWS[id - 1] ?? SCENE_WINDOWS[0];
}

/**
 * Calculates local normalized progress [0, 1] within a scene window [start, end].
 */
export function getLocalProgress(
  p: number,
  start: number,
  end: number,
  clamp = true
): number {
  if (end <= start) return 0;
  const local = (p - start) / (end - start);
  if (!clamp) return local;
  return Math.min(Math.max(local, 0), 1);
}

/**
 * Check if the current master scroll is within the scene's active window (with optional buffer).
 */
export function isInWindow(p: number, start: number, end: number, buffer = 0.005): boolean {
  return p >= start - buffer && p <= end + buffer;
}

/**
 * Perlin smootherstep: 6t^5 - 15t^4 + 10t^3
 */
export function smootherstep(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Action segment helper:
 * Each scene is internally split:
 * - Enter / settle: first 12% (localP 0.00 to 0.12) -> returns 0
 * - Action: middle 76% (localP 0.12 to 0.88) -> mapped from sub-range [a, b] with smootherstep
 * - Hold: last 12% (localP 0.88 to 1.00) -> returns 1
 *
 * @param localP Normalized local progress within scene [0, 1]
 * @param a Start of sub-action (fraction of action window 0..1, default 0)
 * @param b End of sub-action (fraction of action window 0..1, default 1)
 */
export function seg(localP: number, a = 0, b = 1): number {
  const actionProgress = Math.min(Math.max((localP - 0.12) / 0.76, 0), 1);
  if (b <= a) return actionProgress >= b ? 1 : 0;
  const t = Math.min(Math.max((actionProgress - a) / (b - a), 0), 1);
  return smootherstep(t);
}
