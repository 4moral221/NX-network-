import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Search, HelpCircle, Smartphone, 
  Plus, Minus, Mail, Phone, Clock
} from 'lucide-react';
import NXLogo from '../../components/NXLogo';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'customer' | 'merchant' | 'partners'>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      category: 'customer',
      question: 'HOW DO I REGISTER & SIGN IN?',
      answer: 'Simply dial *384*6180# on any Kenyan mobile network (Safaricom, Airtel, etc.). It works on any analog or smart phone and doesn\'t require any mobile internet data bundle. Once registered via USSD, you can access your web-based wallet by navigating directly to the login page on app.nxnetwork.company, then entering your phone number and the 4-digit PIN you chose.'
    },
    {
      category: 'customer',
      question: 'HOW DO I EARN & USE NX POINTS?',
      answer: 'Whenever you buy FMCG products from participating manufacturers at registered neighborhood shops, you automatically qualify for brand-sponsored rewards added to your phone. You redeem your NX directly at any registered neighborhood shop to pay for your purchases. The shop owner receives the exact absolute money value in cash, while you get standard discounted items.'
    },
    {
      category: 'customer',
      question: 'DO MY CUSTOMER NX POINTS EXPIRE?',
      answer: 'Yes. Customer NX loyalty points expire 2 months (60 days) after they are issued. We recommend redeeming them regularly at your nearest neighborhood kiosk to offset your grocery and basic household purchase invoices.'
    },
    {
      category: 'merchant',
      question: 'WHAT ARE THE SHOP FRANCHISE TIERS?',
      answer: 'Shop operators belong to one of our three certified loyalty levels: \n\n◇ Basic: Standard participating duka with 20% brand-matching rate.\n◇ Certified: Preferred partner shop with an elevated 30% matching rate.\n◇ Hub: Premier partner/warehouse operator receiving maximum 40% matching rate.'
    },
    {
      category: 'merchant',
      question: 'MY POINTS ARE NOT REFLECTING, WHAT SHOULD I DO?',
      answer: 'If safe ledger synchronizations take a moment, close your USSD session and dial *384*6180# again. All transactions are securely audited back-to-back. If they still don\'t show, dial customer care at 0781550151 for instant assistance.'
    },
    {
      category: 'merchant',
      question: 'HOW DO RE-STOCK REDEMPTIONS WORK?',
      answer: 'For restock orders compiled through our hub networks, merchants can redeem up to 60% of their accumulated settlement pools as a direct discount on their incoming brand invoices. This helps dukas preserve cash and maximize overall weekly liquidity.'
    },
    {
      category: 'partners',
      question: 'WHO CAN REGISTER AS A LOGISTICS PARTNER?',
      answer: 'Any licensed local transporter or last-mile delivery provider in Nairobi/regional hubs can register on partners.nxnetwork.company. Bids on bulk restocking runs are posted daily. Once approved and whitelisted, you can accept, track, and complete delivery runs.'
    },
    {
      category: 'partners',
      question: 'HOW ARE REGIONAL HUB COMMISSION SHOTS CALCULATED?',
      answer: 'Hub merchants earn 0.2 NX on every transaction processed by their assigned sub-merchants. Commissions are calculated dynamically at the end of each calendar cycle and paid directly to the hub owner\'s verified settlement wallet.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        
        {/* Intro */}
        <div className="border-b border-nx-border pb-8 mb-10 text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-nx-amber mb-3">
            <HelpCircle className="w-4 h-4 text-nx-amber" /> NX Help & Support Desk
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-nx-paper mb-3">
            Support Center
          </h1>
          <p className="text-sm text-nx-muted leading-relaxed">
            How can we assist you today? Search our detailed documentation, choose a category below, or reach out to our team.
          </p>
        </div>

        {/* Search Box */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-nx-muted" />
          </div>
          <input
            type="text"
            placeholder="Search FAQs, features, USSD procedures, or tier mechanics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-nx-card border border-nx-border hover:border-nx-muted focus:border-nx-amber rounded-xl pl-12 pr-6 py-3.5 text-sm outline-none transition-all text-nx-paper placeholder:text-nx-muted/50"
          />
        </div>

        {/* Category Selector Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {[
            { id: 'all', label: 'All Resources' },
            { id: 'customer', label: 'Customers' },
            { id: 'merchant', label: 'Duka Shops' },
            { id: 'partners', label: 'Logistics & Hubs' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id as any);
                setOpenIndex(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                activeCategory === cat.id 
                  ? 'bg-nx-amber text-nx-ink border-nx-amber font-semibold' 
                  : 'bg-nx-card text-nx-muted border-nx-border hover:border-nx-muted'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordions */}
        <div className="space-y-3 mb-16">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div 
                  key={index} 
                  className="bg-nx-card2 border border-nx-border rounded-xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-nx-card transition-colors focus:outline-none"
                  >
                    <span className="text-sm font-medium tracking-tight text-nx-paper leading-normal">
                      {faq.question}
                    </span>
                    <div className="p-1 rounded-md border border-nx-border bg-nx-card text-nx-muted shrink-0 ml-4">
                      {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1.5 border-t border-nx-border text-sm text-nx-muted leading-relaxed whitespace-pre-wrap select-text">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-nx-card2 border border-nx-border rounded-xl text-nx-muted text-sm">
              No results found matching your search. Try other keywords or choose "All Resources".
            </div>
          )}
        </div>

        {/* Contact Support Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          
          {/* Support Item 1 */}
          <div className="bg-nx-card border border-nx-border rounded-xl p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="p-2 bg-nx-amber/10 border border-nx-amber/20 text-nx-amber rounded-lg w-fit">
                <Smartphone className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-nx-paper">USSD Portal</h3>
              <p className="text-xs text-nx-muted leading-relaxed">
                Connect and trade offline anytime. No internet connection is required.
              </p>
            </div>
            <div className="font-mono text-lg font-bold text-nx-green mt-6">
              *384*6180#
            </div>
          </div>

          {/* Support Item 2 */}
          <div className="bg-nx-card border border-nx-border rounded-xl p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="p-2 bg-nx-amber/10 border border-nx-amber/20 text-nx-amber rounded-lg w-fit">
                <Phone className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-nx-paper">Direct Hotline</h3>
              <p className="text-xs text-nx-muted leading-relaxed">
                Speak directly with an NX retail representative for instant resolution.
              </p>
            </div>
            <div className="mt-6 space-y-1">
              <a href="tel:0781550151" className="text-sm font-mono font-bold text-nx-amber hover:underline block">
                0781550151
              </a>
              <div className="flex items-center gap-1.5 text-[10px] text-nx-muted font-medium">
                <Clock className="w-3 h-3" /> Mon-Fri, 8AM - 5PM
              </div>
            </div>
          </div>

          {/* Support Item 3 */}
          <div className="bg-nx-card border border-nx-border rounded-xl p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="p-2 bg-nx-amber/10 border border-nx-amber/20 text-nx-amber rounded-lg w-fit">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-nx-paper">Email Support</h3>
              <p className="text-xs text-nx-muted leading-relaxed">
                Reach out to our operations team for upgrades, partnerships or corporate billing.
              </p>
            </div>
            <div className="mt-6">
              <a href="mailto:info@nxnetwork.company" className="text-sm font-mono font-bold text-nx-amber hover:underline block truncate">
                info@nxnetwork.company
              </a>
              <div className="text-[10px] text-nx-muted font-medium mt-1">
                Response within 24 hours
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Mini Footer */}
      <footer className="py-12 border-t border-nx-border bg-nx-card2 mt-20">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-nx-muted font-medium">
          <div>&copy; 2026 NX Network Kenya. All rights reserved.</div>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-nx-paper transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-nx-paper transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
