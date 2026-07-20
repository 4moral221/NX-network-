import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NXLogo from '../../components/NXLogo';

export default function TermsPage() {
  const customerTerms = [
    'NX units have no cash value. They are loyalty credits only and cannot be withdrawn.',
    'Customer NX balances expire 2 months after issuance. Expired units are forfeited.',
    'NX is earned on cash paid — not on the total value including NX redemption.',
    'A flat 2 NX service fee is deducted per confirmed transaction (if balance > 0).',
    'Transactions are final once confirmed. NX is not liable for merchant disputes.',
    'Repeated cancellations result in a 7-day suspension from Pay with NX.',
    'Registration requires name and National ID. A 4-digit recovery PIN is mandatory.',
    'Account recovery requires old number, ID and PIN to match exactly.'
  ];

  const merchantTerms = [
    'Merchant NX settlement pools never expire. Pools are funded by NX\'s trading margin.',
    'NX acceptance per transaction is capped at your tier\'s ceiling: BASIC 20%, CERTIFIED 30%, HUB 40%.',
    'Restock Invoices: Merchants can only use 60% of their NX balance for partial payment per restock cycle.',
    'Certified and Hub merchants pay a monthly franchise fee. Non-payment leads to downgrade.',
    'Hub merchants earn 0.2 NX per sub-merchant confirmed transaction. Paid out monthly.',
    'NX delivers stock to dukas, then settles on delivery. Earned NX reduces part of the invoice, helping merchants restock with less cash outflow.',
    'FMCG contributions may augment your pool at NX\'s discretion.',
    'NX reserves the right to suspend accounts for platform abuse.',
    'NX Network (Kenya) 2026. Terms subject to change with 7 days notice via SMS.'
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
            Terms of Service
          </h1>
          <p className="text-xs text-nx-muted font-mono uppercase tracking-wider mb-6">
            Last Updated: July 2026
          </p>
          <p className="text-sm text-nx-muted leading-relaxed">
            Welcome to the NX Network Kenya system. By accessing our USSD portal <span className="text-nx-amber font-mono font-bold">*384*6180#</span> or logging into our web dashboards, you agree to comply with and be bound by the following Terms & Conditions. Please read them carefully.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-10">
          
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-nx-paper tracking-tight">
              1. For Customers & Residents
            </h2>
            <div className="text-sm text-nx-muted leading-relaxed">
              <p className="mb-4">
                The following rules and provisions govern consumer participation, balance management, and point usage within the NX loyalty network:
              </p>
              <ul className="list-decimal pl-5 space-y-3">
                {customerTerms.map((term, index) => (
                  <li key={index} className="pl-1">
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-nx-paper tracking-tight">
              2. For Registered Dukas (Merchants)
            </h2>
            <div className="text-sm text-nx-muted leading-relaxed">
              <p className="mb-4">
                These terms govern the participation of local neighborhood retail shops (dukas) registered as certified merchants in the NX Network:
              </p>
              <ul className="list-decimal pl-5 space-y-3">
                {merchantTerms.map((term, index) => (
                  <li key={index} className="pl-1">
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4 border-t border-nx-border pt-8">
            <h2 className="text-xl font-semibold text-nx-paper tracking-tight">
              3. Amendments & Regulatory Compliance
            </h2>
            <p className="text-sm text-nx-muted leading-relaxed">
              NX Network is registered in Kenya and operates under local compliance regulations. All unit redemptions, audits, or structural loyalty pool allocations are managed transparently. We reserve the right to review and update these terms to preserve the integrity of our micro-retail economy. Notice of updates will be dispatched via USSD/SMS alerts 7 days prior to their enforcement.
            </p>
          </section>

        </div>

      </main>

      {/* Mini Footer */}
      <footer className="py-12 border-t border-nx-border bg-nx-card2 mt-20">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-nx-muted font-medium">
          <div>&copy; 2026 NX Network Kenya. All rights reserved.</div>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-nx-paper transition-colors">Privacy Policy</Link>
            <Link to="/help" className="hover:text-nx-paper transition-colors">Help Center</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
