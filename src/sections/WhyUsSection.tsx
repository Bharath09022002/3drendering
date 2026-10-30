// src/sections/WhyUsSection.tsx
import { UserCheck, ShieldAlert, Navigation } from 'lucide-react';

const TRUST_POINTS = [
  {
    icon: UserCheck,
    title: '100% Licensed Pharmacists',
    desc: 'We do not operate rogue warehouses. Every medication is checked, compounded if necessary, and approved by state-certified pharmacists.'
  },
  {
    icon: ShieldAlert,
    title: 'Tamper-Evident Medical Seal',
    desc: 'Prescriptions are packed in sealed, security-taped medical pouches with dual barcode scans before leaving the pharmacy dispatch counter.'
  },
  {
    icon: Navigation,
    title: 'End-to-End Live Tracking',
    desc: 'Full transparency with real-time GPS telemetry, rider identity authentication, and contactless digital signature verification upon delivery.'
  }
];

export function WhyUsSection() {
  return (
    <section className="py-24 px-6 md:px-12 bg-surfaceSubtle border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-primaryLight text-primaryDark text-xs font-semibold uppercase tracking-wider mb-4">
            <span>Quality & Governance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-ink tracking-tight">
            Why Healthcare Providers & Patients Trust Us
          </h2>
          <p className="text-mutedText max-w-xl mx-auto mt-4 text-base">
            Strict clinical compliance paired with cutting-edge logistics architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TRUST_POINTS.map((point, idx) => {
            const Icon = point.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-surface border border-border shadow-sm flex flex-col items-start"
              >
                <div className="w-14 h-14 rounded-2xl bg-mint text-primary flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold font-display text-ink mb-3">
                  {point.title}
                </h3>
                <p className="text-mutedText text-sm leading-relaxed">
                  {point.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

