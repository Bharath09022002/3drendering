// src/overlay/Copy.tsx
import { useEffect, useState, useRef } from 'react';
import {
  scrollProgress,
  masterProgress,
  SCENE_WINDOWS,
  SceneWindow,
  W,
} from '../scroll/progress';

export function Copy() {
  const [activeScene, setActiveScene] = useState<SceneWindow>(SCENE_WINDOWS[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const lastIdRef = useRef(1);
  const animTimeoutRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const timerTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let animId: number;

    const checkProgress = () => {
      const m = masterProgress.current;
      const p = scrollProgress.current;

      // 1. Direct DOM update for top progress bar (master progress across entire track)
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, m))})`;
      }

      // 2. Direct DOM update for transit timer during Scene 9 (0% React re-render overhead)
      if (timerTextRef.current) {
        if (p >= W.bikeThroughCity.start && p <= W.bikeThroughCity.end) {
          const bikeProgress = (p - W.bikeThroughCity.start) / (W.bikeThroughCity.end - W.bikeThroughCity.start);
          const totalSecs = Math.min(15 * 60, Math.floor(bikeProgress * 15 * 60));
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          timerTextRef.current.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
      }

      // 3. Determine active scene window (only triggers React render ONCE per scene transition)
      let currentWindow = SCENE_WINDOWS[0];
      for (let i = 0; i < SCENE_WINDOWS.length; i++) {
        if (p >= SCENE_WINDOWS[i].start && p <= SCENE_WINDOWS[i].end) {
          currentWindow = SCENE_WINDOWS[i];
          break;
        }
      }
      if (p > SCENE_WINDOWS[SCENE_WINDOWS.length - 1].end) {
        currentWindow = SCENE_WINDOWS[SCENE_WINDOWS.length - 1];
      }

      // Smooth ~400ms upward slide + fade animation ONLY on actual scene change
      if (currentWindow.id !== lastIdRef.current) {
        lastIdRef.current = currentWindow.id;
        setIsAnimating(true);
        if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);

        animTimeoutRef.current = window.setTimeout(() => {
          setActiveScene(currentWindow);
          setIsAnimating(false);
        }, 120);
      }

      animId = requestAnimationFrame(checkProgress);
    };

    animId = requestAnimationFrame(checkProgress);
    return () => {
      cancelAnimationFrame(animId);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    };
  }, []);

  return (
    <>
      {/* 1. Slim Top Scroll Progress Indicator (GPU Hardware Transform) */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-40 bg-transparent pointer-events-none">
        <div
          ref={progressBarRef}
          className="h-full bg-primary origin-left will-change-transform"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* 2. Pinned Narrative Overlay */}
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-start p-4 sm:p-6 md:p-12 transition-opacity duration-500 opacity-100">
        {/* Soft Gradient Scrim behind text column for min 4.5:1 contrast during Scene 9 aerial drone flight */}
        <div
          className={`absolute inset-y-0 left-0 w-full md:w-[48vw] pointer-events-none transition-opacity duration-500 bg-gradient-to-r from-bg/95 via-bg/80 to-transparent ${
            activeScene.id === 9 ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Top spacing below fixed nav bar */}
        <div className="h-12 md:h-16 relative z-10" />

        {/* Main Narrative Overlay Block (Fixed to left 45% on desktop, top third on mobile) */}
        <div
          className={`relative z-10 w-full md:w-[44%] max-w-lg transition-all duration-300 ease-out transform ${
            isAnimating ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Section badge - Clean production badge, hidden on final logo reveal */}
          {activeScene.id !== 11 && (
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full bg-surface/90 backdrop-blur-md border border-border shadow-sm mb-2 md:mb-4">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] md:text-xs font-semibold tracking-wider uppercase text-mutedText">
                {activeScene.name}
              </span>
            </div>
          )}

          {/* Dynamic Headline (White on Scene 11 dusk backdrop, Ink on light scenes) */}
          <h1
            className={`text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold font-display tracking-tight leading-[1.1] mb-2 md:mb-4 ${
              activeScene.id === 11 ? 'text-white' : 'text-ink'
            }`}
          >
            {activeScene.headline}
          </h1>

          {/* Descriptive Subtext (High contrast white/85 on Scene 11) */}
          <p
            className={`text-xs sm:text-sm md:text-lg font-medium max-w-md leading-relaxed mb-3 md:mb-6 line-clamp-2 md:line-clamp-none ${
              activeScene.id === 11 ? 'text-white/85' : 'text-mutedText'
            }`}
          >
            {activeScene.subhead}
          </p>

          {/* Scene 9 Elapsed City Transit Timer (calculated seconds, zero React re-render lag) */}
          {activeScene.id === 9 && (
            <div className="inline-flex items-center space-x-2 md:space-x-3 bg-ink text-white px-3.5 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl shadow-xl">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-coral animate-ping" />
              <div className="text-[10px] md:text-sm uppercase tracking-wider font-semibold text-white/70">Transit Time:</div>
              <div className="text-lg md:text-2xl font-bold font-display text-white tabular-nums">
                <span ref={timerTextRef}>00:00</span>{' '}
                <span className="text-[10px] md:text-xs text-white/60">EST. 15 MIN</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom indicator */}
        <div className="mt-auto flex items-center justify-between text-xs text-mutedText font-medium">
          {activeScene.id !== 11 && (
            <div className="hidden sm:block">Scroll to explore the journey</div>
          )}
        </div>
      </div>
    </>
  );
}
