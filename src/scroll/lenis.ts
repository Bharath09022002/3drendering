// src/scroll/lenis.ts
import Lenis from 'lenis';
import gsap from 'gsap';

let lenisInstance: Lenis | null = null;
let tickerCallback: ((time: number) => void) | null = null;

export function initLenis(): Lenis {
  // If an existing instance is present (or was destroyed in StrictMode), clean it up fully first
  destroyLenis();

  lenisInstance = new Lenis({
    lerp: 0.09,
    wheelMultiplier: 0.7,
    syncTouch: false,
    autoRaf: false
  });

  tickerCallback = (time: number) => {
    lenisInstance?.raf(time * 1000);
  };

  gsap.ticker.add(tickerCallback, false, true);
  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
}

export function destroyLenis(): void {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }
  if (lenisInstance) {
    try {
      lenisInstance.destroy();
    } catch {
      // Ignore cleanup error if already destroyed
    }
    lenisInstance = null;
  }
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

let cachedTrackHeight = 0;

function updateTrackHeight(): void {
  if (typeof window === 'undefined') return;
  const track = (document.querySelector('[data-track]') || document.querySelector('[data-scroll-track]')) as HTMLElement | null;
  cachedTrackHeight = track
    ? track.offsetHeight - window.innerHeight
    : document.documentElement.scrollHeight - window.innerHeight;
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', updateTrackHeight, { passive: true });
}

export function scrollToProgress(progress: number, immediate = false): void {
  if (cachedTrackHeight <= 0) {
    updateTrackHeight();
  }
  const targetY = Math.max(0, Math.min(cachedTrackHeight, progress * cachedTrackHeight));

  if (lenisInstance && !(lenisInstance as any).isDestroyed) {
    lenisInstance.scrollTo(targetY, { immediate, force: true });
  } else if (typeof window !== 'undefined') {
    window.scrollTo({ top: targetY, behavior: immediate ? 'auto' : 'smooth' });
  }
}

if (typeof window !== 'undefined') {
  (window as any).__SCROLL_TO_PROGRESS__ = scrollToProgress;
  (window as any).__GET_LENIS__ = getLenis;
}
