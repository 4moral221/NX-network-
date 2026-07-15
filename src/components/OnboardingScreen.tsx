import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Smartphone, ShieldCheck, Truck, BarChart3, ChevronRight } from "lucide-react";

// Import the generated asset
import onboardingImg from "../assets/images/nx_onboarding_illustration_1784112372368.jpg";

interface OnboardingStep {
  title: string;
  highlight: string;
  subtitle: string;
  icon: any;
  color: string;
}

interface PortalConfig {
  name: string;
  steps: OnboardingStep[];
}

const PORTAL_ONBOARDING_DATA: Record<string, PortalConfig> = {
  landing: {
    name: "NX Network",
    steps: [
      {
        title: "Welcome to",
        highlight: "NX Network",
        subtitle: "Unlocking liquidity in informal retail markets with secure, zero-data payments and inventory finance.",
        icon: Sparkles,
        color: "var(--nx-amber)",
      },
      {
        title: "Zero-Data",
        highlight: "USSD Payments",
        subtitle: "Empowering shopkeepers and customers to trade, pay, and earn rewards without an active internet connection.",
        icon: Smartphone,
        color: "var(--nx-green)",
      },
      {
        title: "Real-time",
        highlight: "Margin Clearing",
        subtitle: "Dynamic settlement pools funded directly by trade margins, keeping the entire value chain backed by physical stock.",
        icon: ShieldCheck,
        color: "var(--nx-amber)",
      }
    ]
  },
  pwa: {
    name: "NX Mobile App",
    steps: [
      {
        title: "Welcome to",
        highlight: "NX Mobile Pay",
        subtitle: "Save time at the shop with secure, quick, and reliable mobile rewards and peer payments.",
        icon: Sparkles,
        color: "var(--nx-amber)",
      },
      {
        title: "Shared Family",
        highlight: "Accounts",
        subtitle: "Pool your loyalty points and balances with family members for bulk household shopping discounts.",
        icon: Smartphone,
        color: "var(--nx-green)",
      },
      {
        title: "Frictionless",
        highlight: "Merchant Pay",
        subtitle: "Just scan a merchant QR code or dial a quick offline prompt to instantly redeem your balances.",
        icon: ShieldCheck,
        color: "var(--nx-amber)",
      }
    ]
  },
  hub: {
    name: "NX Merchant Hub",
    steps: [
      {
        title: "Welcome to",
        highlight: "Merchant Hub",
        subtitle: "Accept digital loyalty points, manage your stock, and request automated smart restocks seamlessly.",
        icon: Sparkles,
        color: "var(--nx-amber)",
      },
      {
        title: "Margin-Funded",
        highlight: "Restock Discounts",
        subtitle: "Settle up to 60% of your wholesale restock invoices automatically using customer points backed by pools.",
        icon: ShieldCheck,
        color: "var(--nx-green)",
      },
      {
        title: "Live Ledger &",
        highlight: "Inventory Sync",
        subtitle: "Keep your shelves perfectly stocked and track customer value flows in real-time.",
        icon: BarChart3,
        color: "var(--nx-amber)",
      }
    ]
  },
  partners: {
    name: "NX Logistics Portal",
    steps: [
      {
        title: "Welcome to",
        highlight: "Partner Logistics",
        subtitle: "Maximize route density by delivering aggregated wholesale restocks to cluster shop locations.",
        icon: Truck,
        color: "var(--nx-amber)",
      },
      {
        title: "Instant Claim &",
        highlight: "Smart Routing",
        subtitle: "Claim high-value dispatch jobs and navigate with real-time optimized delivery waypoints.",
        icon: Sparkles,
        color: "var(--nx-green)",
      },
      {
        title: "Secure Handshake",
        highlight: "Settlements",
        subtitle: "Complete deliveries using tamper-proof handshakes for immediate digital payment clearing.",
        icon: ShieldCheck,
        color: "var(--nx-amber)",
      }
    ]
  },
  fmcg: {
    name: "NX FMCG Portal",
    steps: [
      {
        title: "Welcome to",
        highlight: "FMCG Portal",
        subtitle: "Inject retail margins and run direct-to-retail campaigns bypassing traditional layers of friction.",
        icon: BarChart3,
        color: "var(--nx-amber)",
      },
      {
        title: "Real-Time",
        highlight: "Market Demand",
        subtitle: "Monitor retail consumption, product velocity, and regional demand on a live dashboard.",
        icon: Sparkles,
        color: "var(--nx-green)",
      },
      {
        title: "Direct",
        highlight: "Margin Injection",
        subtitle: "Create and fund campaign pools that automatically reward local merchants and loyal customers.",
        icon: ShieldCheck,
        color: "var(--nx-amber)",
      }
    ]
  }
};

interface OnboardingScreenProps {
  children: React.ReactNode;
}

export default function OnboardingScreen({ children }: OnboardingScreenProps) {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);

  // Determine which portal/site context we are in based on path
  const getPortalKey = (): string | null => {
    const path = location.pathname;

    // Admin dashboard or Control Center do NOT get onboarding pages as requested
    if (path.startsWith("/admin") || path.startsWith("/control")) {
      return null;
    }

    if (path.startsWith("/app")) {
      return "pwa";
    }
    if (path.startsWith("/hub")) {
      return "hub";
    }
    if (path.startsWith("/partners")) {
      return "partners";
    }
    if (path.startsWith("/fmcg") || path.startsWith("/fmcg-onboarding")) {
      return "fmcg";
    }
    // Any other main landing site pages
    return "landing";
  };

  const portalKey = getPortalKey();
  const config = portalKey ? PORTAL_ONBOARDING_DATA[portalKey] : null;

  useEffect(() => {
    if (!portalKey) {
      setIsDismissed(true);
      return;
    }

    const dismissedKey = `nx_onboarding_dismissed_${portalKey}`;
    const stored = sessionStorage.getItem(dismissedKey);
    if (stored === "true") {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
      setCurrentStep(0); // Reset step if visiting a different portal
    }
  }, [portalKey]);

  if (isDismissed === null) {
    return (
      <div className="min-h-[100dvh] bg-nx-ink flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-nx-amber border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isDismissed || !config) {
    return <>{children}</>;
  }

  const step = config.steps[currentStep] || config.steps[0];
  const isLastStep = currentStep === config.steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleDismiss();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleDismiss = () => {
    if (portalKey) {
      sessionStorage.setItem(`nx_onboarding_dismissed_${portalKey}`, "true");
    }
    setIsDismissed(true);
  };

  return (
    <div className="h-[100dvh] w-screen bg-nx-ink text-nx-paper flex items-center justify-center p-0 font-sans select-none overflow-hidden relative">
      {/* Soft, minimal grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      {/* Warm ambient light */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-nx-amber/5 rounded-full blur-[110px] pointer-events-none"></div>

      {/* Main Full-Screen Layout */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full h-full bg-nx-card relative flex flex-col md:grid md:grid-cols-2 overflow-hidden"
      >
        {/* Left column (Desktop only) - Image & Branding */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-[#090b0f] border-r border-nx-border/40 relative overflow-hidden h-full">
          {/* Subtle grid pattern for texture */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>
          {/* Internal ambient glow */}
          <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-nx-amber/5 rounded-full blur-[80px] pointer-events-none"></div>
          
          {/* Branding */}
          <div className="flex items-center gap-3 z-10">
            <span className="font-display text-2xl tracking-[0.1em] text-nx-amber font-bold">{config.name}</span>
            <span className="text-[10px] uppercase tracking-widest text-nx-muted bg-nx-ink/40 px-2 py-0.5 border border-nx-border/30 rounded">Intro</span>
          </div>

          {/* Premium centered image panel */}
          <div className="flex-1 flex items-center justify-center p-8 z-10">
            <div className="w-full max-w-[420px] aspect-square rounded-3xl overflow-hidden bg-nx-ink border border-nx-border p-3 relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="w-full h-full rounded-2xl overflow-hidden">
                <img
                  src={onboardingImg}
                  alt={step.highlight}
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {/* Float-badge icon matching step theme */}
              <div 
                className="absolute bottom-6 right-6 p-3.5 rounded-2xl text-nx-ink border border-white/10 shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
                style={{ backgroundColor: step.color }}
              >
                <step.icon className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Humble digital safety footer */}
          <div className="flex items-center gap-2 z-10 text-[10px] text-nx-muted/60 tracking-wider uppercase font-medium">
            <ShieldCheck className="w-4 h-4 text-nx-green" />
            <span>Secure Digital Restocking Network</span>
          </div>
        </div>

        {/* Right column (or full screen on mobile) - Step interactive content */}
        <div className="flex-1 flex flex-col justify-between h-full overflow-y-auto bg-nx-card relative">
          
          {/* Top navigation (Header) */}
          <div className="px-6 pt-5 pb-3 flex justify-between items-center border-b border-nx-border/10 md:border-b-0 bg-nx-ink/10 md:bg-transparent">
            {/* Show brand name on mobile only in header, since desktop has left column */}
            <span className="text-nx-amber font-semibold text-sm md:hidden">{config.name}</span>
            <span className="hidden md:inline text-[11px] text-nx-muted font-medium">Step {currentStep + 1} of {config.steps.length}</span>
            
            <button
              onClick={handleDismiss}
              className="text-xs font-semibold tracking-wide text-nx-muted hover:text-nx-amber active:scale-95 transition-colors cursor-pointer px-3 py-1.5 rounded bg-nx-ink/30 border border-nx-border/40 z-20"
            >
              Skip
            </button>
          </div>

          {/* Central Interactive area */}
          <div className="flex-1 flex flex-col justify-center px-6 py-8 md:px-12 max-w-[500px] mx-auto w-full">
            
            {/* Step Indicators above content */}
            <div className="flex items-center gap-1.5 mb-8 justify-start">
              {config.steps.map((_, idx) => {
                const isActive = idx === currentStep;
                return (
                  <motion.div
                    key={idx}
                    layoutId={`onboarding-dot-clean-${idx}`}
                    animate={{
                      width: isActive ? 24 : 8,
                      backgroundColor: isActive ? "var(--color-nx-amber)" : "rgba(255, 255, 255, 0.15)",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="h-1.5 rounded-full"
                  />
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="flex flex-col space-y-6 md:space-y-8"
              >
                {/* On mobile, show the image inside the card */}
                <div className="md:hidden w-full flex justify-center">
                  <div className="w-full max-w-[240px] aspect-square rounded-2xl overflow-hidden bg-nx-ink border border-nx-border/60 p-2 relative shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                    <div className="w-full h-full rounded-xl overflow-hidden">
                      <img
                        src={onboardingImg}
                        alt={step.highlight}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div 
                      className="absolute bottom-4 right-4 p-2 rounded-xl text-nx-ink border border-white/10 shadow-lg flex items-center justify-center"
                      style={{ backgroundColor: step.color }}
                    >
                      <step.icon className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Narrative text block */}
                <div className="space-y-4 md:space-y-5 text-left">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold tracking-widest text-nx-muted uppercase block">
                      {step.title}
                    </span>
                    <span className="font-display text-4xl md:text-5xl tracking-wide text-nx-paper uppercase block leading-tight">
                      {step.highlight}
                    </span>
                  </div>
                  
                  <div className="w-12 h-[3px] bg-nx-amber rounded-full"></div>

                  <p className="text-[#b5b3aa] text-[15px] md:text-[16px] leading-relaxed tracking-wide font-light">
                    {step.subtitle}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Controls Footer */}
          <div className="px-6 pb-8 pt-6 md:px-12 border-t border-nx-border/20 bg-nx-ink/10 md:bg-transparent max-w-[500px] mx-auto w-full flex flex-col gap-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className="w-full py-4 px-6 bg-nx-amber hover:bg-opacity-90 text-nx-ink font-semibold text-xs uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,181,71,0.15)]"
            >
              <span>{isLastStep ? "Get Started" : "Continue"}</span>
              <ChevronRight className="w-4 h-4 text-nx-ink stroke-[2.5px]" />
            </motion.button>

            {/* Mobile-only safety line inside bottom container */}
            <div className="md:hidden flex items-center justify-center gap-1 text-[10px] text-nx-muted/60 tracking-wider uppercase font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-nx-green" />
              <span>Secure Digital Restocking Network</span>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
