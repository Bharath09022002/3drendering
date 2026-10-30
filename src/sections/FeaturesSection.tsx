// src/sections/FeaturesSection.tsx
import { Search, ShieldCheck, MapPin, Truck, BellRing, Building2 } from 'lucide-react';

const FEATURES = [
  {
    icon: Search,
    title: 'Instant Medication Lookup',
    desc: 'Search any OTC or prescription medicine with real-time stock availability verified against local licensed inventories.'
  },
  {
    icon: ShieldCheck,
    title: 'Prescription Validation',
    desc: 'Snap or transfer digital e-prescriptions. Regulated verification protocol completed by licensed pharmacists before packing.'
  },
  {
    icon: MapPin,
    title: 'Intelligent Georouting',
    desc: 'Orders are dynamically matched with the closest verified neighborhood retailer for minimum dispatch latency.'
  },
  {
    icon: Truck,
    title: 'Live Cold-Chain Telemetry',
    desc: 'Track delivery rider in real time with continuous route telemetry and temperature-assured transit containers.'
  },
  {
    icon: BellRing,
    title: 'Predictive Refill Sync',
    desc: 'Never miss a dose. Automated reminder system prepares chronic refills before your supply depletes.'
  },
  {
    icon: Building2,
    title: 'Retailer Empowerment',
    desc: 'Community pharmacies get an enterprise dashboard to process digital prescriptions and dispatch orders in seconds.'
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-primaryLight text-primaryDark text-xs font-semibold uppercase tracking-wider mb-4">
          <span>Core Capabilities</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-ink tracking-tight">
          Engineered for Healthcare Precision
        </h2>
        <p className="text-mutedText max-w-xl mx-auto mt-4 text-base">
          Every step of the Pharmafly network is built with clinical security, speed, and absolute patient privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURES.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-surface border border-border shadow-sm hover:border-primary/50 transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-mint text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-display text-ink mb-3">
                  {item.title}
                </h3>
                <p className="text-mutedText text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

