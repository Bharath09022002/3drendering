// src/sections/StatsSection.tsx
import { useEffect, useRef, useState } from 'react';

interface StatItemProps {
  value: number;
  decimals?: number;
  suffix?: string;
  label: string;
  description: string;
}

function StatCounter({ value, decimals = 0, suffix = '', label, description }: StatItemProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1600;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(eased * value);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center md:items-start p-8 rounded-3xl bg-surface border border-border shadow-sm hover:border-primary/40 transition-all duration-300"
    >
      <div className="flex items-baseline space-x-1 mb-2">
        <span className="text-5xl sm:text-6xl font-extrabold font-display text-ink tabular-nums">
          {decimals > 0 ? displayValue.toFixed(decimals) : Math.floor(displayValue).toLocaleString()}
        </span>
        <span className="text-3xl font-bold font-display text-primary">{suffix}</span>
      </div>
      <div className="text-lg font-bold text-ink mb-1 font-display">{label}</div>
      <p className="text-sm text-mutedText leading-relaxed">{description}</p>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="py-16 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCounter
          value={15}
          suffix=" MIN"
          label="Average Delivery"
          description="Doorstep fulfillment verified from local licensed pharmacy inventory."
        />
        <StatCounter
          value={99.8}
          decimals={1}
          suffix="%"
          label="Barcode Accuracy"
          description="Dual-pharmacist cross-check and tamper-evident packaging seal protocol."
        />
        <StatCounter
          value={5200}
          suffix="+"
          label="Active Pharmacies"
          description="Certified neighborhood retail pharmacy partners connected across 24 cities."
        />
      </div>
    </section>
  );
}

