// src/dev/spikeLogger.ts
import { scrollProgress, SCENE_WINDOWS } from '../scroll/progress';

export interface FrameSpike {
  durationMs: number;
  progress: number;
  sceneId: number;
  timestamp: number;
}

const spikes: FrameSpike[] = [];

if (typeof window !== 'undefined') {
  (window as any).__SPIKES__ = spikes;
}

let isLoggerActive = false;

export function initSpikeLogger(): void {
  if (typeof window === 'undefined') return;
  if (isLoggerActive) return;

  const isDebug = window.location.search.includes('debug=1');
  if (!isDebug) return;

  isLoggerActive = true;
  let lastTime = performance.now();
  let lastProgress = scrollProgress.current;

  const measureFrame = (time: number) => {
    const dt = time - lastTime;
    lastTime = time;

    const p = scrollProgress.current;
    const isMoving = Math.abs(p - lastProgress) > 1e-4;
    lastProgress = p;

    // Detect frame duration exceeding 20ms (> 50fps drop) during active scroll
    if (dt > 20.0 && isMoving) {
      const found = SCENE_WINDOWS.find((s) => p >= s.start && p <= s.end);
      const sceneId = found ? found.id : (p > 0.9 ? 11 : 1);

      spikes.push({
        durationMs: Math.round(dt * 10) / 10,
        progress: Math.round(p * 1000) / 1000,
        sceneId,
        timestamp: Math.round(time),
      });
    }

    requestAnimationFrame(measureFrame);
  };

  requestAnimationFrame(measureFrame);
}

export function getSpikes(): FrameSpike[] {
  return spikes;
}

