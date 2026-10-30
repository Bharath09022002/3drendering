// src/sections/CTASection.tsx
export function CTASection() {
  return (
    <section className="py-20 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="relative rounded-3xl bg-ink text-white p-10 md:p-16 overflow-hidden text-center flex flex-col items-center shadow-2xl">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider mb-6">
            <span>Get Started Today</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight text-white mb-6">
            Your Local Pharmacy in Your Pocket.
          </h2>
          <p className="text-white/70 text-base md:text-lg mb-8 leading-relaxed">
            Download the Pharmafly app for iOS and Android. Experience rapid, verified prescription delivery within minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-accent text-ink font-extrabold font-display text-base hover:bg-accent/90 active:scale-95 transition-all shadow-lg shadow-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
              Download on App Store
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 text-white border border-white/20 font-extrabold font-display text-base hover:bg-white/20 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
              Get it on Google Play
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

