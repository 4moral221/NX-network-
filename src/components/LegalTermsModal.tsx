import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Shield, CheckCircle2, X, Lock, FileCheck, ArrowRight, BookOpen } from 'lucide-react';

interface LegalTermsModalProps {
  isOpen: boolean;
  type: 'terms' | 'privacy';
  onClose: () => void;
  onAccept: (type: 'terms' | 'privacy') => void;
  isAccepted?: boolean;
}

export default function LegalTermsModal({
  isOpen,
  type,
  onClose,
  onAccept,
  isAccepted = false
}: LegalTermsModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(type);

  // Sync tab with prop type when modal opens
  React.useEffect(() => {
    setActiveTab(type);
  }, [type, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-3xl bg-[#0b0e17] border border-nx-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* BANNER HEADER - DRIBBBLE STYLE */}
          <div className="bg-gradient-to-r from-[#0284c7] via-[#0369a1] to-[#0f172a] p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                {activeTab === 'terms' ? <FileText className="w-6 h-6 text-white" /> : <Shield className="w-6 h-6 text-emerald-300" />}
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-sky-200 uppercase font-bold">NX Network Legal Framework</span>
                <h2 className="text-2xl font-bold tracking-tight">
                  {activeTab === 'terms' ? 'Terms & Conditions' : 'Privacy & Data Protection Policy'}
                </h2>
              </div>
            </div>

            {/* DOCUMENT TYPE SWITCHER TABS */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-white/10 font-mono text-xs">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('terms')}
                  className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'terms'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Terms & Conditions</span>
                </button>
                <button
                  onClick={() => setActiveTab('privacy')}
                  className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'privacy'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Privacy Policy</span>
                </button>
              </div>

              <a
                href={activeTab === 'terms' ? "/terms" : "/privacy"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-sky-100 hover:text-white rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs border border-white/20"
              >
                <span>View Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* DOCUMENT BODY */}
          <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 text-slate-300 text-xs md:text-sm leading-relaxed bg-[#060810]">
            {activeTab === 'terms' ? (
              <div className="space-y-6 font-sans">
                <div className="border-b border-nx-border pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-nx-amber font-bold">Effective Date: July 2026 | Version 2.4-NX</span>
                  <h3 className="text-lg font-mono font-bold text-white uppercase mt-1">USER AGREEMENT FOR PARTNERS & FMCGs</h3>
                  <p className="text-xs text-nx-muted mt-2">
                    This User Agreement ("Agreement") is a binding legal contract between your registered organization ("Partner", "Brand", or "Wholesaler") and NX Network Inc. ("NX", "we", "us"). By registering an account, obtaining API credentials, or conducting restock distribution through the NX platform, you acknowledge that you have read, understood, and agreed to be bound by these terms.
                  </p>
                </div>

                <div className="space-y-4">
                  <section className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-2">
                    <h4 className="font-mono font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-nx-amber/20 text-nx-amber text-[10px]">01</span>
                      Registration & Entity Verification
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      All registered partners must provide valid commercial registration details, verified business contact information, and designated financial routing channels. NX reserves the right to suspend accounts that fail secondary compliance vetting or provide falsified entity metrics.
                    </p>
                  </section>

                  <section className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-2">
                    <h4 className="font-mono font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-nx-amber/20 text-nx-amber text-[10px]">02</span>
                      Wholesale Restock SLA & Order Fulfillment
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Partners who accept restock orders from micro-retailers (dukas) agree to fulfill and dispatch orders within the designated SLA window (standard 24 hours). Settlement allocations are released into the Partner NX Wallet upon physical dropoff confirmation verified via duka USSD receipt.
                    </p>
                  </section>

                  <section className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-2">
                    <h4 className="font-mono font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-nx-amber/20 text-nx-amber text-[10px]">03</span>
                      API Governance & Token Security
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      API Keys and JWT bearer tokens generated within the Partner Portal are strictly confidential. Partners must not store plaintext keys in public client applications or share credentials across unauthorized third parties. Abuse of endpoint rate limits will trigger automated IP revocation.
                    </p>
                  </section>

                  <section className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-2">
                    <h4 className="font-mono font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-nx-amber/20 text-nx-amber text-[10px]">04</span>
                      Margin Contributions & Pool Governance
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      FMCG Brand partners participating in retail margin pools agree to fund allocated pools prior to launching promotional cash-back campaigns. Unused margin balances remain held in escrow and may be reclaimed or reassigned at the brand's discretion.
                    </p>
                  </section>

                  <section className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-2">
                    <h4 className="font-mono font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-nx-amber/20 text-nx-amber text-[10px]">05</span>
                      Limitation of Liability & Indemnification
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      NX Network provides logistics matching, order aggregation, and USSD payment routing "as is". NX shall not be liable for indirect commercial damages, logistics carrier delays beyond system control, or force majeure events impacting physical transit.
                    </p>
                  </section>
                </div>
              </div>
            ) : (
              <div className="space-y-6 font-sans">
                <div className="border-b border-nx-border pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Data Governance Standard | Version 2.4-NX</span>
                  <h3 className="text-lg font-mono font-bold text-white uppercase mt-1">PRIVACY & DATA PROTECTION POLICY</h3>
                  <p className="text-xs text-nx-muted mt-2">
                    NX Network Inc. is committed to protecting the privacy and commercial confidentiality of all ecosystem participants. This Privacy Policy details how we collect, process, and safeguard data in compliance with the Kenya Data Protection Act 2019 and international encryption protocols.
                  </p>
                </div>

                <div className="space-y-4">
                  <section className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-2">
                    <h4 className="font-mono font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">01</span>
                      Data Collection & Scope
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      We collect business contact information, corporate registration metadata, SKU catalog pricing, and transaction history required for order fulfillment and USSD settlement. We do not sell or monetize raw partner operational records to external marketing entities.
                    </p>
                  </section>

                  <section className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-2">
                    <h4 className="font-mono font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">02</span>
                      Cryptographic Protection & Storage
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      All sensitive partner credentials, passwords, and access PINs are salted and hashed using pgcrypto SHA-256 and bcrypt algorithms. Operational databases are protected by strict Row-Level Security (RLS) policies ensuring cross-tenant isolation.
                    </p>
                  </section>

                  <section className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-2">
                    <h4 className="font-mono font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">03</span>
                      Anonymized Analytics & Aggregation
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Macro demand board metrics displayed to logistics carriers and FMCG brand dashboards represent aggregated, anonymized duka velocity data. Individual merchant identities and specific store locations are masked to prevent uncompetitive targeting.
                    </p>
                  </section>

                  <section className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-2">
                    <h4 className="font-mono font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">04</span>
                      Data Retention & Account Deletion
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Partners may request complete deletion or exportation of their corporate profile and SKU catalog. Financial transaction audit logs are retained for a mandatory period of 7 years in accordance with tax and financial compliance regulations.
                    </p>
                  </section>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="p-6 bg-[#0a0d1a] border-t border-nx-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-nx-muted">
              <BookOpen className="w-4 h-4 text-nx-amber" />
              <span>Please review all sections before accepting.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-nx-border text-xs font-mono font-bold text-nx-muted hover:text-white hover:border-white/40 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onAccept(activeTab);
                  onClose();
                }}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-nx-amber text-black text-xs font-mono font-bold hover:bg-nx-amber/90 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I Agree &amp; Accept {activeTab === 'terms' ? 'Terms' : 'Privacy Policy'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
