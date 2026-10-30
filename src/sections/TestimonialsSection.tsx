// src/sections/TestimonialsSection.tsx
const TESTIMONIALS = [
  {
    quote: '"When my child had an acute ear infection late on a Sunday, Pharmafly delivered the antibiotic in 14 minutes. A lifesaver."',
    author: 'Sarah M.',
    role: 'Patient, Chicago, IL',
    avatar: 'SM'
  },
  {
    quote: '"Pharmafly connected our independent neighborhood pharmacy to thousands of digital patients while honoring our licensed verification workflow."',
    author: 'Dr. Raymond Vance, PharmD',
    role: 'Chief Pharmacist, MetroRx',
    avatar: 'RV'
  },
  {
    quote: '"The dedicated thermal lockbox and optimized route dispatch make deliveries smooth, professional, and reliable every single day."',
    author: 'Carlos D.',
    role: 'Certified Delivery Partner',
    avatar: 'CD'
  }
];

export function TestimonialsSection() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-primaryLight text-primaryDark text-xs font-semibold uppercase tracking-wider mb-4">
          <span>Real Stories</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-ink tracking-tight">
          Loved by Patients & Pharmacists Alike
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TESTIMONIALS.map((t, idx) => (
          <div
            key={idx}
            className="p-8 rounded-3xl bg-surface border border-border shadow-sm flex flex-col justify-between"
          >
            <p className="text-mutedText italic text-base leading-relaxed mb-6">
              {t.quote}
            </p>
            <div className="flex items-center space-x-4 border-t border-border pt-4">
              <div className="w-10 h-10 rounded-full bg-mint text-primary font-bold font-display flex items-center justify-center text-sm">
                {t.avatar}
              </div>
              <div>
                <div className="font-bold text-sm text-ink font-display">{t.author}</div>
                <div className="text-xs text-mutedText">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

