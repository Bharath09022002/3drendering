// src/App.tsx
import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { initLenis, destroyLenis } from './scroll/lenis';
import { detectQualitySettings, QualityPreset, DEFAULT_QUALITY, subscribeQuality, stepDownToStandard, getQuality } from './config/quality';
import { PerformanceMonitor } from '@react-three/drei';
import { World } from './scenes/World';
import { Loader } from './scenes/Loader';
import { Nav } from './overlay/Nav';
import { Copy } from './overlay/Copy';
import { DebugBar } from './dev/DebugBar';
import { ReducedMotionFallback } from './overlay/ReducedMotionFallback';
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary';

// Exclude heavy dev tooling (Leva, r3f-perf) unless ?debug=1 is in URL
const isDebug = typeof window !== 'undefined' && window.location.search.includes('debug=1');
const DevLeva = isDebug ? React.lazy(() => import('./dev/DevLeva')) : null;
const CanvasPerf = isDebug ? React.lazy(() => import('./dev/CanvasPerf')) : null;

function QualityPerformanceWatcher() {
  const lowFpsTimerRef = useRef(0);
  useFrame((_, dt) => {
    const fps = 1 / Math.max(0.001, dt);
    const q = getQuality();
    if (q.tierName === 'Ultra' && fps < 50) {
      lowFpsTimerRef.current += dt;
      if (lowFpsTimerRef.current >= 2.0) {
        stepDownToStandard();
        lowFpsTimerRef.current = 0;
      }
    } else {
      lowFpsTimerRef.current = 0;
    }
  });
  return null;
}

export function App() {
  const [, setLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [quality, setQuality] = useState<QualityPreset>(DEFAULT_QUALITY);
  const [dpr, setDpr] = useState(2.0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Stable callback prevents Loader from restarting when setQuality triggers re-render
  const handleLoaderComplete = useCallback(() => {
    setLoaded(true);
  }, []);

  // Check prefers-reduced-motion media query
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Initialize GPU quality presets
  useEffect(() => {
    detectQualitySettings().then((preset) => {
      setQuality(preset);
      setDpr(preset.dprCap);
    });
    return subscribeQuality((preset) => {
      setQuality(preset);
      setDpr(preset.dprCap);
    });
  }, []);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    if (reducedMotion) return;

    initLenis();

    return () => {
      destroyLenis();
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <div className="relative">
        <Nav />
        <div className="pt-20">
          <div className="px-6 py-2 flex justify-center">
            <button
              onClick={() => setReducedMotion(false)}
              className="text-xs bg-primary text-white font-semibold px-4 py-2 rounded-xl"
            >
              Switch to 3D Interactive View
            </button>
          </div>
          <ReducedMotionFallback />
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-bg text-ink min-h-screen">
      {/* Dev UI Leva Controls (Excluded from production) */}
      {DevLeva && (
        <Suspense fallback={null}>
          <DevLeva />
        </Suspense>
      )}

      {/* Initial Time-Based Preloader */}
      <Loader onComplete={handleLoaderComplete} />

      {/* Top Fixed Navigation */}
      <Nav />

      {/* Sticky Fullscreen 3D WebGL Canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <CanvasErrorBoundary
          fallback={
            <div className="w-full h-full flex items-center justify-center text-xs text-ink/40">
              3D interactive canvas failed to load
            </div>
          }
        >
          <Canvas
            shadows
            dpr={[1, dpr]}
            gl={{
              antialias: quality.isMobile,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
              toneMapping: THREE.NeutralToneMapping,
              toneMappingExposure: 1.0,
              outputColorSpace: THREE.SRGBColorSpace
            }}
            onCreated={({ gl }) => {
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
              gl.shadowMap.enabled = true;

              gl.domElement.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                console.error('[WebGL Context Lost]: Canvas WebGL context was lost.');
              }, false);

              gl.domElement.addEventListener('webglcontextrestored', () => {
                console.info('[WebGL Context Restored]: Canvas WebGL context was restored.');
              }, false);
            }}
            camera={{ fov: 38, near: 0.3, far: 300, position: [0, 0, 4.5] }}
            style={{ width: '100%', height: '100%' }}
          >
            <PerformanceMonitor
              onDecline={() => {
                if (quality.tierName === 'Ultra') stepDownToStandard();
                setDpr((prev) => Math.max(1, prev - 0.25));
              }}
              onIncline={() => setDpr((prev) => Math.min(quality.dprCap, prev + 0.25))}
            />
            <QualityPerformanceWatcher />
            {CanvasPerf && (
              <Suspense fallback={null}>
                <CanvasPerf />
              </Suspense>
            )}
            <World />
          </Canvas>
        </CanvasErrorBoundary>
      </div>

      {/* Pinned HTML Copy Overlays */}
      <Copy />

      {/* Master Scroll Track scaled by 1.25 (3000vh = 2400vh * 1.25) to preserve exact per-scene pixel scroll length */}
      <div
        ref={scrollContainerRef}
        data-track="true"
        data-scroll-track="true"
        className="relative z-10 w-full pointer-events-none"
        style={{ height: '3000vh' }}
      >
        {/* Transparent virtual scroll container driving master progress */}
      </div>

      {/* Dev Debugging HUD (Only visible when ?debug=1 is in URL) */}
      {isDebug && <DebugBar />}
    </div>
  );
}

export default App;
