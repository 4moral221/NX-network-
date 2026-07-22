import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Menu, X, ArrowUpRight, Smartphone, ShoppingCart, Wallet, CheckCircle2, ArrowRight, BarChart3, ShieldCheck, Activity, Users, Phone, Cpu, Zap, Truck, Layers, MessageSquare, Send, Play, Pause, RefreshCw, FileText, ChevronDown, ChevronUp, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import { getPortalLink, PORTAL_URLS } from '@/src/lib/constants';
import { QRCodeSVG } from 'qrcode.react';
import NXLogo from '../../components/NXLogo';
import { LazyLoadSection } from '../../components/LazyLoadSection';
const UssdDemo = lazy(() => import('@/src/components/UssdDemo'));

import dukaMerchantImg from '@/src/assets/images/duka_merchant_1783441965415.jpg';
import nxCustomerImg from '@/src/assets/images/nx_customer_1783441980207.jpg';

const UssdDemoPlaceholder = () => (
  <div className="w-full max-w-[320px] aspect-[9/16] bg-[#0c0f1d] border border-white/5 rounded-3xl p-6 flex flex-col justify-between items-center animate-pulse">
    <div className="w-full flex justify-between items-center opacity-30">
      <div className="w-4 h-4 rounded-full bg-white/20" />
      <div className="w-16 h-3 rounded-full bg-white/20" />
      <div className="w-4 h-4 rounded-full bg-white/20" />
    </div>
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="w-10 h-10 rounded-full border-2 border-nx-amber/20 border-t-nx-amber animate-spin" />
      <div className="text-[9px] font-mono tracking-widest text-nx-amber uppercase">LOADING DEMO CHUNK...</div>
    </div>
    <div className="w-12 h-1.5 rounded-full bg-white/20 opacity-30" />
  </div>
);

export default function LandingPage() {
  const reducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotion ? true : false;
  const [viewingRole, setViewingRole] = useState<'customer' | 'merchant'>('customer');
  const [isStickyBannerDismissed, setIsStickyBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem('nx_ussd_banner_dismissed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showBrandPortalChoice, setShowBrandPortalChoice] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visitorCount, setVisitorCount] = useState<string>('—');
  const [showUssd, setShowUssd] = useState(false);
  const [restockVolume, setRestockVolume] = useState(50000);
  const [selectedTier, setSelectedTier] = useState<'BASIC' | 'CERTIFIED' | 'HUB'>('BASIC');
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isStoryPlaying, setIsStoryPlaying] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [openSpec, setOpenSpec] = useState<string | null>(null);

  // Waitlist/Newsletter Form States
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [waitlistMessage, setWaitlistMessage] = useState('');

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;

    setWaitlistStatus('submitting');
    setWaitlistMessage('');

    try {
      const emailLower = waitlistEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailLower)) {
        setWaitlistStatus('error');
        setWaitlistMessage('Please enter a valid email address.');
        return;
      }

      // First check if email already exists
      const { data: existing } = await supabase
        .from('waitlist')
        .select('email')
        .eq('email', emailLower)
        .maybeSingle();

      if (existing) {
        setWaitlistStatus('error');
        setWaitlistMessage('This email address is already subscribed to network updates!');
        return;
      }

      const { error } = await supabase.from('waitlist').insert({
        email: emailLower,
        name: '',
        role: 'subscriber',
        subscribed_at: new Date().toISOString()
      });

      if (!error) {
        setWaitlistStatus('success');
        setWaitlistMessage("Thank you for subscribing! You will receive network updates and market insights directly in your inbox.");
        setWaitlistEmail('');
      } else {
        setWaitlistStatus('error');
        setWaitlistMessage(error.message || 'Failed to register. Please check your email and try again.');
      }
    } catch (err: any) {
      setWaitlistStatus('error');
      setWaitlistMessage('Connection error. Please try again.');
    }
  };

  const stories = [
    {
      title: "Mama Sarah's Dukas",
      role: "Duka Merchant",
      location: "Kisauni, Mombasa",
      quote: "NX has changed the way my customers buy and how I restock. By accepting NX rewards, I saved over KES 1,200 on my Unilever flour restock this week alone!",
      metric: "KES 1,200 Restock Savings",
      image: dukaMerchantImg
    },
    {
      title: "Wanjiku Kamau's Household Purchases",
      role: "Loyal Customer",
      location: "Kisauni, Mombasa",
      quote: "I dial *384*6180# every time I buy milk or soap at Mama Sarah's shop. I get 5% cash value back in NX units instantly, which pays for my next tea leaves!",
      metric: "10% Welcome Bonus Earned",
      image: nxCustomerImg
    }
  ];

  useEffect(() => {
    if (!isStoryPlaying) return;
    const interval = setInterval(() => {
      setActiveStoryIndex((prev) => (prev + 1) % stories.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isStoryPlaying, stories.length]);



  const tiers = {
    BASIC: { rate: 0.60, ceiling: 0.20, fee: 0 },
    CERTIFIED: { rate: 0.65, ceiling: 0.30, fee: 500 },
    HUB: { rate: 0.70, ceiling: 0.40, fee: 1000 }
  };

  const calculateSavings = () => {
    const markup = restockVolume * 0.05; // Assuming 5% NX markup on restock
    const pool = markup * tiers[selectedTier].rate;
    const maxRedemption = restockVolume * tiers[selectedTier].ceiling;
    return { pool, maxRedemption };
  };

  const { pool, maxRedemption } = calculateSavings();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (showPrivacy || showHelp || showBrandPortalChoice) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPrivacy, showHelp, showBrandPortalChoice]);

  useEffect(() => {
    // Track visitor with a delay to not block initial render
    const timer = setTimeout(() => {
      const trackVisitor = async () => {
        try {
          let ip = 'unknown';
          try {
            const r = await fetch('https://api.ipify.org?format=json');
            const d = await r.json();
            ip = d.ip;
          } catch (e) {}
          
          await supabase.from('visitors').insert([{ visit_time: new Date().toISOString(), ip_address: ip }]);
          const { count } = await supabase.from('visitors').select('id', { count: 'exact', head: true });
          if (count !== null) setVisitorCount(count.toLocaleString());
        } catch (e) {}
      };
      trackVisitor();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-nx-ink text-nx-paper selection:bg-nx-amber selection:text-nx-ink font-sans">
      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.04]" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")` }} />

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-6 md:px-10 h-16 transition-all duration-300",
        scrolled ? "bg-nx-ink/92 backdrop-blur-xl border-b border-nx-amber/12" : "bg-transparent"
      )}>
          <Link to="/" className="flex items-center gap-3 group">
          <NXLogo size="sm" />
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          {[
            { label: 'How It Works', id: 'how-it-works' },
            { label: 'Features', id: 'features' },
            { label: 'Tiers', id: 'merchant-tiers', spec: 'tiers' },
            { label: 'Mechanics', id: 'loyalty-mechanics', spec: 'mechanics' },
            { label: 'Business Model', id: 'revenue-engine', spec: 'revenue' }
          ].map((item) => (
            <a key={item.label} href={`#${item.id}`} 
               onClick={() => { if (item.spec) setOpenSpec(item.spec); }}
               className="text-[10px] uppercase tracking-[0.15em] text-nx-muted hover:text-nx-paper transition-colors">
              {item.label}
            </a>
          ))}
          <div className="h-4 w-[1px] bg-nx-border" />
          <div className="flex items-center gap-3">
            {[
              { label: 'Customer/Duka PWA', url: getPortalLink('pwa') },
              { label: 'Merchant Hub', url: getPortalLink('hub') },
              { label: 'Partners Portal', onClick: () => setShowBrandPortalChoice(true) },
            ].map((portal) => {
              if ('url' in portal) {
                return (
                  <a 
                    key={portal.label}
                    href={portal.url}
                    className="px-3 py-1.5 border border-nx-amber/30 text-nx-amber text-[9px] uppercase tracking-widest hover:bg-nx-amber hover:text-nx-ink transition-all hover:border-nx-amber"
                  >
                    {portal.label}
                  </a>
                );
              } else {
                return (
                  <button 
                    key={portal.label}
                    onClick={portal.onClick}
                    className="px-3 py-1.5 border border-nx-amber/30 text-nx-amber text-[9px] uppercase tracking-widest hover:bg-nx-amber hover:text-nx-ink transition-all hover:border-nx-amber cursor-pointer bg-transparent"
                  >
                    {portal.label}
                  </button>
                );
              }
            })}
          </div>
        </div>

        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 border border-nx-border hover:border-nx-amber transition-colors">
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-nx-ink/80 backdrop-blur-sm z-[300]"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[min(340px,88vw)] bg-nx-card border-l border-nx-border z-[400] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-nx-border">
                <NXLogo title="Network" size="sm" />
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-nx-muted hover:text-nx-paper transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 py-4 overflow-y-auto">
                <div className="px-6 py-4 text-[9px] uppercase tracking-[0.3em] text-nx-muted">Platform</div>
                {[
                  { label: 'How It Works', id: 'how-it-works' },
                  { label: 'Features', id: 'features' },
                  { label: 'Registration', id: 'registration' },
                  { label: 'Merchant Tiers', id: 'merchant-tiers', spec: 'tiers' },
                  { label: '5 Core SKUs', id: '5-core-skus', spec: 'skus' },
                  { label: 'Loyalty Mechanics', id: 'loyalty-mechanics', spec: 'mechanics' },
                  { label: 'Pool Mechanics', id: 'pool-mechanics', spec: 'solvency' }
                ].map((item) => (
                  <a key={item.label} href={`#${item.id}`} onClick={() => { setIsMenuOpen(false); if (item.spec) setOpenSpec(item.spec as any); }}
                     className="flex items-center justify-between px-6 py-3 text-sm text-nx-paper/70 hover:text-nx-paper hover:bg-nx-amber/5 border-l-2 border-transparent hover:border-nx-amber transition-all">
                    {item.label} <ArrowUpRight className="w-3 h-3 text-nx-muted" />
                  </a>
                ))}

                <div className="px-6 mt-4 py-4 text-[9px] uppercase tracking-[0.3em] text-nx-amber border-t border-nx-border/50">Portals</div>
                {[
                  { label: 'Customer/Duka PWA', url: getPortalLink('pwa') },
                  { label: 'Merchant Hub', url: getPortalLink('hub') },
                  { label: 'Partners Portal', onClick: () => { setIsMenuOpen(false); setShowBrandPortalChoice(true); } }
                ].map((portal) => {
                  if ('url' in portal) {
                    return (
                      <a 
                        key={portal.label} 
                        href={portal.url} 
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between px-6 py-3 text-sm text-nx-paper hover:text-nx-amber hover:bg-nx-amber/5 border-l-2 border-transparent hover:border-nx-amber transition-all"
                      >
                        {portal.label} <ArrowRight className="w-3 h-3 text-nx-muted" />
                      </a>
                    );
                  } else {
                    return (
                      <button 
                        key={portal.label} 
                        onClick={portal.onClick}
                        className="w-full text-left flex items-center justify-between px-6 py-3 text-sm text-nx-paper hover:text-nx-amber hover:bg-nx-amber/5 border-l-2 border-transparent hover:border-nx-amber transition-all bg-transparent focus:outline-hidden cursor-pointer"
                      >
                        {portal.label} <ArrowRight className="w-3 h-3 text-nx-muted" />
                      </button>
                    );
                  }
                })}
              </div>
              <div className="p-6 border-t border-nx-border">
                <div className="p-4 bg-nx-green/5 border border-nx-green/12 rounded-xl text-center">
                  <div className="text-[9px] uppercase tracking-[0.3em] text-nx-green mb-1">Join NX Now</div>
                  <div className="font-display text-2xl tracking-[0.1em] text-nx-green">*384*6180#</div>
                  <div className="text-[11px] text-nx-muted mt-1">Any phone · Any network · Zero data</div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex flex-col justify-center px-6 md:px-10 pt-32 pb-20 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[55%] h-[130%] bg-linear-to-br from-nx-amber/5 to-nx-ember/5 -skew-x-12 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(232,160,32,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(232,160,32,0.035)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-[10px] font-medium tracking-[0.5em] uppercase text-nx-amber mb-8"
        >
          Kenya's Informal Retail Infrastructure
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="font-display text-[clamp(40px,6vw,90px)] leading-[0.95] tracking-tight text-nx-paper mb-9 uppercase"
        >
          ONE NETWORK<br/>FOR DUKA DEMAND,<br/><span className="text-nx-amber italic">RESTOCK &amp; REWARDS.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="font-serif text-[clamp(16px,2vw,22px)] text-nx-paper/70 max-w-2xl leading-relaxed mb-6"
        >
          NX maximizes FMCG sales through real-time granular data, predictive demand intelligence, and streamlined bulk purchase aggregation for informal kiosks and dukas.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="flex flex-col gap-2 mb-8 max-w-xl"
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-nx-amber font-mono font-medium flex items-center gap-2">
            <span>● No App Required</span>
            <span className="text-nx-border">•</span>
            <span>Zero Data Balance Required</span>
            <span className="text-nx-border">•</span>
            <span>Phone Number = Wallet</span>
          </div>
          <p className="text-xs text-nx-muted leading-relaxed">
            NX is purpose-built for Kenya’s informal retail infrastructure, starting with kiosks and dukas in Mombasa to pioneer a self-sustaining <span className="text-nx-amber font-semibold">NX circular economy</span>.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="flex flex-wrap items-center gap-4"
        >
          <button onClick={() => setShowUssd(!showUssd)} className="nx-btn-primary group font-bold tracking-wider">
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            Dial *384*6180# to join
          </button>
          <a href="#contact" className="nx-btn-outline border-nx-amber text-nx-amber hover:bg-nx-amber/10 font-bold tracking-wider">
            Talk to us about partnerships
          </a>
          <a href="#how-it-works" className="nx-btn-outline font-bold tracking-wider">How it works</a>
        </motion.div>

        {/* QR Code Section */}
        <motion.div 
          initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}
          className="mt-12 flex items-center gap-6 p-6 bg-nx-card/50 border border-nx-border rounded-2xl w-fit backdrop-blur-sm"
        >
          <div className="bg-white p-3 rounded-xl flex items-center justify-center shadow-lg">
            <QRCodeSVG 
              value={getPortalLink('pwa') + '/login'} 
              size={96} 
              level="H"
              marginSize={1}
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-nx-amber mb-1">Scan to Launch</div>
            <div className="font-display text-xl text-nx-paper mb-2">Customer/Merchant PWA: /app</div>
            <div className="text-[11px] text-nx-muted leading-relaxed">
              Install the updated NX Network app<br/>directly on your home screen.
            </div>
          </div>
        </motion.div>

        {showUssd && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 bg-nx-green/10 border border-nx-green/30 w-fit flex items-center gap-4"
          >
            <div>
              <div className="text-[10px] text-nx-green uppercase tracking-widest mb-1">Dial this code</div>
              <div className="font-display text-3xl tracking-widest text-nx-green">*384*6180#</div>
            </div>
            <div className="text-[11px] text-nx-muted leading-relaxed">
              Works on Safaricom,<br/>Airtel & Telkom · Zero data
            </div>
          </motion.div>
        )}


      </section>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-y border-nx-border">
        {[
          { label: 'Core SKUs', val: '5' },
          { label: 'First Purchase Earn', val: '10%' },
          { label: 'Franchise Tiers', val: '3' },
          { label: 'Network Uptime', val: '99.9%' },
        ].map((stat, i) => (
          <div key={i} className="p-8 md:p-10 border-r border-nx-border last:border-r-0 relative group overflow-hidden">
            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-nx-amber transition-all duration-500 group-hover:w-full" />
            <div className="font-display text-4xl md:text-5xl text-nx-amber mb-2">{stat.val}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-nx-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Strategic Brand Statement Section */}
      <LazyLoadSection className="py-24 px-6 md:px-10 max-w-5xl mx-auto text-center">
        <div className="space-y-8">
          <div className="flex justify-center items-center gap-3 text-[9px] uppercase tracking-[0.4em] text-nx-amber">
            <div className="w-8 h-[1px] bg-nx-amber" /> OUR NORTH STAR <div className="w-8 h-[1px] bg-nx-amber" />
          </div>
          <h2 className="font-display text-[clamp(44px,7vw,96px)] leading-[0.95] tracking-tight text-nx-paper uppercase font-black">
            LOYALTY<br/>FOR EVERY<br/><span className="text-nx-amber italic">DUKA.</span>
          </h2>
          <div className="w-16 h-[1px] bg-nx-border mx-auto" />
          <p className="font-serif text-[clamp(18px,2.5vw,26px)] text-[#b5b3aa]/90 max-w-3xl mx-auto leading-relaxed italic">
            "A USSD loyalty and supply chain network that helps dukas earn more, restock smarter, and give customers instant savings — on any phone."
          </p>
        </div>
      </LazyLoadSection>

      {/* Who NX Is For Section */}
      <LazyLoadSection id="who-nx-is-for" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border scroll-mt-16">
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
          <div className="w-8 h-[1px] bg-nx-amber" /> WHO WE SERVE
        </div>
        <h2 className="font-display text-[clamp(40px,5vw,72px)] leading-none tracking-tight text-nx-paper mb-16 uppercase">
          WHO NX IS FOR.
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Journey 1: Dukas / Retailers */}
          <div className="bg-nx-card p-8 border border-nx-border rounded-2xl flex flex-col justify-between hover:border-nx-amber/30 transition-all">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-nx-amber font-mono font-semibold mb-4">For Retailers</div>
              <h3 className="font-serif text-2xl text-nx-paper mb-4">Dukas &amp; Kiosks</h3>
              <p className="text-sm text-nx-muted leading-relaxed mb-6">
                Restock daily essentials directly, reduce your restock invoice using earned customer rewards, and secure local client loyalty.
              </p>
            </div>
            <div className="pt-6 border-t border-nx-border/50">
              <a 
                href={getPortalLink('pwa')}
                className="block text-center w-full py-3 bg-nx-amber text-nx-ink hover:bg-nx-amber/90 transition-all text-xs font-display tracking-widest uppercase rounded-xl font-bold"
              >
                Restock and earn
              </a>
            </div>
          </div>

          {/* Journey 2: Hubs / Distributors */}
          <div className="bg-nx-card p-8 border border-nx-border rounded-2xl flex flex-col justify-between hover:border-nx-amber/30 transition-all">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-nx-green font-mono font-semibold mb-4">For Distributors</div>
              <h3 className="font-serif text-2xl text-nx-paper mb-4">Hubs</h3>
              <p className="text-sm text-nx-muted leading-relaxed mb-6">
                Manage high-velocity bulk delivery requests, aggregate nearby duka orders, and earn commissions on network transactions.
              </p>
            </div>
            <div className="pt-6 border-t border-nx-border/50">
              <a 
                href={getPortalLink('hub')}
                className="block text-center w-full py-3 bg-nx-green text-nx-ink hover:bg-nx-green/90 transition-all text-xs font-display tracking-widest uppercase rounded-xl font-bold"
              >
                Manage orders and deliveries
              </a>
            </div>
          </div>

          {/* Journey 3: Brands / Partners */}
          <div className="bg-nx-card p-8 border border-nx-border rounded-2xl flex flex-col justify-between hover:border-blue-500/30 transition-all">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-mono font-semibold mb-4">For Brands &amp; FMCGs</div>
              <h3 className="font-serif text-2xl text-nx-paper mb-4">Brands &amp; Partners</h3>
              <p className="text-sm text-nx-muted leading-relaxed mb-6">
                Get real last-mile sell-through velocity maps, run direct duka promotions, and visibility below distributor channels.
              </p>
            </div>
            <div className="pt-6 border-t border-nx-border/50">
              <button 
                onClick={() => setShowBrandPortalChoice(true)}
                className="block text-center w-full py-3 bg-blue-500 text-white hover:bg-blue-600 transition-all text-xs font-display tracking-widest uppercase rounded-xl font-bold cursor-pointer"
              >
                See your duka network
              </button>
            </div>
          </div>

        </div>
      </LazyLoadSection>

      {/* How It Works */}
      <LazyLoadSection id="how-it-works" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border scroll-mt-16">
        <div>
          <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
            <div className="w-8 h-[1px] bg-nx-amber" /> How It Works
          </div>
          <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-none tracking-tight text-nx-paper mb-16">
            THREE STEPS.<br/>ZERO DATA.
          </h2>
          
          <div className="grid md:grid-cols-3 gap-0.5 bg-nx-border">
            {[
              { icon: <Smartphone className="w-8 h-8" />, num: '01', title: 'Register', body: <>Dial <strong className="text-nx-amber">*384*6180#</strong> from any phone on any network. No internet, no app. Register as customer or merchant in under 2 minutes. Your phone number is captured automatically — no typing required.</> },
              { icon: <ShoppingCart className="w-8 h-8" />, num: '02', title: 'Transact', body: <>Buy from a certified NX duka. Earn NX units — 10% on your first purchase, 5% on all purchases after. Redeem instantly at any enrolled kiosk for real discounts. A flat 2 NX service fee applies per confirmed transaction.</> },
              { icon: <Wallet className="w-8 h-8" />, num: '03', title: 'Benefit', body: <>Use NX to cut future purchase costs. Merchants offset restock invoices using accumulated NX — reducing cash outflow every cycle. The more customers transact, the more the merchant's pool grows. Everyone benefits.</> },
            ].map((step, i) => (
              <div key={i} className="bg-nx-ink p-10 hover:bg-nx-card transition-colors group">
                <div className="text-nx-amber mb-6 group-hover:scale-110 transition-transform origin-left">{step.icon}</div>
                <div className="font-display text-7xl text-nx-amber/10 leading-none mb-6 group-hover:text-nx-amber/20 transition-colors">{step.num}</div>
                <h3 className="font-serif text-2xl text-nx-paper mb-4">{step.title}</h3>
                <p className="text-sm text-[#b5b3aa] leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>

          {/* Customer Call to Action */}
          <div className="mt-12 text-center">
            <button 
              onClick={() => { setShowUssd(true); window.scrollTo({top: 0, behavior: 'smooth'}); }} 
              className="nx-btn-primary text-sm px-8 py-4.5 inline-flex items-center gap-3 group font-bold tracking-wider"
            >
              <Smartphone className="w-5 h-5 text-nx-ink shrink-0" />
              Dial *384*6180# to start earning on your next bread or milk purchase
            </button>
          </div>
        </div>
      </LazyLoadSection>

      {/* Demand Aggregation Section */}
      <LazyLoadSection id="demand-aggregation" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border">
        <div>
          <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
            <div className="w-8 h-[1px] bg-nx-amber" /> Demand Aggregation
          </div>
          
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <div className="lg:col-span-5 space-y-6">
              <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.1] tracking-tight text-nx-paper uppercase">
                DEMAND<br/>AGGREGATION<br/>FOR EVERY <span className="text-nx-amber italic">DUKA.</span>
              </h2>
              <p className="font-serif text-lg text-nx-paper/70 leading-relaxed">
                We combine many small duka orders into one powerful demand stream – so retailers buy better, restock faster, and never lose customers to empty shelves.
              </p>
              <div className="p-5 bg-nx-amber/5 border-l-2 border-nx-amber text-xs text-[#b5b3aa] leading-relaxed">
                <strong>Infrastructure means more than points</strong> — NX aggregates duka demand so brands and suppliers can serve them better.
              </div>
            </div>
            
            <div className="lg:col-span-7 space-y-6">
              <div className="grid gap-4">
                <div className="bg-nx-card p-6 rounded-xl border border-nx-border hover:border-nx-amber/20 transition-all">
                  <div className="flex gap-4">
                    <div className="p-3 bg-nx-amber/10 text-nx-amber rounded-lg h-fit">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-sm text-nx-paper mb-1">Better buying power</h4>
                      <p className="text-xs text-nx-muted leading-relaxed">
                        NX groups orders from nearby dukas so they can access better prices, promos, and priority stock they would never get negotiating alone.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-nx-card p-6 rounded-xl border border-nx-border hover:border-nx-amber/20 transition-all">
                  <div className="flex gap-4">
                    <div className="p-3 bg-nx-amber/10 text-nx-amber rounded-lg h-fit">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-sm text-nx-paper mb-1">Reliable restocks</h4>
                      <p className="text-xs text-nx-muted leading-relaxed">
                        By pooling demand, NX helps distributors and FMCGs plan deliveries more efficiently, reducing stock-outs and late deliveries in informal neighborhoods.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-nx-card p-6 rounded-xl border border-nx-border hover:border-nx-amber/20 transition-all">
                  <div className="flex gap-4">
                    <div className="p-3 bg-nx-amber/10 text-nx-amber rounded-lg h-fit">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-sm text-nx-paper mb-1">Smarter inventory</h4>
                      <p className="text-xs text-nx-muted leading-relaxed">
                        Every USSD and PWA order feeds live demand data, helping brands and hubs know what is selling, where, and when – down to the kiosk.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Micro-flow */}
          <div className="border-t border-nx-border pt-12">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-nx-amber mb-8 text-center">How Aggregation Flows</h3>
            <div className="grid md:grid-cols-3 gap-0.5 bg-nx-border">
              <div className="bg-nx-ink p-8 hover:bg-nx-card transition-colors group">
                <div className="text-nx-amber mb-4 font-display text-4xl">01</div>
                <h4 className="font-serif text-lg text-nx-paper mb-2">Dukas Join NX</h4>
                <p className="text-xs text-nx-muted leading-relaxed">
                  Dukas join NX via USSD or the Duka PWA and register their shop.
                </p>
              </div>

              <div className="bg-nx-ink p-8 hover:bg-nx-card transition-colors group">
                <div className="text-nx-amber mb-4 font-display text-4xl">02</div>
                <h4 className="font-serif text-lg text-nx-paper mb-2">Orders are Pooled</h4>
                <p className="text-xs text-nx-muted leading-relaxed">
                  Orders are pooled by area and supplier, so suppliers and FMCGs see a single consolidated demand signal instead of scattered calls and texts.
                </p>
              </div>

              <div className="bg-nx-ink p-8 hover:bg-nx-card transition-colors group">
                <div className="text-nx-amber mb-4 font-display text-4xl">03</div>
                <h4 className="font-serif text-lg text-nx-paper mb-2">Deliveries &amp; Rewards</h4>
                <p className="text-xs text-nx-muted leading-relaxed">
                  Deliveries and rewards flow through hubs, with dukas earning loyalty and access to flexible restock options on every aggregated order.
                </p>
              </div>
            </div>
          </div>

          {/* Settle on Delivery & Proof Quote */}
          <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Cash flow, not credit risk */}
            <div className="p-8 bg-nx-card border border-nx-amber/20 rounded-xl text-left flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-nx-amber mb-3 font-mono font-bold">Payment Handling</div>
                <h4 className="font-serif text-lg text-nx-paper mb-3 font-bold">Cash flow, not credit risk.</h4>
                <p className="text-xs text-[#b5b3aa] leading-relaxed">
                  NX delivers stock and settles on delivery. Earned NX reduces part of the invoice, so dukas restock with less cash out, without taking on open-ended loans.
                </p>
              </div>
            </div>

            {/* Proof Quote */}
            <div className="p-8 bg-nx-card/50 border border-nx-border rounded-xl text-left flex flex-col justify-center">
              <blockquote className="font-serif text-sm text-nx-paper/85 italic leading-relaxed">
                "Over 70% of everyday essentials in Africa move through informal retail – NX makes that demand visible, consolidated, and bankable for the first time."
              </blockquote>
            </div>
          </div>
        </div>
      </LazyLoadSection>

      {/* Venture Thesis & Strategic Architecture Section */}
      <LazyLoadSection id="venture-thesis" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border scroll-mt-16">
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
          <div className="w-8 h-[1px] bg-nx-amber" /> VENTURE THESIS &amp; POSITIONING
        </div>
        <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-none tracking-tight text-nx-paper mb-6 uppercase">
          THE OPERATING LAYER FOR<br/><span className="text-nx-amber italic">INFORMAL RETAIL.</span>
        </h2>
        <p className="font-serif text-lg text-nx-paper/70 leading-relaxed max-w-3xl mb-16">
          Kenya's informal retail sector moves billions in essential goods but remains a major black box below the distributor level. NX Network sits on top as an asset-light, co-operative network—capturing massive last-mile transaction loyalty and supply chain intelligence <span className="text-nx-amber font-semibold">without moving money, holding physical stock, or replacing existing distributors</span>.
        </p>

        {/* Two-Column Grid for Comparative Matrix and Stacked Architecture */}
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-20">
          
          {/* Comparative Matrix Column */}
          <div className="bg-nx-card p-8 border border-nx-border rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-nx-amber/[0.02] rounded-bl-[120px]" />
            <h3 className="font-display text-sm tracking-wider text-nx-amber uppercase mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Market Positioning Matrix
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-nx-border">
                    <th className="pb-4 text-[9px] uppercase tracking-widest text-nx-muted font-mono">Value Dimension</th>
                    <th className="pb-4 text-[9px] uppercase tracking-widest text-nx-muted font-mono text-center">Mobile Money</th>
                    <th className="pb-4 text-[9px] uppercase tracking-widest text-nx-muted font-mono text-center">Trad. Loyalty</th>
                    <th className="pb-4 text-[9px] uppercase tracking-widest text-nx-muted font-mono text-center">Brand Distrib.</th>
                    <th className="pb-4 text-[10px] uppercase tracking-widest text-nx-amber font-mono text-center bg-nx-amber/5 rounded-t-xl px-3 border-t border-x border-nx-amber/25 font-bold">NX Network</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nx-border/40 text-[11px] md:text-xs">
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 font-sans font-semibold text-nx-paper pr-2">Moves Money / capital</td>
                    <td className="py-4 text-center text-nx-green font-semibold">YES</td>
                    <td className="py-4 text-center text-red-500/80 font-semibold">NO</td>
                    <td className="py-4 text-center text-red-500/80 font-semibold">NO</td>
                    <td className="py-4 text-center bg-nx-amber/5 px-3 border-x border-nx-amber/25">
                      <span className="text-red-500/80 font-bold block">NO</span>
                      <span className="text-[8px] text-nx-muted block font-mono mt-0.5">Asset-Light</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 font-sans font-semibold text-nx-paper pr-2">Last-Mile Demand Data</td>
                    <td className="py-4 text-center text-red-500/80 font-semibold">NO</td>
                    <td className="py-4 text-center text-nx-green font-semibold">YES</td>
                    <td className="py-4 text-center text-red-500/80 font-semibold">NO</td>
                    <td className="py-4 text-center bg-nx-amber/5 px-3 border-x border-nx-amber/25">
                      <span className="text-nx-green font-bold block">YES</span>
                      <span className="text-[8px] text-nx-amber block font-mono mt-0.5">Real-Time</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 font-sans font-semibold text-nx-paper pr-2">Accessible via USSD</td>
                    <td className="py-4 text-center text-nx-green font-semibold">YES</td>
                    <td className="py-4 text-center text-red-500/80 font-semibold">NO</td>
                    <td className="py-4 text-center text-red-500/80 font-semibold">NO</td>
                    <td className="py-4 text-center bg-nx-amber/5 px-3 border-x border-nx-amber/25">
                      <span className="text-nx-green font-bold block">YES</span>
                      <span className="text-[8px] text-nx-muted block font-mono mt-0.5">Zero Data</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 font-sans font-semibold text-nx-paper pr-2">Merchant-Customer Loyalty</td>
                    <td className="py-4 text-center text-red-500/80 font-semibold">NO</td>
                    <td className="py-4 text-center text-nx-green font-semibold">YES</td>
                    <td className="py-4 text-center text-red-500/80 font-semibold">NO</td>
                    <td className="py-4 text-center bg-nx-amber/5 px-3 border-x border-b border-nx-amber/25 rounded-b-xl">
                      <span className="text-nx-green font-bold block">YES</span>
                      <span className="text-[8px] text-nx-muted block font-mono mt-0.5">P2P Driven</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-nx-amber/5 border border-nx-amber/20 rounded-xl">
              <p className="text-[11px] text-[#b5b3aa] leading-relaxed">
                <span className="text-nx-amber font-semibold uppercase block text-[10px] tracking-wider mb-1">Key Takeaway</span>
                NX Network sits on top of everyday transactions. Because payments are peer-to-peer between customers and dukas, we capture loyalty metrics and demand telemetry without entering the flow of funds or acquiring licensing overheads.
              </p>
            </div>
          </div>

          {/* Strategic Stack Architecture */}
          <div className="space-y-6">
            <h3 className="font-display text-sm tracking-wider text-nx-green uppercase flex items-center gap-2">
              <Layers className="w-4 h-4" /> Three-Layer Asset-Light Architecture
            </h3>
            
            <div className="space-y-4">
              {[
                {
                  layer: '01',
                  color: 'text-blue-400',
                  title: 'THE NX INTELLIGENCE LAYER (LOYALTY & DATA)',
                  body: 'We capture high-velocity, weekly last-mile sell-through data by SKU, by region, and by kiosk. Brands run targeted customer promotions and demand aggregation with zero structural lag.'
                },
                {
                  layer: '02',
                  color: 'text-nx-amber',
                  title: 'THE TRANSACTION LAYER (USSD & CASH-FLOW)',
                  body: 'A frictionless USSD network running on feature phones. Payments remain entirely cash-based or peer-to-peer mobile money between the buyer and the shop owner. NX holds no money.'
                },
                {
                  layer: '03',
                  color: 'text-nx-green',
                  title: 'THE PHYSICAL LAYER (ROUTE-ONLY ORDERING)',
                  body: 'Dukas route aggregated restock orders through the NX Network directly to existing FMCG brands and distributors. We partner with distributors to amplify their last-mile capacity rather than replacing them.'
                }
              ].map((layer, index) => (
                <div key={index} className="bg-nx-card p-6 border border-nx-border hover:border-nx-amber/20 transition-all rounded-xl flex gap-5 items-start">
                  <div className={cn("font-display text-2xl font-black shrink-0", layer.color)}>
                    {layer.layer}
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-xs text-nx-paper mb-1 tracking-wider uppercase">{layer.title}</h4>
                    <p className="text-xs text-nx-muted leading-relaxed">{layer.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 3-Way Ecosystem Loop */}
        <div className="border-t border-nx-border/50 pt-16">
          <div className="text-center mb-12">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-nx-amber mb-3 font-mono font-bold">THE REWARD ROTATION</h3>
            <h4 className="font-serif text-2xl text-nx-paper">How Every Transaction Enriches the Entire Ecosystem</h4>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Customers (Earn)',
                icon: <Users className="w-6 h-6 text-nx-amber" />,
                body: 'Reduce the squeeze of rising cost of living by earning real value-back units on everyday essential SKUs via offline-friendly USSD.'
              },
              {
                title: 'Merchants (Retain)',
                icon: <Store className="w-6 h-6 text-nx-green" />,
                body: 'Build solid digital customer relationships, boost retention, and use earned pools to automatically lower invoice restock costs.'
              },
              {
                title: 'FMCG Brands (Optimize)',
                icon: <Activity className="w-6 h-6 text-blue-400" />,
                body: 'Eliminate delivery inefficiencies and product stockouts through real-time demand-velocity tracking below the distributor level.'
              }
            ].map((part, i) => (
              <div key={i} className="bg-nx-card p-6 border border-nx-border rounded-xl hover:border-nx-amber/15 transition-all text-center flex flex-col items-center">
                <div className="p-3 bg-nx-ink rounded-full mb-4">{part.icon}</div>
                <h5 className="font-serif text-base text-nx-paper mb-2">{part.title}</h5>
                <p className="text-xs text-[#b5b3aa] leading-relaxed">{part.body}</p>
              </div>
            ))}
          </div>
        </div>
      </LazyLoadSection>

      {/* Registration Details */}
      <LazyLoadSection id="registration" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border">
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
          <div className="w-8 h-[1px] bg-nx-amber" /> Registration
        </div>
        <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-none tracking-tight text-nx-paper mb-12">
          DIAL IN.<br/>DONE.
        </h2>

        {/* Role Toggle Selector */}
        <div className="flex justify-center gap-4 mb-10">
          <button 
            onClick={() => setViewingRole('customer')}
            className={cn(
              "px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-nx-amber cursor-pointer rounded-lg",
              viewingRole === 'customer' 
                ? "bg-nx-amber text-nx-ink ring-2 ring-nx-amber" 
                : "border border-nx-border text-[#b5b3aa] hover:text-nx-paper hover:border-nx-amber"
            )}
            id="toggle-role-customer"
          >
            I am a Customer
          </button>
          <button 
            onClick={() => setViewingRole('merchant')}
            className={cn(
              "px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-nx-amber cursor-pointer rounded-lg",
              viewingRole === 'merchant' 
                ? "bg-nx-amber text-nx-ink ring-2 ring-nx-amber" 
                : "border border-nx-border text-[#b5b3aa] hover:text-nx-paper hover:border-nx-amber"
            )}
            id="toggle-role-merchant"
          >
            I am a Merchant
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 bg-transparent animate-fade-in">
          <div className={cn(
            "bg-nx-card p-10 relative overflow-hidden group rounded-2xl border border-nx-border transition-all duration-500",
            viewingRole === 'customer' ? "ring-2 ring-nx-amber shadow-[0_0_20px_rgba(255,181,71,0.18)] scale-[1.01]" : "opacity-60 hover:opacity-85"
          )}>
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-linear-to-r from-nx-amber to-nx-ember scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            <div className="text-[9px] uppercase tracking-[0.3em] text-nx-amber mb-4">Customer</div>
            <h3 className="font-display text-3xl text-nx-paper mb-8">FIVE STEPS</h3>
            <div className="space-y-6">
              {[
                'Choose language — English or Kiswahili. Saved permanently for your number.',
                'Accept NX terms. We store your phone, name and National ID for loyalty rewards only — never sold.',
                'Enter your full name.',
                'Enter your National ID number — used only if you ever lose your SIM.',
                'Set a 4-digit recovery PIN. Avoid obvious codes like 1234. This is your account recovery key.'
              ].map((text, i) => (
                <div key={i} className="flex gap-4 text-sm text-[#b5b3aa] leading-relaxed">
                  <span className="font-display text-xl text-nx-amber leading-none">0{i+1}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-nx-amber/5 border-l-2 border-nx-amber text-[11px] text-[#b5b3aa] leading-relaxed">
              🔐 <strong>Lost your phone?</strong> Dial *384*6180# from your new SIM → Option 4 → Recover Account. Enter old number, National ID and PIN. Full NX balance transfers instantly.
            </div>
          </div>

          <div className={cn(
            "bg-nx-card p-10 relative overflow-hidden group rounded-2xl border border-nx-border transition-all duration-500",
            viewingRole === 'merchant' ? "ring-2 ring-nx-amber shadow-[0_0_20px_rgba(255,181,71,0.18)] scale-[1.01]" : "opacity-60 hover:opacity-85"
          )}>
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-linear-to-r from-nx-amber to-nx-ember scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            <div className="text-[9px] uppercase tracking-[0.3em] text-nx-amber mb-4">Merchant</div>
            <h3 className="font-display text-3xl text-nx-paper mb-8">TWO PATHS</h3>
            <div className="space-y-8">
              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-nx-green shrink-0" />
                <div className="text-sm leading-relaxed">
                  <strong className="text-nx-paper block mb-1">Whitelisted</strong>
                  <span className="text-[#b5b3aa]">Pre-approved by NX or enrolled by a Hub merchant. Register instantly, receive your merchant code <strong className="text-nx-amber">M######</strong> on the spot. Pool activated, all 5 SKU inventory rows seeded immediately.</span>
                </div>
              </div>
              <div className="flex gap-4">
                <ArrowRight className="w-6 h-6 text-nx-amber shrink-0" />
                <div className="text-sm leading-relaxed">
                  <strong className="text-nx-paper block mb-1">Open Application</strong>
                  <span className="text-[#b5b3aa]">Submit business name, location and National ID. NX reviews within 24 hours. Merchant code arrives via SMS on approval.</span>
                </div>
              </div>
            </div>
            <div className="mt-8 p-4 bg-nx-amber/5 border-l-2 border-nx-amber text-[11px] text-[#b5b3aa] leading-relaxed">
              📦 <strong>On approval:</strong> Pool activated, inventory seeded across all 5 SKUs, velocity-based low stock alerts live.
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="font-display text-4xl tracking-widest text-nx-amber">M######</div>
              <div className="text-[10px] text-[#b5b3aa] leading-tight uppercase tracking-widest">Your unique<br/>merchant code</div>
            </div>
          </div>
        </div>
      </LazyLoadSection>

      {/* Network in Action (Visual Stories & Simulations) */}
      <LazyLoadSection id="network-in-action" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border">
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
          <div className="w-8 h-[1px] bg-nx-amber" /> Network in Action
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
          <div>
            <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-none tracking-tight text-nx-paper">
              REAL PEOPLE.<br/>REAL IMPACT.
            </h2>
            <p className="text-sm text-nx-muted mt-4 max-w-xl">
              Meet the merchants and customers using the NX USSD interface and PWA platform to cut supply chain costs and earn direct rewards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsStoryPlaying(!isStoryPlaying)}
              className="px-4 py-2 border border-nx-border hover:border-nx-amber text-[10px] uppercase tracking-widest text-nx-muted hover:text-nx-paper transition-all flex items-center gap-2 rounded-lg cursor-pointer"
              id="autoplay-stories-btn"
            >
              {isStoryPlaying ? <Pause className="w-3.5 h-3.5 text-nx-amber" /> : <Play className="w-3.5 h-3.5" />}
              {isStoryPlaying ? 'Pause Autoplay' : 'Autoplay'}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left: Cinematic Visual Frame */}
          <div className="lg:col-span-7 relative group rounded-2xl overflow-hidden border border-nx-border bg-nx-card aspect-[3/2] shadow-2xl">
            <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-nx-amber font-mono font-medium">
                Mombasa, KE
              </span>
            </div>

            {/* Slider Images with Fade transition */}
            <div className="w-full h-full relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeStoryIndex}
                  src={stories[activeStoryIndex].image}
                  alt={stories[activeStoryIndex].title}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.05] group-hover:scale-105 transition-transform duration-[10s]"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
            </div>

            {/* Ambient Dark Overlay at bottom for caption legibility */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 flex flex-col justify-end">
              <div className="font-mono text-[10px] text-nx-amber uppercase tracking-widest mb-1">
                {stories[activeStoryIndex].location}
              </div>
              <h4 className="font-display text-xl text-white tracking-wide">
                {stories[activeStoryIndex].title}
              </h4>
            </div>
          </div>

          {/* Right: Editorial Quote & Interactive controls */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full py-2">
            <div className="space-y-8">
              <div className="flex gap-4">
                {stories.map((story, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveStoryIndex(i);
                      setIsStoryPlaying(false);
                    }}
                    className={cn(
                      "pb-2 text-[10px] uppercase tracking-[0.25em] font-bold border-b-2 transition-all cursor-pointer",
                      activeStoryIndex === i
                        ? "border-nx-amber text-nx-amber"
                        : "border-transparent text-nx-muted hover:text-nx-paper"
                    )}
                    id={`story-tab-${i}`}
                  >
                    0{i + 1} / {story.role}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStoryIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="text-nx-amber font-mono text-[11px] uppercase tracking-widest bg-nx-amber/5 border border-nx-amber/20 px-3 py-1.5 rounded w-fit">
                    {stories[activeStoryIndex].metric}
                  </div>
                  <blockquote className="font-serif text-lg text-nx-paper italic leading-relaxed">
                    "{stories[activeStoryIndex].quote}"
                  </blockquote>
                  <div className="text-sm text-nx-muted">
                    — {stories[activeStoryIndex].title} · <span className="text-nx-amber">{stories[activeStoryIndex].role}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </LazyLoadSection>

      <LazyLoadSection id="ussd-simulator" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border scroll-mt-16">
        <h2 className="text-3xl font-display text-white mb-8">USSD Network Simulator</h2>
        <Suspense fallback={<UssdDemoPlaceholder />}>
          <UssdDemo />
        </Suspense>
      </LazyLoadSection>

      {/* Core Blueprints & System Mechanics Accordion Section */}
      <LazyLoadSection id="blueprints" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border scroll-mt-16">
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
          <div className="w-8 h-[1px] bg-nx-amber" /> System Blueprint Specifications
        </div>
        
        <div className="grid lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.1] tracking-tight text-nx-paper uppercase">
              ENGINE BLUEPRINTS &amp;<br/>CORE <span className="text-nx-amber italic">MECHANICS.</span>
            </h2>
            <p className="font-serif text-lg text-nx-paper/70 leading-relaxed">
              Explore the underlying economics, merchant tiers, daily SKUs, and solvency pool models that drive the NX Network. Click any specification card to expand the full technical layout.
            </p>
            <p className="text-sm text-nx-muted leading-relaxed">
              By nesting detailed specifications under simple, responsive controls, the network console minimizes clutter while providing absolute clarity into our technical mechanics.
            </p>
          </div>
          
          <div className="lg:col-span-7 space-y-3">
            {/* Spec 1: Merchant Franchise Tiers */}
            <div id="merchant-tiers" className="border border-nx-border rounded-xl overflow-hidden bg-nx-card">
              <button
                onClick={() => setOpenSpec(openSpec === 'tiers' ? null : 'tiers')}
                className="w-full flex justify-between items-center py-5 px-6 hover:bg-[#141210] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="font-display text-xl text-nx-green/70">01</span>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-nx-paper uppercase">Merchant Franchise Tiers</h3>
                    <p className="text-[10px] text-nx-muted">Basic, Certified, and Hub configurations</p>
                  </div>
                </div>
                <div className="p-1.5 bg-nx-ink rounded-lg text-nx-muted hover:text-nx-amber transition-colors">
                  {openSpec === 'tiers' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openSpec === 'tiers' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-nx-border/50"
                  >
                    <div className="p-6 md:p-8 space-y-6 bg-nx-ink/40">
                      <div className="grid md:grid-cols-3 gap-0.5 bg-nx-border">
                        {[
                          { 
                            name: 'BASIC', fee: 'Free', badge: 'Basic', color: 'muted',
                            rows: [
                              { k: 'Pool Rate', v: '60% of NX markup', c: 'text-nx-amber' },
                              { k: 'Max NX per Txn', v: '20% of sale' },
                              { k: 'Hub Tools', v: 'Not included', c: 'text-nx-muted' },
                              { k: 'Franchise Fee', v: 'None', c: 'text-nx-green' }
                            ],
                            extras: ['Standard loyalty pool from every restock order', 'All 5 SKUs available — USSD restock + low stock alerts', 'Daily summary + invoice settlement via USSD']
                          },
                          { 
                            name: 'CERTIFIED', fee: 'KSH 500', badge: '★ Certified', featured: true, color: 'amber',
                            rows: [
                              { k: 'Pool Rate', v: '65% of NX markup', c: 'text-nx-amber' },
                              { k: 'Max NX per Txn', v: '30% of sale' },
                              { k: 'Hub Tools', v: 'Not included', c: 'text-nx-muted' },
                              { k: 'Franchise Fee', v: 'KSH 500 / month', c: 'text-nx-amber' }
                            ],
                            extras: ['Everything in Basic, plus larger pool and higher NX acceptance ceiling', 'Certified merchant signage — visible NX branding for your duka', 'Priority FMCG pool boosts when available']
                          },
                          { 
                            name: 'HUB', fee: 'KSH 1,000', badge: '◆ Hub', color: 'green',
                            rows: [
                              { k: 'Pool Rate', v: '70% of NX markup', c: 'text-nx-amber' },
                              { k: 'Max NX per Txn', v: '40% of sale' },
                              { k: 'Hub Commission', v: '0.2 NX / sub-txn', c: 'text-nx-green' },
                              { k: 'Franchise Fee', v: 'KSH 1,000 / month', c: 'text-nx-ember' }
                            ],
                            extras: ['Everything in Certified, plus Hub dashboard access', 'Enroll sub-merchants from your USSD menu — they get whitelisted instantly', 'Earn 0.2 NX for every confirmed transaction by your sub-merchants', 'Track sub-merchant network earnings from your Hub dashboard']
                          }
                        ].map((tier, i) => (
                          <div key={i} className={cn(
                            "p-6 relative overflow-hidden transition-colors",
                            tier.featured ? "bg-[#12110e] border-t-2 border-nx-amber" : "bg-nx-card hover:bg-nx-card2"
                          )}>
                            <div className={cn(
                              "inline-block px-2 py-0.5 text-[8px] uppercase tracking-[0.3em] border mb-3",
                              tier.color === 'amber' ? "border-nx-amber/30 text-nx-amber bg-nx-amber/5" :
                              tier.color === 'green' ? "border-nx-green/30 text-nx-green bg-nx-green/5" :
                              "border-nx-border text-nx-muted bg-nx-ink"
                            )}>
                              {tier.badge}
                            </div>
                            <h4 className="font-display text-xl text-nx-paper mb-1">{tier.name}</h4>
                            <div className="text-[10px] text-nx-muted mb-4">Franchise Fee: <span className="text-nx-paper font-bold">{tier.fee}</span></div>
                            
                            <div className="space-y-2 border-y border-nx-border/50 py-4 mb-4">
                              {tier.rows.map((row, j) => (
                                <div key={j} className="flex justify-between text-xs">
                                  <span className="text-nx-muted">{row.k}</span>
                                  <span className={cn("font-bold text-nx-paper", row.c)}>{row.v}</span>
                                </div>
                              ))}
                            </div>

                            <ul className="space-y-2">
                              {tier.extras.map((extra, j) => (
                                <li key={j} className="text-[10px] text-nx-muted leading-relaxed flex gap-2">
                                  <span className="text-nx-amber">•</span>
                                  <span>{extra}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-center pt-2">
                        <a 
                          href="tel:0781550151" 
                          className="text-xs text-nx-muted border-b border-nx-amber/30 pb-1 hover:text-nx-amber hover:border-nx-amber transition-all inline-flex items-center gap-2"
                        >
                          <Phone className="w-4 h-4 text-nx-amber shrink-0" />
                          Call 0781550151 to upgrade to CERTIFIED or HUB this week
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Spec 2: 5 Daily Essential SKUs */}
            <div id="5-core-skus" className="border border-nx-border rounded-xl overflow-hidden bg-nx-card">
              <button
                onClick={() => setOpenSpec(openSpec === 'skus' ? null : 'skus')}
                className="w-full flex justify-between items-center py-5 px-6 hover:bg-[#141210] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="font-display text-xl text-nx-green/70">02</span>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-nx-paper uppercase">5 Daily Essential SKUs</h3>
                    <p className="text-[10px] text-nx-muted">Primary inventory categories tracked</p>
                  </div>
                </div>
                <div className="p-1.5 bg-nx-ink rounded-lg text-nx-muted hover:text-nx-amber transition-colors">
                  {openSpec === 'skus' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openSpec === 'skus' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-nx-border/50"
                  >
                    <div className="p-6 md:p-8 space-y-6 bg-nx-ink/40">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-0.5 bg-nx-border">
                        {[
                          { icon: '🍞', name: 'Bread', code: 'BR', brands: 'Beta · Supa Loaf · Festive · Broadways · Kingsmil · BB · Kenblest · Supermarket' },
                          { icon: '🥛', name: 'Milk', code: 'ML', brands: 'Brookside · Fresha · KCC · Daima · Ilara · Tuzo · Mt Kenya' },
                          { icon: '🍚', name: 'Sugar', code: 'SG', brands: 'Mumias · Kabras · West Kenya · Sony · Sukari Industries' },
                          { icon: '🫙', name: 'Cooking Oil', code: 'CO', brands: 'Elianto · Golden Fry · Rina · Salit · Kapa · Fresh Fri · Pika' },
                          { icon: '🌾', name: 'Maize & Wheat Flour', code: 'F', brands: 'Taifa · Jogoo · Soko · Pembe · Ajab · Hostess · Raha Premium · Ndume · Ndovu' },
                        ].map((sku, i) => (
                          <div key={i} className="bg-nx-card p-6 text-center hover:bg-[#1b1916] transition-colors group relative overflow-hidden">
                            <span className="text-3xl mb-3 block">{sku.icon}</span>
                            <h4 className="font-serif text-sm text-nx-paper mb-1">{sku.name}</h4>
                            <div className="font-display text-[10px] tracking-[0.3em] text-nx-amber">{sku.code}</div>
                            <p className="text-[9px] text-nx-muted mt-2 leading-tight">{sku.brands}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="p-5 bg-nx-card border border-nx-border/50 rounded-xl flex flex-col md:flex-row items-center gap-4">
                        <div className="text-[8px] uppercase tracking-[0.3em] text-nx-muted shrink-0">Smart restock matching</div>
                        <p className="text-xs text-nx-paper leading-relaxed">
                          Dukas can type <span className="text-nx-amber">Pembe 2kg, Brookside 500ml, mafuta 1L</span> or any description, and NX’s smart matching engine finds the correct product SKU automatically.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Spec 3: Reward & Redemption Mechanics */}
            <div id="loyalty-mechanics" className="border border-nx-border rounded-xl overflow-hidden bg-nx-card">
              <button
                onClick={() => setOpenSpec(openSpec === 'mechanics' ? null : 'mechanics')}
                className="w-full flex justify-between items-center py-5 px-6 hover:bg-[#141210] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="font-display text-xl text-nx-green/70">03</span>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-nx-paper uppercase">Reward &amp; Redemption Mechanics</h3>
                    <p className="text-[10px] text-nx-muted">Dynamic customer and merchant value flows</p>
                  </div>
                </div>
                <div className="p-1.5 bg-nx-ink rounded-lg text-nx-muted hover:text-nx-amber transition-colors">
                  {openSpec === 'mechanics' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openSpec === 'mechanics' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-nx-border/50"
                  >
                    <div className="p-6 md:p-8 bg-nx-ink/40">
                      <div className="grid md:grid-cols-2 gap-0.5 bg-nx-border">
                        {[
                          { 
                            label: 'Customers', title: 'EARN & REDEEM', 
                            body: (
                              <div className="space-y-1 text-xs">
                                <p>• <strong className="text-nx-paper">Instant Rewards:</strong> Earn 10% on your first purchase and 5% after at any registered NX duka.</p>
                                <p>• <strong className="text-nx-paper">No-Data USSD:</strong> Claim points on simple phone with zero internet.</p>
                                <p>• <strong className="text-nx-paper">Flat Transact Fee:</strong> Flat fee of 2 NX applies only when redeeming positive balance.</p>
                              </div>
                            ),
                            note: <><strong>Expiry:</strong> Customer balances expire <strong>2 months after issuance</strong>. SMS reminders sent before expiry.</>,
                            highlight: '10% → 5%'
                          },
                          { 
                            label: 'Merchants', title: 'SETTLE SMARTER', 
                            body: (
                              <div className="space-y-1 text-xs">
                                <p>• <strong className="text-nx-paper">Margin-Funded:</strong> Pools funded by NX bulk margins, never cutting retail profit.</p>
                                <p>• <strong className="text-nx-paper">60% Settle Cap:</strong> Offset restock invoices up to 60% using customer-redeemed NX.</p>
                                <p>• <strong className="text-nx-paper">Solvency rules:</strong> Caps keep customer point balances backed by physical inventory value.</p>
                              </div>
                            ),
                            note: <><strong>Pool Health:</strong> If pool utilization exceeds 70%, acceptance rates adjust to protect the ecosystem.</>,
                            highlight: '60% CAP'
                          }
                        ].map((item, i) => (
                          <div key={i} className="bg-nx-card p-6 hover:bg-nx-card2 transition-colors group">
                            <div className="text-[8px] uppercase tracking-[0.3em] text-nx-amber mb-2">{item.label}</div>
                            <h4 className="font-display text-lg text-nx-paper tracking-wider mb-2">{item.title}</h4>
                            <div className="text-nx-muted leading-relaxed mb-4">{item.body}</div>
                            {item.note && (
                              <div className="p-2.5 bg-nx-amber/5 border-l-2 border-nx-amber text-[10px] text-nx-muted leading-relaxed mb-4">
                                {item.note}
                              </div>
                            )}
                            <div className="font-display text-3xl text-nx-green tracking-wider">{item.highlight}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Spec 4: Pool Solvency Rules */}
            <div id="pool-mechanics" className="border border-nx-border rounded-xl overflow-hidden bg-nx-card">
              <button
                onClick={() => setOpenSpec(openSpec === 'solvency' ? null : 'solvency')}
                className="w-full flex justify-between items-center py-5 px-6 hover:bg-[#141210] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="font-display text-xl text-nx-green/70">04</span>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-nx-paper uppercase">Pool Solvency Rules</h3>
                    <p className="text-[10px] text-nx-muted">How spreads back the point system securely</p>
                  </div>
                </div>
                <div className="p-1.5 bg-nx-ink rounded-lg text-nx-muted hover:text-nx-amber transition-colors">
                  {openSpec === 'solvency' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openSpec === 'solvency' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-nx-border/50"
                  >
                    <div className="p-6 md:p-8 space-y-6 bg-nx-ink/40">
                      <div className="bg-nx-card p-6 border border-nx-border/50 rounded-xl">
                        <div className="grid md:grid-cols-4 gap-4">
                          {[
                            { num: '1', title: 'Trading Margin', text: 'Bulk trading spreads are earned supplying duka products.' },
                            { num: '2', title: 'Fund Pool', text: 'Spreads directly fund customer loyalty pool.' },
                            { num: '3', title: 'Brand Boosts', text: 'FMCG partners augment that pool for campaigns.' },
                            { num: '4', title: 'Solvent Settle', text: 'Merchants offset invoice value up to 60% on restock.' }
                          ].map((step, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="font-display text-2xl text-nx-green font-bold">0{step.num}</div>
                              <h5 className="font-sans font-bold text-xs text-nx-paper">{step.title}</h5>
                              <p className="text-[10px] text-nx-muted leading-relaxed">{step.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-nx-card p-6 rounded-xl">
                          <h4 className="text-xs font-mono uppercase tracking-[0.3em] text-nx-amber mb-4">Eco-Outcomes</h4>
                          <div className="space-y-4 text-xs text-nx-muted">
                            <p>• Every restock creates a settlement pool funded by NX bulk trading margins.</p>
                            <p>• Certified merchants accept customer redemptions knowing pools are physically backed.</p>
                          </div>
                          
                          <div className="mt-6">
                            <div className="flex justify-between text-[9px] uppercase tracking-widest text-nx-muted mb-1">
                              <span>Pool utilization example</span>
                              <span>71%</span>
                            </div>
                            <div className="h-1 bg-nx-border rounded-full overflow-hidden">
                              <div className="h-full bg-nx-amber rounded-full w-[71%]" />
                            </div>
                            <div className="flex justify-between text-[9px] text-nx-muted mt-1">
                              <span>Healthy</span>
                              <span className="text-nx-amber">Stressed</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-nx-card p-6 rounded-xl space-y-3 text-xs text-nx-muted">
                          <h4 className="text-xs font-mono uppercase tracking-[0.3em] text-nx-amber">Matching Engine</h4>
                          <p>• Dukas order simply by typing ordinary text via USSD ("20 pembe 2kg"). Our match engine resolves to exact SKUs.</p>
                          <p>• Direct logistics integration routes demands straight to partner hubs, bypassing middlemen.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Spec 5: Interactive Profitability Tool */}
            <div className="border border-nx-border rounded-xl overflow-hidden bg-nx-card">
              <button
                onClick={() => setOpenSpec(openSpec === 'calculator' ? null : 'calculator')}
                className="w-full flex justify-between items-center py-5 px-6 hover:bg-[#141210] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="font-display text-xl text-nx-green/70">05</span>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-nx-paper uppercase">Interactive Profitability Tool</h3>
                    <p className="text-[10px] text-nx-muted">Calculate restock volume, pools, and estimated savings</p>
                  </div>
                </div>
                <div className="p-1.5 bg-nx-ink rounded-lg text-nx-muted hover:text-nx-amber transition-colors">
                  {openSpec === 'calculator' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openSpec === 'calculator' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-nx-border/50"
                  >
                    <div className="p-6 md:p-8 bg-nx-ink/40 space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-nx-card p-6 rounded-xl space-y-6">
                          <div>
                            <label className="block text-[9px] uppercase tracking-widest text-nx-muted mb-3">Select Your Tier</label>
                            <div className="grid grid-cols-3 gap-1">
                              {(['BASIC', 'CERTIFIED', 'HUB'] as const).map((tier) => (
                                <button
                                  key={tier}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTier(tier);
                                  }}
                                  className={cn(
                                    "py-2 text-[9px] uppercase tracking-widest border transition-all",
                                    selectedTier === tier ? "bg-nx-amber text-nx-ink border-nx-amber font-bold" : "bg-nx-ink text-nx-muted border-nx-border hover:border-nx-amber/50"
                                  )}
                                >
                                  {tier}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-[9px] uppercase tracking-widest text-nx-muted mb-3">Monthly Restock Volume</label>
                            <input 
                              type="range" min="10000" max="500000" step="5000"
                              value={restockVolume}
                              onChange={(e) => setRestockVolume(Number(e.target.value))}
                              className="w-full accent-nx-amber bg-nx-border h-1 rounded-full appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between mt-2 font-display text-xl text-nx-paper">
                              <span>KSH {restockVolume.toLocaleString()}</span>
                              <span className="text-nx-muted text-[10px] self-end uppercase tracking-widest">Per Month</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-nx-card p-6 rounded-xl flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="p-4 bg-nx-ink border border-nx-border rounded-lg">
                              <div className="text-[8px] uppercase tracking-widest text-nx-muted mb-1">Estimated Loyalty Pool</div>
                              <div className="font-display text-3xl text-nx-green tracking-wider">{pool.toFixed(0)} NX</div>
                              <div className="text-[9px] text-nx-muted mt-0.5">Funded by NX trading margin</div>
                            </div>
                          </div>
                          
                          <div className="mt-4 p-3 bg-nx-amber/5 border-l-2 border-nx-amber text-[10px] text-nx-muted leading-relaxed">
                            💡 At your volume, switching to <strong>HUB</strong> increases pool by <strong>{((restockVolume * 0.05 * 0.7) - (restockVolume * 0.05 * 0.6)).toFixed(0)} NX</strong>.
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Spec 6: Platform Revenue Engine */}
            <div id="revenue-engine" className="border border-nx-border rounded-xl overflow-hidden bg-nx-card">
              <button
                onClick={() => setOpenSpec(openSpec === 'revenue' ? null : 'revenue')}
                className="w-full flex justify-between items-center py-5 px-6 hover:bg-[#141210] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="font-display text-xl text-nx-green/70">06</span>
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-nx-paper uppercase">Platform Revenue Engine</h3>
                    <p className="text-[10px] text-nx-muted">Spreads, subscriptions, and brand campaign monetization powering the <span className="text-nx-amber font-semibold">NX circular economy</span></p>
                  </div>
                </div>
                <div className="p-1.5 bg-nx-ink rounded-lg text-nx-muted hover:text-nx-amber transition-colors">
                  {openSpec === 'revenue' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openSpec === 'revenue' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-nx-border/50"
                  >
                    <div className="p-6 md:p-8 bg-nx-ink/40">
                      <div className="grid md:grid-cols-3 gap-4">
                        {[
                          { label: 'Primary Revenue', val: '40%', body: <><strong>Trading margin spread.</strong> Dukas route aggregated orders through NX. We negotiate bulk margin spreads with FMCGs/distributors on the order pools. 60–70% funds loyalty pools, and the remainder is platform revenue. Fully asset-light.</> },
                          { label: 'Data & Brand Revenue', val: '↗', body: <><strong>Last-mile sell-through data.</strong> Monthly data fees from FMCG partners who need real-time SKU velocity and kiosk-level trends.</> },
                          { label: 'Fee & Subscriptions', val: '2 NX', body: <><strong>Transaction fee + franchise.</strong> Every txn carries a 2 NX fee. Certified and Hub merchants pay monthly subscription fees.</> }
                        ].map((item, i) => (
                          <div key={i} className="bg-nx-card p-5 rounded-lg border border-nx-border">
                            <div className="text-[8px] uppercase tracking-[0.3em] text-nx-muted mb-2">{item.label}</div>
                            <div className="font-display text-4xl text-nx-amber leading-none mb-3">{item.val}</div>
                            <p className="text-[11px] text-nx-muted leading-relaxed">{item.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </LazyLoadSection>
      {/* Partners */}
      <LazyLoadSection id="partners" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border">
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
          <div className="w-8 h-[1px] bg-nx-amber" /> For Producers
        </div>
        <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-none tracking-tight text-nx-paper mb-16">
          FMCG<br/>PARTNERS.
        </h2>
        <p className="text-base text-nx-muted max-w-xl leading-relaxed mb-12">
          Kenya's informal retail is a black box below the distributor level. NX changes that. Partner with us for real sell-through data and guaranteed shelf presence.
        </p>
        <div className="grid md:grid-cols-3 gap-0.5 bg-nx-border">
          {[
            { icon: <BarChart3 className="w-8 h-8" />, title: 'REAL DATA', body: 'Weekly sell-through by SKU, by kiosk, by region. Demand velocity. Competitive SKU switching. Data that doesn\'t exist below distributor level.', tag: 'Last Mile Intelligence' },
            { icon: <Activity className="w-8 h-8" />, title: 'SHELF PRESENCE', body: 'Your SKU gets priority in NX restock suggestions and velocity alerts. When a merchant gets a low stock warning, your brand is named.', tag: 'Demand Activation' },
            { icon: <Users className="w-8 h-8" />, title: 'POOL INJECTION', body: 'FMCG deals inject NX directly into merchant settlement pools. Bigger pools mean higher customer acceptance rates — more redemptions.', tag: 'Network Effect' }
          ].map((item, i) => (
            <div key={i} className="bg-nx-card p-10 hover:bg-nx-card2 transition-colors group relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-nx-amber transition-all duration-500 group-hover:w-full" />
              <div className="text-nx-amber mb-4">{item.icon}</div>
              <h3 className="font-display text-2xl text-nx-paper tracking-wider mb-3">{item.title}</h3>
              <p className="text-xs text-nx-muted leading-relaxed mb-4">{item.body}</p>
              <div className="inline-block px-2.5 py-0.5 bg-nx-amber/10 border border-nx-amber/20 text-[10px] uppercase tracking-widest text-nx-amber">{item.tag}</div>
            </div>
          ))}
        </div>

        {/* FMCG Partner CTA */}
        <div className="mt-12 text-center bg-blue-500/5 border border-blue-500/20 p-8 rounded-2xl max-w-2xl mx-auto">
          <p className="text-sm text-nx-muted mb-4 font-serif leading-relaxed">
            Want weekly SKU-level sell-through velocity mapping from dukas and kiosks in Mombasa?
          </p>
          <a 
            href="mailto:nxnetwork618@gmail.com?subject=FMCG%20Partnership%20Inquiry" 
            className="nx-btn-primary bg-[#3b82f6] hover:bg-blue-600 text-white text-sm px-8 py-4 inline-flex items-center gap-3 font-bold tracking-wider"
          >
            <Send className="w-5 h-5 text-white shrink-0" />
            Email partners@nxnetwork.company to see kiosk‑level data from Mombasa
          </a>
        </div>
      </LazyLoadSection>


      {/* Always Solvent, Always Secure */}
      <LazyLoadSection id="features" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border scroll-mt-20">
        <div>
          <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
            <div className="w-8 h-[1px] bg-nx-amber" /> System Security & Stability
          </div>
          <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-none tracking-tight text-nx-paper mb-16 uppercase">
            Always Solvent,<br/>Always Secure.
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Cpu className="w-6 h-6 text-nx-amber" />,
                title: "Dynamic Network Throttling",
                plain: "Automatically adjusts earn and redeem rates to keep the loyalty pool solvent so the system can never 'run dry.'",
                tech: "Underlying liquidity pool utilization dynamically adjusts customer earn multipliers (1.0x to 0x) and merchant acceptance steps (20%, 10%, 0%) across threshold targets (<40%, 70%, 90% utilization) to permanently safeguard system solvency."
              },
              {
                icon: <ShieldCheck className="w-6 h-6 text-nx-green" />,
                title: "Hash Integrity & Drift Auditing",
                plain: "Automatic checks ensure merchant balances always match the transaction ledger.",
                tech: "Hardened security filters automatically examine append-only transaction ledger records against cached merchant balances using the system-level audit drift tool, guarding against RLS issues or state-propagation discrepancies."
              },
              {
                icon: <Layers className="w-6 h-6 text-blue-400" />,
                title: "Franchise Tiers Hierarchy",
                plain: "Structured tiers scale your pool rate and acceptance ceiling as your duka grows.",
                tech: "Graduated merchant tiers scale from BASIC (60% Pool Rate, 20% Acceptance Ceiling) to CERTIFIED (65% Rate, 30% Ceiling) up to regional HUB distribution centers (70% Pool Rate, 40% Ceiling with direct warehousing integrations)."
              },
              {
                icon: <Zap className="w-6 h-6 text-[#ffb547]" />,
                title: "FMCG Brand Boost Promotions",
                plain: "Brands inject funds directly into merchant pools to run targeted retail promotions.",
                tech: "Global manufacturers inject direct monetary value (KES) into specific merchant liquidity pools to contract and run SKU-level boost campaigns, incentivizing dukas to push targeted brand inventory directly."
              },
              {
                icon: <Smartphone className="w-6 h-6 text-purple-400" />,
                title: "Dual Web & USSD Interfaces",
                plain: "Runs on USSD for basic phones, with high-fidelity web dashboards for distributor tracking.",
                tech: "Run seamless offline retail workflows over any basic cell device via our unified dial code *384*6180#, backed up by high-fidelity Web dashboards displaying visual geocharts and heatmaps for brand managers."
              },
              {
                icon: <Truck className="w-6 h-6 text-[#ff5e00]" />,
                title: "Smart Demand Compilation",
                plain: "Understands natural orders like '20 pembe 2kg' correctly, resolving them into exact SKUs instantly.",
                tech: "Algorithms automatically group disparate merchant restock orders by spatial proximity and SKU velocity, using smart semantic matching to resolve natural language orders into exact SKU matches across thousands of product variants with 98% accuracy."
              }
            ].map((feat, i) => (
              <div key={i} className="bg-nx-card p-8 border border-nx-border hover:border-nx-amber/40 transition-all rounded-2xl group flex flex-col justify-between">
                <div>
                  <div className="mb-6 p-3 bg-white/[0.03] border border-white/5 w-fit rounded-xl group-hover:bg-nx-amber/5 group-hover:border-nx-amber/12 transition-colors">
                    {feat.icon}
                  </div>
                  <h3 className="font-serif text-lg text-nx-paper mb-3">{feat.title}</h3>
                  <p className="text-xs text-nx-muted leading-relaxed mb-4">{feat.plain}</p>
                  
                  {/* Collapsible Deep Technical Detail */}
                  <details className="mt-4 border-t border-nx-border/30 pt-3 group/details">
                    <summary className="text-[9px] font-display uppercase tracking-widest text-nx-amber cursor-pointer hover:text-nx-paper transition-colors select-none list-none flex items-center justify-between">
                      <span>View Technical Spec</span>
                      <span className="text-nx-muted group-open/details:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 text-xs text-nx-muted leading-relaxed font-sans bg-black/30 p-3 border border-nx-border/20 rounded">
                      {feat.tech}
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>


        </div>
      </LazyLoadSection>

      {/* CTA Section */}
      <LazyLoadSection id="cta-section" className="relative py-24 px-6 md:px-10 text-center overflow-hidden border-y border-nx-border bg-linear-to-br from-[#0f0e0b] to-[#141210]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(232,160,32,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(232,160,32,0.04)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        <div className="relative z-10">
          <div className="text-[10px] uppercase tracking-[0.5em] text-nx-amber mb-5">Start Today — No Smartphone Needed</div>
          <h2 className="font-display text-[clamp(40px,7vw,96px)] leading-[0.92] tracking-wider text-nx-paper mb-8">
            DIAL IN.<br/><span className="text-nx-amber italic">RIGHT NOW.</span>
          </h2>
          <p className="font-serif text-[clamp(15px,2vw,20px)] text-nx-paper/45 max-w-md mx-auto leading-relaxed mb-10">
            Register as a customer or apply as a merchant in under 2 minutes. Any phone, any network, zero data.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <button onClick={() => setShowUssd(true)} className="nx-btn-primary text-sm px-9 py-4">↗ JOIN AS CUSTOMER</button>
            <a href="#contact" className="nx-btn-outline text-sm px-7 py-4">Apply as Merchant</a>
          </div>
          <div className="inline-flex items-center gap-4 px-6 py-4 bg-nx-green/10 border border-nx-green/30">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-nx-green mb-1">Dial this code</div>
              <div className="font-display text-2xl tracking-widest text-nx-green">*384*6180#</div>
            </div>
          </div>
          <div className="mt-4 text-[10px] uppercase tracking-widest text-nx-muted">Works on Safaricom · Airtel · Telkom · Any Kenyan network</div>
        </div>
      </LazyLoadSection>

      {/* Platform FAQ / Deep Dive (Accordions below the fold) */}
      <section id="faq" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border scroll-mt-20">
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
          <div className="w-8 h-[1px] bg-nx-amber" /> Platform FAQ &amp; Deep Dive
        </div>
        <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-none tracking-tight text-nx-paper mb-16 uppercase">
          QUESTIONS &amp;<br/>ANSWERS.
        </h2>

        <div className="max-w-4xl mx-auto space-y-4">
          {[
            {
              id: 0,
              question: "How does the NX pool stay solvent?",
              answer: (
                <div className="space-y-4 text-xs md:text-sm text-[#b5b3aa] leading-relaxed">
                  <p>
                    We cap how much NX each customer can earn per purchase, how much each merchant can redeem per cycle, and how long unredeemed NX can stay active.
                  </p>
                  <p>
                    Behind the scenes, every transaction is logged, hashed, and audited. This lets us match rewards and redemptions against real stock, so the pool never runs ahead of actual business.
                  </p>
                </div>
              )
            },
            {
              id: 1,
              question: "Do dukas get credit?",
              answer: (
                <div className="space-y-4 text-xs md:text-sm text-[#b5b3aa] leading-relaxed">
                  <p>
                    NX delivers stock and settles on delivery, not open-ended loans.
                  </p>
                  <p>
                    Qualified merchants can use their NX pool to offset up to a capped percentage of each invoice per cycle. That means less cash out on restock days, without turning NX into a risky debt product.
                  </p>
                </div>
              )
            },
            {
              id: 2,
              question: "What do brands actually see?",
              answer: (
                <div className="space-y-4 text-xs md:text-sm text-[#b5b3aa] leading-relaxed">
                  <p>
                    FMCG partners see anonymized, kiosk-level demand patterns: what sells, where, and how often. They don’t see individual customer identities.
                  </p>
                  <p>
                    This helps brands plan promotions, stock, and activations without changing how dukas run their day-to-day.
                  </p>
                </div>
              )
            },
            {
              id: 3,
              question: "How do you prevent fraud?",
              answer: (
                <div className="space-y-4 text-xs md:text-sm text-[#b5b3aa] leading-relaxed">
                  <p>
                    Every transaction is tied to a registered phone number and duka profile. Suspicious patterns trigger throttling and manual review.
                  </p>
                  <p>
                    Earn and redeem rates can be adjusted per region or product to match real demand and keep the system fair.
                  </p>
                </div>
              )
            },
            {
              id: 4,
              question: "What’s the difference between tiers?",
              answer: (
                <div className="space-y-4 text-xs md:text-sm text-[#b5b3aa] leading-relaxed">
                  <p>
                    Our ecosystem structure features three tailored operational levels:
                  </p>
                  <ul className="space-y-3 list-none pl-0">
                    <li className="flex items-start gap-2.5">
                      <span className="text-nx-amber font-mono text-[10px] uppercase font-bold shrink-0 mt-0.5">• BASIC:</span>
                      <span>Free, standard earn and redeem rates, lower invoice offset caps.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-nx-amber font-mono text-[10px] uppercase font-bold shrink-0 mt-0.5">• CERTIFIED:</span>
                      <span>Subscription, higher pool earn, higher offset caps, priority support.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-nx-green font-mono text-[10px] uppercase font-bold shrink-0 mt-0.5">• HUB:</span>
                      <span>Advanced tools, higher limits, and deeper data for distribution partners.</span>
                    </li>
                  </ul>
                </div>
              )
            }
          ].map((faq) => {
            const isOpen = openFaqIndex === faq.id;
            return (
              <div 
                key={faq.id} 
                className="bg-nx-card border border-nx-border rounded-xl overflow-hidden transition-all duration-300 hover:border-nx-amber/30"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : faq.id)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 select-none hover:text-nx-paper transition-colors focus:outline-hidden"
                >
                  <span className="font-serif text-base md:text-lg text-nx-paper font-semibold tracking-tight">
                    {faq.question}
                  </span>
                  <div className="p-1.5 border border-nx-border rounded-lg bg-nx-ink shrink-0 group-hover:border-nx-amber/40 transition-colors">
                    <svg 
                      className={cn("w-3.5 h-3.5 text-nx-muted hover:text-nx-paper transition-transform duration-300", isOpen && "rotate-45 text-nx-amber")} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </button>
                
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 pt-1 border-t border-nx-border/20">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-6 md:px-10 max-w-6xl mx-auto border-t border-nx-border">
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] text-nx-amber mb-6">
          <div className="w-8 h-[1px] bg-nx-amber" /> Get In Touch
        </div>
        <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-none tracking-tight text-nx-paper mb-16">
          WANT TO<br/>PARTNER?
        </h2>
        <div className="grid md:grid-cols-2 gap-0.5 bg-nx-border">
          <div className="bg-nx-card p-10">
            <div className="text-[9px] uppercase tracking-widest text-nx-muted mb-4">Email</div>
            <a href="mailto:nxnetwork618@gmail.com" className="text-lg text-nx-amber border-b border-nx-amber/30 pb-1 hover:border-nx-amber transition-colors">nxnetwork618@gmail.com</a>
            <p className="text-xs text-nx-muted leading-relaxed mt-4">For FMCG partnerships, merchant tier upgrades, or investor enquiries.</p>
          </div>
          <div className="bg-nx-card p-10">
            <div className="text-[9px] uppercase tracking-widest text-nx-muted mb-4">Phone</div>
            <a href="tel:0781550151" className="text-lg text-nx-amber border-b border-nx-amber/30 pb-1 hover:border-nx-amber transition-colors">0781550151</a>
            <p className="text-xs text-nx-muted leading-relaxed mt-4">Direct support for merchants and partners. Available Mon-Fri, 8am-5pm.</p>
          </div>
          <div className="bg-nx-card p-10 md:col-span-2">
            <div className="text-[9px] uppercase tracking-widest text-nx-muted mb-4">USSD</div>
            <div className="font-display text-2xl tracking-widest text-nx-green">*384*6180#</div>
            <p className="text-xs text-nx-muted leading-relaxed mt-4">For merchant applications, customer registration, and account recovery — all via USSD. No internet required.</p>
          </div>
        </div>
      </section>

      {/* Portal Access Section */}
      <section className="py-20 px-6 md:px-10 border-t border-nx-border bg-nx-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.5em] text-nx-amber mb-10 text-center">Professional Portals</div>
          <div className="grid md:grid-cols-3 gap-6">
            <a href={getPortalLink('hub')} className="group bg-nx-ink border border-nx-border p-8 hover:border-nx-amber transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-nx-amber/10 rounded-lg text-nx-amber">
                  <Users className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-nx-muted group-hover:text-nx-amber transition-colors" />
              </div>
              <h3 className="font-display text-2xl text-nx-paper mb-2">Hub Merchant Portal</h3>
              <p className="text-sm text-nx-muted leading-relaxed">
                Access your network dashboard, manage sub-merchants, and track commissions in real-time.
              </p>
            </a>

            <a href={getPortalLink('fmcgs')} className="group bg-nx-ink border border-nx-border p-8 hover:border-nx-amber transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-nx-green/10 rounded-lg text-nx-green">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-nx-muted group-hover:text-nx-green transition-colors" />
              </div>
              <h3 className="font-display text-2xl text-nx-paper mb-2">FMCG Partners Portal</h3>
              <p className="text-sm text-nx-muted leading-relaxed">
                Monitor SKU velocity, manage pool injections, and access last-mile market intelligence.
              </p>
            </a>

            <a href={getPortalLink('partners')} className="group bg-nx-ink border border-nx-border p-8 hover:border-nx-amber transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-nx-amber/10 rounded-lg text-nx-amber">
                  <Truck className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-nx-muted group-hover:text-nx-amber transition-colors" />
              </div>
              <h3 className="font-display text-2xl text-nx-paper mb-2">Partners Portal</h3>
              <p className="text-sm text-nx-muted leading-relaxed">
                The unified portal for transporters, logistics providers, and regional partners to manage restocking, bid on fulfillment, and coordinate last-mile runs.
              </p>
            </a>
          </div>
        </div>
      </section>



      {/* Newsletter / Network Updates Signup Section */}
      <section className="py-20 px-6 md:px-10 border-t border-nx-border bg-[#030303] relative overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="bg-nx-ink border border-nx-border/80 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
            {/* Glowing accents */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-nx-amber/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-nx-green/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="grid md:grid-cols-5 gap-8 items-center">
              <div className="md:col-span-3 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nx-amber/10 border border-nx-amber/20 text-[10px] text-nx-amber uppercase font-mono tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-nx-amber animate-pulse" />
                  Stay Updated
                </div>
                <h2 className="font-display text-2xl md:text-3xl text-nx-paper font-semibold tracking-tight leading-tight">
                  Subscribe for network updates &amp; market insights
                </h2>
                <p className="text-sm text-nx-muted leading-relaxed max-w-md">
                  Get real-time announcements on network expansions, FMCG reward launches, market intelligence reports, and platform features delivered directly to your inbox.
                </p>
              </div>
              
              <div className="md:col-span-2">
                {waitlistStatus === 'success' ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-2xl bg-nx-green/5 border border-nx-green/30 text-center space-y-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-nx-green/10 flex items-center justify-center mx-auto text-nx-green">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-display text-lg text-nx-paper font-medium">You're subscribed!</h3>
                    <p className="text-xs text-nx-muted leading-relaxed">
                      {waitlistMessage || "Thank you for subscribing. You'll receive real-time network updates and market insights directly in your inbox."}
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="waitlist-email" className="block text-[10px] font-mono uppercase text-nx-muted tracking-wider">
                        Enter your email address
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          id="waitlist-email"
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          className="flex-1 bg-[#050505] border border-nx-border rounded-xl px-4 py-3 text-sm text-nx-paper placeholder:text-nx-muted/60 focus:outline-hidden focus:border-nx-amber focus:ring-1 focus:ring-nx-amber transition-all"
                        />
                        <button
                          type="submit"
                          disabled={waitlistStatus === 'submitting'}
                          className="sm:w-auto bg-nx-amber hover:bg-nx-amber/90 disabled:bg-nx-amber/50 disabled:cursor-not-allowed text-nx-ink font-semibold rounded-xl px-6 py-3 text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
                        >
                          {waitlistStatus === 'submitting' ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Subscribing...
                            </>
                          ) : (
                            <>
                              Subscribe
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {waitlistStatus === 'error' && (
                      <p className="text-xs text-red-400 font-medium">{waitlistMessage}</p>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="py-20 px-6 md:px-10 border-t border-nx-border bg-[#050505]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <NXLogo title="Network" size="sm" />
            </Link>
            <div className="border-l-2 border-nx-amber/40 pl-4 py-1.5 bg-nx-card/10 rounded-r-xl border-y border-r border-nx-border/50 p-4 mb-8">
              <p className="text-sm text-nx-muted max-w-sm leading-relaxed">
                Kenya's premier B2B informal retail network, maximizing <span className="text-nx-paper font-semibold border-b border-nx-amber/30">sales through data</span>, driving <span className="text-nx-paper font-semibold border-b border-nx-amber/30">predictive demand intelligence</span>, and streamlining <span className="text-nx-paper font-semibold border-b border-nx-amber/30">bulk purchase aggregation</span> for local dukas and FMCG brands.
              </p>
            </div>
          </div>
          
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-nx-amber mb-6">Support</div>
            <ul className="space-y-4">
              <li>
                <Link 
                  to="/help"
                  className="text-sm text-nx-muted hover:text-nx-paper transition-colors cursor-pointer text-left bg-transparent border-none p-0 focus:outline-hidden block"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  className="text-sm text-nx-muted hover:text-nx-paper transition-colors block"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy"
                  className="text-sm text-nx-muted hover:text-nx-paper transition-colors cursor-pointer text-left bg-transparent border-none p-0 focus:outline-hidden block"
                >
                  Privacy Policy
                </Link>
              </li>
              <li><a href="tel:0781550151" className="text-sm text-nx-amber font-bold">0781550151</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-nx-amber mb-6">Portals</div>
            <ul className="space-y-4">
              <li>
                <a href={getPortalLink('pwa')} className="flex items-center gap-2 text-sm text-nx-muted hover:text-nx-amber transition-colors group">
                  Customer/Duka PWA <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a href={getPortalLink('hub')} className="flex items-center gap-2 text-sm text-nx-muted hover:text-nx-amber transition-colors group">
                  Hub Merchant Portal <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a href={getPortalLink('fmcgs')} className="flex items-center gap-2 text-sm text-nx-muted hover:text-nx-amber transition-colors group">
                  FMCG Partners Portal <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a href={getPortalLink('partners')} className="flex items-center gap-2 text-sm text-nx-muted hover:text-nx-amber transition-colors group">
                  Partners Portal <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-nx-amber mb-6">Developers</div>
            <ul className="space-y-4">
              <li>
                <Link to="/docs" className="flex items-center gap-2 text-sm text-nx-muted hover:text-nx-amber transition-colors group">
                  API Overview <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/docs/logistics" className="flex items-center gap-2 text-sm text-nx-muted hover:text-nx-amber transition-colors group">
                  Logistics API <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/docs/sales-analytics" className="flex items-center gap-2 text-sm text-nx-muted hover:text-nx-amber transition-colors group">
                  Sales Analytics API <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-nx-border/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[10px] text-nx-muted uppercase tracking-widest">© 2026 NX Network · Building Africa's Transaction Future</div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-6 select-text overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacy(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-2xl bg-nx-card border border-nx-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] z-10"
              style={{ touchAction: 'pan-y' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-nx-border">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-nx-amber" />
                  <div>
                    <h3 className="font-display text-lg text-nx-paper uppercase tracking-wider font-bold">Privacy Policy</h3>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-nx-muted font-mono">NX Network Kenya</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPrivacy(false)} 
                  className="p-2 border border-nx-border hover:border-nx-amber text-nx-muted hover:text-nx-paper transition-all cursor-pointer rounded-lg bg-transparent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 font-sans text-sm text-nx-muted leading-relaxed select-text">
                
                {/* Section 1 */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-nx-amber mb-2 flex items-center gap-2">
                    <span className="text-xs">01//</span> Our Promise
                  </div>
                  <p>
                    NX Network Kenya connects retail shops (dukas) directly with FMCG brands to pass manufacturer savings straight to you and your neighborhood. We believe your shop data and phone numbers are personal, and we promise to protect them in compliance with the Kenyan Data Protection Act.
                  </p>
                </div>

                {/* Section 2 */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-nx-amber mb-2 flex items-center gap-2">
                    <span className="text-xs">02//</span> What we collect and why
                  </div>
                  <p className="mb-3">
                    We collect only the essential details needed to process rewards, savings, and restocks:
                  </p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2">
                      <span className="text-nx-amber font-mono">◇</span> 
                      <span><strong>For Local Shops (Dukas):</strong> We save your phone number, shop name, location, and restock orders so we can confirm your shop's eligibility for direct brand discounts.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-nx-amber font-mono">◇</span> 
                      <span><strong>For Customers:</strong> We keep your phone number and record the points you earn so you can redeem them easily for real cashback.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-nx-amber font-mono">◇</span> 
                      <span><strong>For Brands:</strong> We track overall performance to match manufacturer deals with real demand. We never sell your personal information to anyone.</span>
                    </li>
                  </ul>
                </div>

                {/* Section 3 */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-nx-amber mb-2 flex items-center gap-2">
                    <span className="text-xs">03//</span> USSD Dialing & Web Data
                  </div>
                  <p>
                    Because our primary service runs directly on any simple phone via USSD <strong>*384*6180#</strong>, you do not need internet bundles to dial us or claim your points. We do not use annoying browser cookies to follow you around the web. When you log into our web portal, we only remember your current session so you remain safely logged in.
                  </p>
                </div>

                {/* Section 4 */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-nx-amber mb-2 flex items-center gap-2">
                    <span className="text-xs">04//</span> Keeping Your Points Safe
                  </div>
                  <p>
                    We check and audit all point balances regularly to prevent any system mistakes. When showing brand performance to manufacturers, everything is reported in clean, transparent amounts in Kenyan Shillings (KES) so there is no confusion.
                  </p>
                </div>

                {/* Section 5 */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-nx-amber mb-2 flex items-center gap-2">
                    <span className="text-xs">05//</span> You are in Control
                  </div>
                  <p>
                    You have full ownership of your shop and savings. You can request to view all your stored transactions, update your phone profile, delete your information, or stop receiving manufacturer deals at any time. Just reach out to us.
                  </p>
                </div>

                {/* Footer Section */}
                <div className="border-t border-nx-border pt-4 text-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-nx-muted">
                    Support: compliance@nxnetwork.company · Customer Care: 0781550151
                  </span>
                </div>

              </div>

              {/* Close Action */}
              <div className="px-6 py-4 bg-black/40 border-t border-nx-border flex justify-end">
                <button 
                  onClick={() => setShowPrivacy(false)}
                  className="px-5 py-2.5 bg-nx-amber text-nx-ink font-display text-[10px] font-bold uppercase tracking-wider hover:bg-nx-amber/90 transition-all cursor-pointer rounded-xl"
                >
                  Understood & Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Center Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-6 select-text overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-2xl bg-nx-card border border-nx-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] z-10"
              style={{ touchAction: 'pan-y' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-nx-border">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-nx-amber" />
                  <div>
                    <h3 className="font-display text-lg text-nx-paper uppercase tracking-wider font-bold">Help Center</h3>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-nx-muted font-mono">NX Network Kenya · Support Desk</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHelp(false)} 
                  className="p-2 border border-nx-border hover:border-nx-amber text-nx-muted hover:text-nx-paper transition-all cursor-pointer rounded-lg bg-transparent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic Friendly FAQ Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 font-sans text-sm text-nx-muted leading-relaxed select-text">
                
                {/* Q1 */}
                <div className="bg-nx-card2 border border-nx-border rounded-xl p-5 space-y-2">
                  <h4 className="font-display text-base tracking-wider text-nx-paper uppercase font-bold flex items-center gap-2">
                    <span className="text-nx-amber">Q//</span> HOW DO I REGISTER & SIGN IN?
                  </h4>
                  <p>
                    <strong>For everyone:</strong> Simply dial <span className="text-nx-amber font-bold">*384*6180#</span> on any Kenyan mobile network (Safaricom, Airtel, etc.). It works on any analog or smart phone and doesn't require any mobile internet data bundle. 
                  </p>
                  <p>
                    <strong>Web/PWA login:</strong> Once registered via USSD, you can access your web-based wallet by scanning the QR Code on our landing page or navigating directly to the login page, then entering your phone number and the 4-digit PIN you chose.
                  </p>
                </div>

                {/* Q2 */}
                <div className="bg-nx-card2 border border-nx-border rounded-xl p-5 space-y-2">
                  <h4 className="font-display text-base tracking-wider text-nx-paper uppercase font-bold flex items-center gap-2">
                    <span className="text-nx-amber">Q//</span> HOW DO I EARN & USE NX POINTS?
                  </h4>
                  <p>
                    <strong>Earning Points:</strong> Whenever you buy FMCG products from participating manufacturers at registered neighborhood shops, you automatically qualify for brand-sponsored rewards added to your phone.
                  </p>
                  <p>
                    <strong>Redeeming Cash:</strong> You redeem your NX directly at any registered neighborhood shop to pay for your purchases. The shop owner receives the exact absolute money value in cash, while you get standard discounted items.
                  </p>
                </div>

                {/* Q3 */}
                <div className="bg-nx-card2 border border-nx-border rounded-xl p-5 space-y-2">
                  <h4 className="font-display text-base tracking-wider text-nx-paper uppercase font-bold flex items-center gap-2">
                    <span className="text-nx-amber">Q//</span> WHAT ARE THE SHOP FRANCHISE TIERS?
                  </h4>
                  <p className="mb-2">
                    Shop operators belong to one of our three certified loyalty levels:
                  </p>
                  <ul className="space-y-1 list-none pl-0">
                    <li className="flex gap-2">
                      <span className="text-nx-amber font-mono">◇</span> 
                      <span><strong>Basic:</strong> Standard participating duka with 60% brand-matching rate.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-nx-amber font-mono">◇</span> 
                      <span><strong>Certified:</strong> Preferred partner shop with an elevated 65% matching rate.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-nx-amber font-mono">◇</span> 
                      <span><strong>Hub:</strong> Premier partner/warehouse operator receiving maximum 70% matching rate.</span>
                    </li>
                  </ul>
                </div>

                {/* Q4 */}
                <div className="bg-nx-card2 border border-nx-border rounded-xl p-5 space-y-2">
                  <h4 className="font-display text-base tracking-wider text-nx-paper uppercase font-bold flex items-center gap-2">
                    <span className="text-nx-amber">Q//</span> MY POINTS ARE NOT REFLECTING, WHAT SHOULD I DO?
                  </h4>
                  <p>
                    If safe ledger synchronizations take a moment, close your USSD session and dial <span className="text-nx-amber font-bold">*384*6180#</span> again. All transactions are securely audited back-to-back. If they still don't show, dial customer care at <strong>0781550151</strong> for instant assistance.
                  </p>
                </div>

                {/* Support Contact */}
                <div className="border-t border-nx-border pt-4 text-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-nx-muted">
                    Compliance: compliance@nxnetwork.company · Customer Line: 0781550151
                  </span>
                </div>

              </div>

              {/* Close Action */}
              <div className="px-6 py-4 bg-black/40 border-t border-nx-border flex justify-end">
                <button 
                  onClick={() => setShowHelp(false)}
                  className="px-5 py-2.5 bg-nx-amber text-nx-ink font-display text-[10px] font-bold uppercase tracking-wider hover:bg-nx-amber/90 transition-all cursor-pointer rounded-xl"
                >
                  Close Help Desk
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Brand & FMCG Portal Choice Modal */}
      <AnimatePresence>
        {showBrandPortalChoice && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-6 select-text overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowBrandPortalChoice(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-[440px] bg-[#0f0e0c]/98 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] z-10"
              style={{ touchAction: 'pan-y' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0e0d0b]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Layers className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm text-white uppercase tracking-wider font-extrabold">SELECT PORTAL</h3>
                    <div className="text-[8px] uppercase tracking-[0.2em] text-[#8e8d8b] font-mono">NX Network Kenya · Enterprise Gateway</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBrandPortalChoice(false)} 
                  className="p-1.5 border border-white/10 hover:border-white/25 text-[#8e8d8b] hover:text-white transition-all cursor-pointer rounded-lg bg-[#141210]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selection Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 font-sans text-sm text-[#8e8d8b] leading-relaxed select-text bg-[#0f0e0c]">
                <p className="text-xs text-[#8e8d8b] mb-4 text-center">
                  Please select which enterprise portal interface you would like to access:
                </p>

                <div className="space-y-4">
                  {/* FMCGs Portal */}
                  <a 
                    href={getPortalLink('fmcgs')}
                    onClick={() => setShowBrandPortalChoice(false)}
                    className="group bg-[#151412] border border-white/5 hover:border-blue-500/30 p-5 rounded-xl text-left transition-all duration-300 flex items-start gap-4 hover:bg-blue-500/[0.02]"
                  >
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl shrink-0 group-hover:scale-105 transition-all">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display text-xs tracking-wider text-white uppercase font-extrabold group-hover:text-blue-400 transition-colors">
                        FMCGS PORTAL
                      </h4>
                      <p className="text-[11px] text-[#8e8d8b] leading-relaxed mt-1.5">
                        Access real-time duka sales dashboards, SKU-level maps, and directly inject pool promo boosts.
                      </p>
                      <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-blue-400 flex items-center gap-1.5 mt-3">
                        ACCESS FMCGS <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </a>

                  {/* Partners Portal */}
                  <a 
                    href={getPortalLink('partners')}
                    onClick={() => setShowBrandPortalChoice(false)}
                    className="group bg-[#151412] border border-white/5 hover:border-nx-amber/30 p-5 rounded-xl text-left transition-all duration-300 flex items-start gap-4 hover:bg-nx-amber/[0.02]"
                  >
                    <div className="p-3 bg-nx-amber/10 text-nx-amber rounded-xl shrink-0 group-hover:scale-105 transition-all">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display text-xs tracking-wider text-white uppercase font-extrabold group-hover:text-nx-amber transition-colors">
                        PARTNERS PORTAL
                      </h4>
                      <p className="text-[11px] text-[#8e8d8b] leading-relaxed mt-1.5">
                        The unified portal for transporters, logistics providers, and regional partners to coordinate restocking and last-mile runs.
                      </p>
                      <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-nx-amber flex items-center gap-1.5 mt-3">
                        ACCESS PARTNERS <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </a>
                </div>
              </div>

              {/* Close Action */}
              <div className="px-6 py-4 bg-[#0a0908] border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setShowBrandPortalChoice(false)}
                  className="px-5 py-2 border border-white/10 hover:border-white/20 text-[#8e8d8b] hover:text-white font-display text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer rounded-lg bg-[#141210]"
                >
                  CANCEL
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom USSD Banner */}
      <AnimatePresence>
        {!isStickyBannerDismissed && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[550] bg-[#1a1916] border border-nx-amber/40 shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md"
            id="ussd-sticky-banner"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-nx-amber/15 text-nx-amber rounded-lg shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-widest text-nx-amber font-bold mb-0.5">Live Demand Network</div>
                <div className="text-xs text-[#b5b3aa] font-medium leading-tight">Dial <strong className="text-nx-amber font-mono font-bold">*384*6180#</strong> to join the NX network now. Zero internet balance required.</div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              <button 
                onClick={() => {
                  setShowUssd(true);
                  try {
                    localStorage.setItem('nx_ussd_banner_dismissed', 'true');
                  } catch (e) {}
                  setIsStickyBannerDismissed(true);
                }}
                className="px-3 py-1.5 bg-nx-amber hover:bg-nx-amber/90 text-nx-ink font-display text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer rounded"
                id="banner-dial-now"
              >
                Dial Now
              </button>
              <button 
                onClick={() => {
                  try {
                    localStorage.setItem('nx_ussd_banner_dismissed', 'true');
                  } catch (e) {}
                  setIsStickyBannerDismissed(true);
                }}
                className="p-1 text-nx-muted hover:text-nx-paper transition-colors cursor-pointer"
                aria-label="Dismiss USSD banner"
                id="banner-dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
