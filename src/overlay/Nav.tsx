// src/overlay/Nav.tsx
import { getLenis } from '../scroll/lenis';

export function Nav() {
  return (
    <header role="banner" className="fixed top-0 left-0 right-0 z-30 pointer-events-auto flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-bg/80 border-b border-border/60 transition-all duration-300">
      {/* Brand Mark */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg font-display shadow-md shadow-primary/20">
          P
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-xl tracking-tight text-ink font-display">
            Pharmafly
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
            Delivery Network
          </span>
        </div>
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center space-x-3 md:space-x-4">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-primaryLight text-primaryDark border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>Live Dispatch Active</span>
        </div>

        <button
          onClick={() => {
            const lenis = getLenis();
            if (lenis) {
              lenis.scrollTo(document.body.scrollHeight, { duration: 1.5 });
            } else {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
          }}
          className="px-4 py-2 rounded-xl bg-ink text-white text-xs md:text-sm font-semibold hover:bg-ink/90 active:scale-95 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Get The App
        </button>
      </div>
    </header>
  );
}
