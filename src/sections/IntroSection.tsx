// src/sections/IntroSection.tsx
export function IntroSection() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto text-center">
      <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-primaryLight text-primaryDark text-xs font-semibold uppercase tracking-wider mb-6">
        <span>Healthcare Infrastructure</span>
      </div>
      <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display tracking-tight text-ink max-w-4xl mx-auto leading-[1.12] mb-6">
        The fastest, most secure bridge between licensed pharmacists and your doorstep.
      </h2>
      <p className="text-lg sm:text-xl text-mutedText font-medium max-w-2xl mx-auto leading-relaxed">
        Pharmafly transforms acute and chronic medication fulfillment. With algorithmic routing and certified cold-chain transit, we eliminate delivery friction when health matters most.
      </p>
    </section>
  );
}

