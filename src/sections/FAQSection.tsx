// src/sections/FAQSection.tsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Do I need a valid doctor\'s prescription for Rx medications?',
    a: 'Yes, absolutely. Under federal and state health regulations, prescription medications are only dispensed after review and validation by a licensed pharmacist. You can upload a photo of your paper script or transfer your e-prescription directly from your healthcare provider.'
  },
  {
    q: 'How is 15-minute doorstep delivery achieved?',
    a: 'Pharmafly does not rely on distant regional fulfillment warehouses. Our proprietary georouting software pairs your order with the closest licensed neighborhood pharmacy within a 1-to-2-mile radius, and dispatches a dedicated nearby rider as soon as the pharmacist seals the package.'
  },
  {
    q: 'How are temperature-sensitive medicines (e.g. insulin) protected?',
    a: 'All Pharmafly couriers carry certified insulated thermal lockboxes with cold-pack inserts calibrated to maintain strict 2°C–8°C temperature parameters throughout transit.'
  },
  {
    q: 'How can local retail pharmacies partner with Pharmafly?',
    a: 'Independent community pharmacies can onboard via our Retailer Portal in less than 24 hours. We provide the verification terminal software and access to the regional rider fleet with zero upfront hardware costs.'
  },
  {
    q: 'Is my personal health information (PHI) secure?',
    a: 'All prescription data, clinical notes, and identity documents are encrypted end-to-end with 256-bit AES encryption in full compliance with HIPAA standards.'
  },
  {
    q: 'Can I set up recurring automatic refills?',
    a: 'Yes. You can activate Automated Refill Sync for maintenance medications. We coordinate with your prescriber and pharmacist 5 days before your supply runs out.'
  },
  {
    q: 'What happens if my prescribed brand is out of stock?',
    a: 'The pharmacist contacts you directly through the app to propose therapeutically equivalent generic substitutions approved by your prescriber.'
  },
  {
    q: 'Are delivery couriers background checked?',
    a: 'Every Pharmafly rider passes comprehensive multi-jurisdiction criminal background checks, motor vehicle record screening, and medical courier compliance certification.'
  }
];

export function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="py-24 px-6 md:px-12 max-w-4xl mx-auto">
      <div className="text-center mb-16">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-primaryLight text-primaryDark text-xs font-semibold uppercase tracking-wider mb-4">
          <span>Common Questions</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-ink tracking-tight">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-4">
        {FAQS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-surface border border-border overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${idx}`}
                id={`faq-btn-${idx}`}
                className="w-full flex items-center justify-between p-6 text-left font-display font-bold text-base md:text-lg text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-surfaceSubtle transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-mutedText transition-transform duration-200 shrink-0 ml-4 ${
                    isOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div
                  id={`faq-answer-${idx}`}
                  role="region"
                  aria-labelledby={`faq-btn-${idx}`}
                  className="px-6 pb-6 pt-1 text-sm md:text-base text-mutedText leading-relaxed border-t border-border/50"
                >
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

