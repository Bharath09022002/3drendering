// src/sections/PartnerLogosSection.tsx
const PARTNER_LOGOS = [
  'MetroHealth Pharmacy',
  'Apex Care Pharmacy',
  'BioTrust RX',
  'Community Apothecary',
  'SwiftMeds Network',
  'Central Prescription Care'
];

export function PartnerLogosSection() {
  return (
    <section className="py-16 px-6 md:px-12 border-t border-border bg-surface">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-xs uppercase tracking-widest text-mutedText font-semibold mb-8">
          Connected with leading licensed pharmacy networks
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 opacity-80">
          {PARTNER_LOGOS.map((name, idx) => (
            <div
              key={idx}
              className="px-5 py-3 rounded-2xl bg-surfaceSubtle border border-border text-xs md:text-sm font-bold text-mutedText font-display hover:text-ink hover:border-primary/40 transition-colors"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

