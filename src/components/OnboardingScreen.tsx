import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, Smartphone, ShieldCheck, Truck, BarChart3, ChevronRight } from "lucide-react";

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
        subtitle: "Unlocking liquidity in informal retail markets with secure, zero-data USSD payments and inventory finance.",
        icon: Sparkles,
        color: "#E88C1B",
      },
      {
        title: "Zero-Data",
        highlight: "USSD Payments",
        subtitle: "Empowering duka shopkeepers and customers to trade, pay, and earn rewards without an active internet connection.",
        icon: Smartphone,
        color: "#10B981",
      },
      {
        title: "Real-time",
        highlight: "Margin Clearing",
        subtitle: "Dynamic settlement pools funded directly by FMCG trade margins, keeping the entire value chain backed by physical stock.",
        icon: ShieldCheck,
        color: "#3B82F6",
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
        color: "#E88C1B",
      },
      {
        title: "Shared Family",
        highlight: "Accounts",
        subtitle: "Pool your loyalty points and balances with family members for bulk household shopping discounts.",
        icon: Smartphone,
        color: "#10B981",
      },
      {
        title: "Frictionless",
        highlight: "Merchant Pay",
        subtitle: "Just scan a merchant QR code or dial a quick offline USSD prompt to instantly redeem your balances.",
        icon: ShieldCheck,
        color: "#3B82F6",
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
        color: "#E88C1B",
      },
      {
        title: "Margin-Funded",
        highlight: "Restock Discounts",
        subtitle: "Settle up to 60% of your wholesale restock invoices automatically using customer points backed by FMCG pools.",
        icon: ShieldCheck,
        color: "#10B981",
      },
      {
        title: "Live Ledger &",
        highlight: "Inventory Sync",
        subtitle: "Keep your duka shelves perfectly stocked and track customer value flows in real-time.",
        icon: BarChart3,
        color: "#3B82F6",
      }
    ]
  },
  partners: {
    name: "NX Logistics Portal",
    steps: [
      {
        title: "Welcome to",
        highlight: "Partner Logistics",
        subtitle: "Maximize route density by delivering aggregated wholesale restocks to cluster duka locations.",
        icon: Truck,
        color: "#E88C1B",
      },
      {
        title: "Instant Claim &",
        highlight: "Smart Routing",
        subtitle: "Claim high-value dispatch jobs and navigate with real-time optimized delivery waypoints.",
        icon: Sparkles,
        color: "#10B981",
      },
      {
        title: "Secure Handshake",
        highlight: "Settlements",
        subtitle: "Complete deliveries using tamper-proof USSD handshakes for immediate digital payment clearing.",
        icon: ShieldCheck,
        color: "#3B82F6",
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
        color: "#E88C1B",
      },
      {
        title: "Real-Time",
        highlight: "Market Demand",
        subtitle: "Monitor retail consumption, product velocity, and regional duka demand on a live dashboard.",
        icon: Sparkles,
        color: "#10B981",
      },
      {
        title: "Direct",
        highlight: "Margin Injection",
        subtitle: "Create and fund campaign pools that automatically reward local merchants and loyal customers.",
        icon: ShieldCheck,
        color: "#3B82F6",
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
      <div className="min-h-[100dvh] bg-[#FDFBF7] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E88C1B] border-t-transparent animate-spin" />
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
    <div className="min-h-[100dvh] w-full bg-[#0E1017] flex items-center justify-center p-0 sm:p-6 md:p-12 font-sans select-none overflow-hidden relative">
      {/* Decorative background grid behind the phone mockup on desktop */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none hidden sm:block"></div>
      
      {/* Outer blurred glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none hidden sm:block"></div>

      {/* Main mockup card replicating a high-end mobile interface from the image */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full h-[100dvh] sm:h-[820px] sm:max-w-[390px] bg-[#FDFBF7] sm:rounded-[40px] sm:shadow-[0_24px_80px_rgba(0,0,0,0.5)] border-0 sm:border-[8px] sm:border-[#1E2230] relative flex flex-col justify-between overflow-hidden"
      >
        {/* Mobile Screen Notch/Status Bar mockup for authentic phone aesthetics */}
        <div className="px-6 pt-3 pb-1 flex justify-between items-center text-[#1A1A17] font-mono text-xs z-10 select-none">
          <div className="flex items-center gap-1.5 font-bold tracking-tight">
            <span>09:41</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A17] animate-pulse"></div>
          </div>
          {/* Custom micro pill for speaker notch on desktop */}
          <div className="w-20 h-4 bg-[#1E2230] rounded-full absolute top-1 left-1/2 -translate-x-1/2 hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.07 19.49 10.47 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
            </svg>
            <div className="w-5 h-2.5 border border-[#1A1A17] rounded-sm p-[1px] flex items-center">
              <div className="h-full w-4/5 bg-[#1A1A17] rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* Top Action Row: Page indicators & Skip button */}
        <div className="px-6 pt-4 flex justify-between items-center z-10">
          {/* Replicating the custom pill-dot indicator design from the image */}
          <div className="flex items-center gap-1.5">
            {config.steps.map((_, idx) => {
              const isActive = idx === currentStep;
              return (
                <motion.div
                  key={idx}
                  layoutId={`indicator-${idx}`}
                  animate={{
                    width: isActive ? 20 : 6,
                    backgroundColor: isActive ? "#E88C1B" : "#D4D2CD",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="h-1.5 rounded-full"
                />
              );
            })}
          </div>

          <button
            onClick={handleDismiss}
            className="text-xs font-bold tracking-wider uppercase text-[#1A1A17] hover:opacity-70 active:scale-95 transition-all cursor-pointer px-2 py-1 rounded-md"
          >
            Skip
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col justify-center px-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              {/* Premium Floating Illustration Frame */}
              <div className="w-full max-w-[280px] aspect-square rounded-3xl overflow-hidden bg-[#FAF6EE] shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#EDEAE3] flex items-center justify-center p-3 relative group">
                <img
                  src={onboardingImg}
                  alt={step.highlight}
                  className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500 ease-out"
                  referrerPolicy="no-referrer"
                />
                
                {/* Micro floating badge icon matching step color */}
                <div 
                  className="absolute bottom-4 right-4 p-2.5 rounded-xl text-white shadow-lg flex items-center justify-center transition-all duration-300"
                  style={{ backgroundColor: step.color }}
                >
                  <step.icon className="w-5 h-5" />
                </div>
              </div>

              {/* Textual Copy Block matching layout and alignment in the image */}
              <div className="space-y-3 w-full px-2 text-left">
                <div className="space-y-1">
                  <span className="text-2xl font-medium text-[#1A1A17] block tracking-tight">
                    {step.title}
                  </span>
                  <span 
                    className="text-[2.6rem] font-black leading-none block tracking-tight select-text"
                    style={{ color: "#E88C1B" }}
                  >
                    {step.highlight}
                  </span>
                </div>
                
                <p className="text-[#6E6D68] text-sm leading-relaxed font-normal tracking-wide">
                  {step.subtitle}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Call to Action Section with styled orange button */}
        <div className="px-6 pb-8 pt-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="w-full py-4 px-6 bg-[#E88C1B] hover:bg-[#D97706] text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-[0_8px_24px_rgba(232,140,27,0.25)] hover:shadow-[0_12px_28px_rgba(232,140,27,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>{isLastStep ? "Get Started" : "Continue"}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>

          {/* Secure indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-[#A3A19A] tracking-wider uppercase font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fully Encrypted NX Protocol</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
