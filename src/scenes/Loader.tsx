// src/scenes/Loader.tsx
import { useEffect, useState } from 'react';
import { PALETTE } from '../config/palette';

interface LoaderProps {
  onComplete: () => void;
}

export function Loader({ onComplete }: LoaderProps) {
  const skip = typeof window !== 'undefined' && (window.location.search.includes('skipLoader=1') || (window as any).__SKIP_LOADER__);
  const [count, setCount] = useState(skip ? 100 : 0);
  const [fading, setFading] = useState(skip);
  const [hidden, setHidden] = useState(skip);

  useEffect(() => {
    if (skip) {
      onComplete();
      return;
    }

    // Time-based smooth counter 0% -> 100% over ~1.6 seconds
    const duration = 1600;
    const intervalTime = 20;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      // Ease out cubic
      const progress = currentStep / steps;
      const eased = Math.min(1, 1 - Math.pow(1 - progress, 3));
      const val = Math.floor(eased * 100);
      setCount(val);

      if (currentStep >= steps) {
        clearInterval(timer);
        setCount(100);
        setTimeout(() => {
          setFading(true);
          setTimeout(() => {
            setHidden(true);
            onComplete();
          }, 600);
        }, 200);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  if (hidden) return null;

  return (
    <div
      id="app-preloader"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-700 select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: PALETTE.bg }}
    >
      <div className="flex flex-col items-center max-w-sm px-6 text-center">
        {/* Animated Brand Mark */}
        <div className="relative w-16 h-16 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping opacity-30" />
          <div className="relative w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-2xl font-display">P</span>
          </div>
        </div>

        {/* Counter Display */}
        <div className="flex items-baseline space-x-1 mb-4">
          <span className="text-6xl font-extrabold tracking-tight font-display text-ink tabular-nums">
            {count.toString().padStart(2, '0')}
          </span>
          <span className="text-2xl font-bold text-primary font-display">%</span>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-48 h-1 bg-border rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-primary transition-all duration-75 ease-out rounded-full"
            style={{ width: `${count}%` }}
          />
        </div>

        <p className="text-xs uppercase tracking-widest text-mutedText font-semibold">
          Preparing your delivery experience...
        </p>
      </div>
    </div>
  );
}

