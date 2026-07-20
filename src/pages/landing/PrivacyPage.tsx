import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NXLogo from '../../components/NXLogo';

export default function PrivacyPage() {
  const collectionItems = [
    {
      label: 'For Local Shops (Dukas)',
      text: 'We save your phone number, shop name, location coordinate, and restock orders so we can confirm your shop\'s eligibility for direct brand discounts and coordinate regional warehouse deliveries.'
    },
    {
      label: 'For Customers',
      text: 'We keep your phone number and record the NX loyalty points you earn so you can redeem them easily for real absolute purchase discounts at participating kiosks.'
    },
    {
      label: 'For FMCGs & Regional Hubs',
      text: 'We track aggregate regional performance metrics to match manufacturer deals with real demand. This helps regional distributors supply dukas with precision.'
    }
  ];

  return (
    <div className="min-h-screen bg-nx-ink text-nx-paper font-sans antialiased selection:bg-nx-amber selection:text-nx-ink">
      {/* Header */}
      <header className="sticky top-0 z-[200] bg-nx-ink border-b border-nx-border h-16 px-6 md:px-10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <NXLogo size="sm" />
        </Link>
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xs font-medium text-nx-muted hover:text-nx-paper transition-all border border-nx-border hover:border-nx-muted/40 px-3.5 py-1.5 rounded-lg bg-nx-card"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        
        {/* Intro */}
        <div className="border-b border-nx-border pb-8 mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-nx-paper mb-3">
            Privacy Policy
          </h1>
          <p className="text-xs text-nx-muted font-mono uppercase tracking-wider mb-6">
            Last Updated: July 2026
          </p>
          <p className="text-sm text-nx-muted leading-relaxed">
            Your privacy is of absolute importance to us. This policy describes how NX Network Kenya processes, secures, and honors your personal details, transaction logs, and regional shop location metrics.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-10">
          
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-nx-paper tracking-tight">
              1. Our Core Promise
            </h2>
            <p className="text-sm text-nx-muted leading-relaxed">
              NX Network Kenya connects retail shops (dukas) directly with FMCG brands to pass manufacturer savings straight to you and your neighborhood. We believe your shop data and phone numbers are personal, and we promise to protect them in compliance with the Kenyan Data Protection Act. We never sell, lease, or share your personally identifiable information with third-party advertising companies.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-nx-paper tracking-tight">
              2. What We Collect and Why
            </h2>
            <p className="text-sm text-nx-muted leading-relaxed mb-4">
              We collect the minimum amount of data required to run the network, track points accurately, and fulfill deliveries:
            </p>
            <div className="space-y-4">
              {collectionItems.map((item, index) => (
                <div key={index} className="text-sm bg-nx-card2 border border-nx-border rounded-xl p-5">
                  <h3 className="font-semibold text-nx-paper mb-1.5">{item.label}</h3>
                  <p className="text-nx-muted leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-nx-paper tracking-tight">
              3. USSD Dialing & Web Data Security
            </h2>
            <p className="text-sm text-nx-muted leading-relaxed">
              Because our primary service runs directly on any simple mobile device via USSD <span className="text-nx-amber font-mono font-bold">*384*6180#</span>, you do not need active internet bundles to dial us or claim your points. We do not use intrusive advertising cookies to follow you around the web. When you log into our web portal, we only store functional, encrypted session variables in local storage to keep you safely logged in.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-nx-paper tracking-tight">
              4. Point Balance Auditing & Cryptography
            </h2>
            <p className="text-sm text-nx-muted leading-relaxed">
              We enforce industry-standard brute-force resistance for credentials. User passwords and PIN codes are secured using modern, memory-hard and compute-intensive hashing algorithms—specifically <strong>Argon2id</strong> and <strong>bcrypt</strong> with randomized salt keys. All loyalty points, token redemptions, and settlement records are audited regularly against transaction ledger snapshots. When showing brand performance dashboards to manufacturers, all metrics are strictly consolidated and reported in Kenyan Shillings (KES) to prevent exposure of individual consumer profiles.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4 border-t border-nx-border pt-8">
            <h2 className="text-xl font-semibold text-nx-paper tracking-tight">
              5. You Are in Direct Control
            </h2>
            <p className="text-sm text-nx-muted leading-relaxed">
              Under the Kenya Data Protection Act, you own your stored profile. You may request to review all your current reward history, update your registered phone coordinates, withdraw your consent, or erase your profile entirely. Simply dispatch an email to{' '}
              <a href="mailto:compliance@nxnetwork.company" className="text-nx-amber hover:text-nx-paper transition-colors underline font-medium">
                compliance@nxnetwork.company
              </a>{' '}
              or dial our customer line at{' '}
              <a href="tel:0781550151" className="text-nx-amber hover:text-nx-paper transition-colors font-semibold">
                0781550151
              </a>.
            </p>
          </section>

        </div>

      </main>

      {/* Mini Footer */}
      <footer className="py-12 border-t border-nx-border bg-nx-card2 mt-20">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-nx-muted font-medium">
          <div>&copy; 2026 NX Network Kenya. All rights reserved.</div>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-nx-paper transition-colors">Terms of Service</Link>
            <Link to="/help" className="hover:text-nx-paper transition-colors">Help Center</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
