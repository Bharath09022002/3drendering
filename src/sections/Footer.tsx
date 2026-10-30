// src/sections/Footer.tsx
export function Footer() {
  return (
    <footer role="contentinfo" className="border-t border-border bg-surfaceSubtle py-16 px-6 md:px-12 text-mutedText text-sm">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-base font-display">
                P
              </div>
              <span className="font-extrabold text-xl tracking-tight text-ink font-display">
                Pharmafly
              </span>
            </div>
            <p className="text-xs leading-relaxed">
              Certified on-demand prescription logistics platform connecting patients with neighborhood pharmacies.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="font-bold text-ink text-xs uppercase tracking-wider mb-4 font-display">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-ink transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">How It Works</a></li>
              <li><a href="#" className="hover:text-ink transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Pharmacy Partner Hub</a></li>
              <li><a href="#" className="hover:text-ink transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Rider Fleet Careers</a></li>
              <li><a href="#" className="hover:text-ink transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Enterprise Health Plans</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="font-bold text-ink text-xs uppercase tracking-wider mb-4 font-display">
              Compliance
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-ink transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">HIPAA Privacy Policy</a></li>
              <li><a href="#" className="hover:text-ink transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Pharmacy Verification Standards</a></li>
              <li><a href="#" className="hover:text-ink transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Terms of Service</a></li>
              <li><a href="#" className="hover:text-ink transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Security Overview</a></li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="font-bold text-ink text-xs uppercase tracking-wider mb-4 font-display">
              Contact & Support
            </h4>
            <p className="text-xs leading-relaxed mb-2">
              Clinical pharmacist support available 24/7 via the app.
            </p>
            <div className="text-xs font-mono font-medium text-ink">
              support@pharmafly.com
            </div>
          </div>
        </div>

        {/* Mandatory Regulatory Compliance Disclaimer */}
        <div className="border-t border-border pt-8 text-xs leading-relaxed text-mutedText/80 space-y-3">
          <p>
            <strong>Regulatory Notice:</strong> Pharmafly is a technology and logistics platform that facilitates on-demand fulfillment from independently licensed retail pharmacies. Pharmafly is not a pharmacy and does not dispense prescription medications. All prescription medications require valid authorization from a state-licensed medical practitioner and are verified by certified pharmacists prior to dispatch.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] pt-4 border-t border-border/40 gap-2">
            <div>© {new Date().getFullYear()} Pharmafly Technologies, Inc. All rights reserved.</div>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-ink rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Privacy</a>
              <a href="#" className="hover:text-ink rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Terms</a>
              <a href="#" className="hover:text-ink rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Licenses</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

