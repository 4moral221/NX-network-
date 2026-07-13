---
name: nx-frontend-design
description: Design system guidelines and reusable components for building high-fidelity NX Network frontend applications with precise typography, custom layout grids, and unique visual themes.
---

# NX Frontend Design System Skill

This skill documents and implements the visual identity, typography system, grid rules, and component architectures of the NX Network platform. Use these rules to craft robust, visually distinctive interfaces that adhere perfectly to the NX brand guidelines.

---

## 1. Core Visual Foundations

The NX Network aesthetic is built on high-contrast, editorial typography paired with technical monospace highlights and structured layout boundaries.

### Color Tokens (CSS Custom Properties)

These tokens map to both dark and light modes cleanly:

| Token Name | Dark Mode Value (Default) | Light Mode Value | Brand Purpose |
| :--- | :--- | :--- | :--- |
| `--nx-ink` | `#111110` (Anthropic dark charcoal) | `#FAF8F5` (Claude warm white/clay) | Core canvas background |
| `--nx-paper` | `#eceae2` (Soft off-white bone) | `#1c1c1a` (Deep dark obsidian) | Primary typography, high-priority icons |
| `--nx-amber` | `#ffb547` (Golden amber warmth) | `#d97706` (Deep gold accent) | Primary accents, interactive highlights |
| `--nx-ember` | `#ff5c6c` (Soft warm coral sunset) | `#dc2626` (Bright red alert) | Throttled status, warning triggers |
| `--nx-green` | `#10b981` (Crisp mint green) | `#059669` (Emerald green) | Earn markers, solvent status, positive feedback |
| `--nx-muted` | `#b5b3aa` (Contrast slate gray) | `#6e6d67` (Warm stone gray) | Secondary details, metadata, captions |
| `--nx-border` | `#2b2b28` (Warm dark outline) | `#e6e4dc` (Warm clay border) | Structured panels, grid dividing lines |
| `--nx-card` | `#181817` (Deep obsidian block) | `#ffffff` (Pure white block) | Main content blocks, containers |
| `--nx-card2` | `#20201f` | `#faf9f6` | Alternate panel surfaces, highlight cards |

---

## 2. Typographic Hierarchy & Pairings

Our font selections create rhythm and focus through contrast:

1. **Display (Headings)**: `"Bebas Neue", sans-serif`. Heavy, tall, uppercase-only tracking. Perfect for large hero banners and key conceptual headers. Always add uppercase transforms and tracking-wide.
2. **Body & Interface**: `"Space Grotesk", "DM Sans", sans-serif`. Clean, high-legibility geometric sans-serif for numbers, button actions, and description blocks.
3. **Editorial (Quotes/Storytelling)**: `"DM Serif Display", serif`. Classic, elegant serif for narrative blocks, testimonies, and conceptual emphasis.
4. **Technical (Status/Data)**: `"JetBrains Mono", monospace`. Used for transaction codes, currency logs, ratios, and numeric metrics.

---

## 3. High-Fidelity UI Layout Patterns

### A. The Structural Border Grid
Instead of default boxes, align components inside an elegant, continuous grid divided by `--nx-border` lines (`border-t border-nx-border`). 
- Avoid rounded corners on everything; reserve generous rounded frames (`rounded-2xl`) only for elevated cards.
- Background grid pattern should be applied to the canvas body for an interactive, blueprint feel:
  ```css
  body {
    background-image: 
      linear-gradient(var(--nx-bg-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--nx-bg-grid) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  ```

### B. Interactive USSD Simulation (Blueprint)
A mobile mockup that behaves exactly like the USSD physical interface. It must look functional, using real analog styling, custom keys, and instant status updates.

```tsx
import React, { useState } from 'react';
import { Phone, ChevronRight, CornerDownLeft } from 'lucide-react';

export const USSDSimulator: React.FC = () => {
  const [inputVal, setInputVal] = useState('');
  const [screenText, setScreenText] = useState(
    "CONNX NETWORK:\n1. Customer Rewards\n2. Duka Restock\n3. Hub Deliveries\n4. Exit"
  );
  
  const handleAction = (val: string) => {
    // Basic navigation logic
    if (val === '1') {
      setScreenText("CON CUSTOMER:\nEnter mobile number:");
    } else if (val === '2') {
      setScreenText("CON DUKA RESTOCK:\n1. Pembe Maize 2kg\n2. Brookside 500ml\n3. Back");
    } else {
      setScreenText("CONNX NETWORK:\n1. Customer Rewards\n2. Duka Restock\n3. Hub Deliveries\n4. Exit");
    }
    setInputVal('');
  };

  return (
    <div className="w-full max-w-sm bg-nx-card border border-nx-border rounded-2xl overflow-hidden shadow-2xl mx-auto">
      {/* Device frame header */}
      <div className="bg-nx-ink/50 px-5 py-3 border-b border-nx-border flex justify-between items-center text-[10px] font-mono text-nx-muted uppercase">
        <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-nx-amber" /> USSD ONLINE</span>
        <span>*384*6180#</span>
      </div>

      {/* Screen area */}
      <div className="bg-nx-ink p-6 min-h-[180px] font-mono text-xs text-nx-paper border-b border-nx-border leading-relaxed whitespace-pre-wrap select-text">
        {screenText}
      </div>

      {/* Input panel */}
      <div className="p-4 bg-nx-card flex items-center gap-2">
        <input 
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type choice..."
          className="flex-1 bg-nx-ink border border-nx-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-hidden focus:border-nx-amber text-nx-paper"
        />
        <button 
          onClick={() => handleAction(inputVal)}
          className="p-2 bg-nx-amber text-nx-ink rounded-lg font-bold hover:opacity-90 transition-all cursor-pointer"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
```

### C. Accordion Pattern (Clean Disclosure)
For technical details and structural information that is better hidden until requested, use the smooth motion-wrapped accordion wrapper:

```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-nx-card border border-nx-border rounded-xl overflow-hidden transition-all duration-300 hover:border-nx-amber/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 select-none focus:outline-hidden"
      >
        <span className="font-serif text-base md:text-lg text-nx-paper font-semibold tracking-tight">
          {title}
        </span>
        <div className="p-1.5 border border-nx-border rounded-lg bg-nx-ink shrink-0">
          <Plus className={`w-3.5 h-3.5 text-nx-muted transition-transform duration-300 ${isOpen ? 'rotate-45 text-nx-amber' : ''}`} />
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
            <div className="px-6 pb-6 pt-1 border-t border-nx-border/20 text-sm text-nx-muted leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

---

## 4. Craftsmanship Directives

1. **Editorial Touch**: Always frame large displayed numbers with dynamic status indicators. For example, rather than just printing `10%`, write `PROMO TIER: 10% → 5%`.
2. **Micro-interactivity**: Never use a plain link (`<a>`) when showcasing application gateways. Use styled custom interactive modals with elegant enter animations (e.g., `AnimatePresence` and spring curves).
3. **Spacing Discipline**: Group related texts closely together (`space-y-1` or `space-y-2`) and separate distinct blocks with spacious sections (`py-24` or `py-32`). This creates an elegant "rhythm of negative space" typical of award-winning bespoke websites.
