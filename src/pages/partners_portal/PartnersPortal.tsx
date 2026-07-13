import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import {
  LayoutDashboard, Store, Package, Coins, PlusCircle, LogOut,
  Info, CheckCircle2, AlertCircle, Flame, RefreshCw, Send,
  ShoppingCart, ChevronRight, Tag, Zap, Sparkles, Truck,
  Terminal, Search, Key, Shield, Copy, Plus, Check, ShieldAlert, Loader2, Eye, EyeOff,
  Cpu, FileText, Upload, Download, ArrowRight, MapPin, User, Navigation, ChevronDown, Award, HelpCircle, Activity, X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import NXLogo from '../../components/NXLogo';
import NotificationIcon from '../../components/NotificationIcon';

// Map Imports for Partners Portal Leaflet Map
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon } from 'lucide-react';

const hasGoogleMapsKey = false;

function MapRecenter({ center, zoom }: { center: { lat: number, lng: number }, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

// Fix typical Leaflet marker icon asset issue
const customShopIconPartner = new L.DivIcon({
  html: '<div class="text-2xl filter drop-shadow">🏪</div>',
  className: 'custom-leaflet-shop-p',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const customHubIconPartner = new L.DivIcon({
  html: '<div class="text-2xl filter drop-shadow border-2 border-nx-amber rounded-full bg-nx-amber/20 p-0.5">🏬</div>',
  className: 'custom-leaflet-hub-p',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

type Tab = 'overview' | 'demand' | 'merchants' | 'sku' | 'api_access' | 'compiler' | 'intelligence' ;

/**
 * Generates a secure random API key with a prefix.
 */
function generateSecureApiKey(): string {
  const prefix = 'nx_live_';
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  const randomPart = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${prefix}${randomPart}`;
}

/**
 * Hashes a string using-SHA 256.
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

type Batch = {
  id: number;
  sku_code: string;
  sku_name?: string;
  variant_code?: string;
  window_end?: string;
  total_qty?: number;
  total_quantity?: number;
  merchant_count: number;
  status: string;
  normal_price?: number;
  offered_price?: number;
  saving_pct?: number;
  deal_note?: string;
  fmcg_partner_id?: number;
};

const SKU_META: Record<string, { emoji: string; label: string; unit: string }> = {
  BR: { emoji: '🍞', label: 'Bread',       unit: 'loaves'  },
  ML: { emoji: '🥛', label: 'Milk',        unit: 'packs'   },
  SG: { emoji: '🧂', label: 'Sugar',       unit: 'bags'    },
  CO: { emoji: '🫙', label: 'Cooking Oil', unit: 'bottles' },
  F: { emoji: '🌾', label: 'Maize & Wheat Flour', unit: 'bags'    },
};

// Live countdown hook
function useCountdown(windowEnd?: string) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!windowEnd) return;
    const tick = () => {
      const diff = new Date(windowEnd).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Closed'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [windowEnd]);
  return remaining;
}

// ── Batch Card ───────────────────────────────────────────────
function BatchCard({ batch, brand, onBid, myBids, onExportRaw }: { batch: Batch; brand: any; onBid: (b: Batch) => void; myBids: Set<string>; onExportRaw?: (b: Batch) => void; key?: any }) {
  const countdown = useCountdown(batch.window_end);
  const meta = SKU_META[batch.sku_code] ?? { emoji: '📦', label: batch.sku_name || batch.sku_code, unit: 'units' };
  const totalQuantity = batch.total_quantity || batch.total_qty || 0;
  const isHot = totalQuantity > 500;
  const alreadyBid = myBids.has(String(batch.id)) || myBids.has(batch.id as any);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-2xl border-2 p-6 flex flex-col gap-4 hover:shadow-lg transition-all',
        isHot ? 'border-[#ef4444]/30' : 'border-[#e4e6ea]'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.emoji}</span>
          <div>
            <div className="font-extrabold text-base text-[#1a1d23]">
              {meta.label}
              {batch.variant_code && (
                <span className="ml-2 text-[10px] font-bold bg-[#f4f5f7] text-[#6b7280] px-2 py-0.5 rounded-full">
                  {batch.variant_code}
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#6b7280] uppercase tracking-widest">SKU {batch.sku_code}</div>
          </div>
        </div>
        {isHot && (
          <span className="text-[10px] font-bold text-[#ef4444] bg-[#fef2f2] px-2 py-1 rounded-full flex items-center gap-1">
            <Flame className="w-3 h-3" /> HOT
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#f4f5f7] rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-[#1a1d23]">{totalQuantity.toLocaleString()}</div>
          <div className="text-[9px] text-[#6b7280] uppercase tracking-wider">{meta.unit}</div>
        </div>
        <div className="bg-[#f4f5f7] rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-[#1a1d23]">{batch.merchant_count}</div>
          <div className="text-[9px] text-[#6b7280] uppercase tracking-wider">Dukas</div>
        </div>
        <div className={cn('rounded-xl p-3 text-center', countdown === 'Closed' ? 'bg-[#fef2f2]' : 'bg-[#fef3c7]')}>
          <div className={cn('text-xs font-extrabold tabular-nums leading-tight', countdown === 'Closed' ? 'text-[#ef4444]' : 'text-[#92400e]')}>
            {countdown || '—'}
          </div>
          <div className="text-[9px] text-[#6b7280] uppercase tracking-wider">Closes in</div>
        </div>
      </div>

      {batch.normal_price && (
        <div className="text-xs text-[#6b7280] border border-[#e4e6ea] rounded-lg px-3 py-2 flex items-center gap-2">
          <Tag className="w-3 h-3 shrink-0" />
          Market: <span className="font-bold text-[#1a1d23]">KSH {batch.normal_price}/unit</span>
          {batch.offered_price && (
            <span className="ml-auto font-bold text-[#059669]">
              Offered: KSH {batch.offered_price} ({batch.saving_pct?.toFixed(1)}% off)
            </span>
          )}
        </div>
      )}

      {batch.status === 'open' && countdown !== 'Closed' ? (
        <button
          onClick={() => onBid(batch)}
          className="w-full bg-[#1a1d23] hover:bg-[#2a2d35] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Send className="w-4 h-4" /> Submit Price for This Batch
        </button>
      ) : alreadyBid ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#059669] text-sm font-bold bg-[#d1fae5] rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4" /> Offer submitted — NX reviewing
          </div>
          {onExportRaw && (
            <button onClick={() => onExportRaw(batch)} className="w-full bg-[#f4f5f7] hover:bg-[#e4e6ea] text-[#1a1d23] font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
               <Download className="w-3 h-3" /> Export Raw Batch Data
            </button>
          )}
        </div>
      ) : batch.status === 'deal_accepted' ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#2563eb] text-sm font-bold bg-[#dbeafe] rounded-xl px-4 py-3">
            <Zap className="w-4 h-4" /> Deal accepted — fulfil within {batch.deal_note || '3 days'}
          </div>
          {onExportRaw && (
            <button onClick={() => onExportRaw(batch)} className="w-full bg-[#f4f5f7] hover:bg-[#e4e6ea] text-[#1a1d23] font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
               <Download className="w-3 h-3" /> Export Raw Batch Data
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-[#6b7280] text-center py-2">Window closed</div>
          {onExportRaw && ['deal_received', 'closed'].includes(batch.status) && (
            <button onClick={() => onExportRaw(batch)} className="w-full bg-[#f4f5f7] hover:bg-[#e4e6ea] text-[#1a1d23] font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
               <Download className="w-3 h-3" /> Export Raw Batch Data
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Bid Modal ────────────────────────────────────────────────
function BidModal({ batch, brand, onClose, onSuccess }: {
  batch: Batch; brand: any; onClose: () => void; onSuccess: () => void;
}) {
  const meta = SKU_META[batch.sku_code] ?? { emoji: '📦', label: batch.sku_code, unit: 'units' };
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('3');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const parsedPrice = parseFloat(price);
  const saving = batch.normal_price && parsedPrice > 0
    ? (((batch.normal_price - parsedPrice) / batch.normal_price) * 100).toFixed(1) : null;
  const totalQuantity = batch.total_quantity || batch.total_qty || 0;
  const totalValue = parsedPrice > 0 ? Math.round(parsedPrice * totalQuantity) : null;
  const nxEstimate = batch.normal_price && parsedPrice > 0
    ? Math.round(totalQuantity * (batch.normal_price - parsedPrice) * 0.10) : null;

  const handleSubmit = async () => {
    setErr('');
    if (!parsedPrice || parsedPrice <= 0) { setErr('Enter a valid price.'); return; }
    if (batch.normal_price && parsedPrice >= batch.normal_price) {
      setErr('Price must be below market price to win the batch.');
      return;
    }
    setLoading(true);
    try {
      let resolvedBrandId = brand?.id;
      if (!resolvedBrandId) {
        const { data: fallbackPartners } = await supabase.from('fmcg_partners').select('id').limit(1);
        if (fallbackPartners && fallbackPartners.length > 0) {
          resolvedBrandId = fallbackPartners[0].id;
        } else {
          resolvedBrandId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'mock_fmcg_token';

      const response = await fetch('/api/fmcg/submit-bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          batch_id: batch.id,
          brand_id: resolvedBrandId,
          offered_price: parsedPrice,
          delivery_days: parseInt(days) || 3,
          notes
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Submission failed.');

      onSuccess();
    } catch (e: any) {
      setErr(e.message || 'Submission failed.');
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{meta.emoji}</span>
          <div>
            <div className="font-extrabold text-lg">{meta.label} {batch.variant_code && `(${batch.variant_code})`}</div>
            <div className="text-xs text-[#6b7280]">{(batch.total_quantity || batch.total_qty || 0).toLocaleString()} {meta.unit} · {batch.merchant_count} dukas</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Your Price Per Unit (KSH)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder={batch.normal_price ? `Market price: KSH ${batch.normal_price}` : 'e.g. 85'}
              className="w-full border-2 border-[#e4e6ea] focus:border-[#2563eb] rounded-xl px-4 py-3 text-lg font-bold outline-none transition-colors"
            />
          </div>

          {saving && parseFloat(saving) > 0 && totalValue && (
            <div className="bg-[#d1fae5] border border-[#6ee7b7] rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">Discount</div>
                <div className="font-extrabold text-[#059669] text-xl">{saving}%</div>
              </div>
              <div className="border-x border-[#6ee7b7]">
                <div className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">Batch Value</div>
                <div className="font-extrabold text-[#1a1d23] text-xl">KSH {totalValue.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">Merchant NX</div>
                <div className="font-extrabold text-[#1a1d23] text-xl">~{nxEstimate} NX</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Delivery Days</label>
            <select
              value={days} onChange={e => setDays(e.target.value)}
              className="w-full border-2 border-[#e4e6ea] focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors"
            >
              {[1,2,3,5,7].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Notes (optional)</label>
            <textarea
              rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Nairobi region only, min 200 units per drop-point"
              className="w-full border-2 border-[#e4e6ea] focus:border-[#2563eb] rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-none"
            />
          </div>

          {err && <div className="flex items-center gap-2 text-[#ef4444] text-xs"><AlertCircle className="w-4 h-4" /> {err}</div>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border-2 border-[#e4e6ea] text-[#6b7280] font-bold py-3 rounded-xl hover:border-[#1a1d23] hover:text-[#1a1d23] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit} disabled={loading || !price}
              className="flex-1 bg-[#1a1d23] text-white font-bold py-3 rounded-xl hover:bg-[#2a2d35] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Submitting…' : 'Submit Offer to NX'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── MAIN PORTAL ──────────────────────────────────────────────
export default function PartnersPortal() {
  const getAuthHeaders = async (extraHeaders: Record<string, string> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || 'mock_fmcg_token';
    return {
      'Authorization': `Bearer ${token}`,
      ...extraHeaders
    };
  };

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [errorAlert, setErrorAlert] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [merchantsPage, setMerchantsPage] = useState(1);
  const itemsPerPage = 5;

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setErrorAlert({ message, type });
    setTimeout(() => {
      setErrorAlert(prev => prev && prev.message === message ? null : prev);
    }, 5500);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOnline(true);
      showNotification("You are back online. System synchronized.", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification("You are currently offline. Using cached local storage.", "warning");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPartnerReady, setIsPartnerReady] = useState(false);

  useEffect(() => {
    const recoverSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email;
          if (email) {
            const { data: partnerData } = await supabase
              .from('fmcg_partners')
              .select('*')
              .ilike('contact', email)
              .maybeSingle();

            if (partnerData) {
              setBrand(partnerData);
              setIsLoggedIn(true);
            } else {
              const { data: pData } = await supabase
                .from('partners')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              if (pData) {
                setBrand({
                  id: pData.id,
                  name: pData.company_name,
                  contact: email,
                  active: pData.status === 'active',
                  category: 'Partner'
                });
                setIsLoggedIn(true);
              }
            }
          }
        }
      } catch (err) {
        console.error('Session recovery failed:', err);
      }
    };
    recoverSession();
  }, []);

  useEffect(() => {
    const handleSignupToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('signup_token');
      if (token) {
        try {
          const res = await fetch(`/api/auth/claim-signup-key?token=${token}`);
          const data = await res.json();
          if (res.ok && data.success) {
            setAuthMode('setup');
            setSetupData({
              brand: data.brand_name,
              apiKey: data.apiKey,
              newPassword: '',
              confirmPassword: ''
            });
            
            alert(`Claim successfully executed!\n\nPartner Name: ${data.brand_name}\nIdentity Key: ${data.apiKey}\n\nYou have been fast-tracked. Please define your Access PIN below to lock your portal workspace.`);

            // Strip from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('signup_token');
            window.history.replaceState({}, '', url.pathname + url.search);
          } else {
            alert(data.error || 'Failed to claim secure setup key.');
          }
        } catch (err: any) {
          console.error('[Token claim exception in partners]', err);
        }
      }
    };
    handleSignupToken();
  }, []);

  const checkEmailStatus = async () => {
    // Removed email verification to simplify access as requested
  };

  useEffect(() => {
    if (isLoggedIn) {
      checkEmailStatus();
      fetchAgents();
    }
  }, [isLoggedIn]);
  const [brand, setBrand] = useState<any>(null);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'setup' | 'whitelist_signup'>('login');
  const [loginData, setLoginData] = useState({ brand: '', password: '' });
  const [signupData, setSignupData] = useState({ companyName: '', email: '', password: '' });
  const [setupData, setSetupData] = useState({ brand: '', apiKey: '', newPassword: '', confirmPassword: '' });
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Whitelist Retrieve Key States
  const [whitelistEmail, setWhitelistEmail] = useState('');
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [whitelistResult, setWhitelistResult] = useState<{ brand_name: string; email: string; magic_link: string } | null>(null);
  const [whitelistError, setWhitelistError] = useState('');

  // Intelligence Map States
  const [intelMapCenter, setIntelMapCenter] = useState<{ lat: number, lng: number }>({ lat: -1.2864, lng: 36.8172 });
  const [intelMapZoom, setIntelMapZoom] = useState(12);
  const [intelSelectedPin, setIntelSelectedPin] = useState<any | null>(null);
  const [intelHeatmapMode, setIntelHeatmapMode] = useState(false);
  const [intelViewMode, setIntelViewMode] = useState<'map' | 'feed'>('map');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Mock points for intelligence map
  const intelMapPoints = [
    { type: 'hub', lat: -1.2864, lng: 36.8172, name: "Nairobi CBD Central Hub", role: "Major Dispatch Coordination Hub", tier: "HUB" },
    { type: 'shop', lat: -1.2745, lng: 36.8483, name: "Eastleigh Wholesaler Node", role: "Franchise Tier: HUB (70% Pool Rate)\nUtilization: 38% (Peak Health)", tier: "HUB" },
    { type: 'shop', lat: -1.2831, lng: 36.7456, name: "Kawangware Kiosk", role: "Franchise Tier: BASIC (60% Pool Rate)\nUtilization: 94% (Throttled 0x)", tier: "BASIC" },
    { type: 'shop', lat: -1.3142, lng: 36.7905, name: "Kibera Micro-Duka", role: "Franchise Tier: CERTIFIED (65% Pool Rate)\nUtilization: 68% (Throttled 0.5x)", tier: "CERTIFIED" },
    { type: 'shop', lat: -1.2173, lng: 36.8904, name: "Roysambu Super Duka", role: "Franchise Tier: CERTIFIED (65% Pool Rate)\nUtilization: 22% (Active)", tier: "CERTIFIED" }
  ];

  // API Key Management States
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [rawKeyToShow, setRawKeyToShow] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [activeBid, setActiveBid] = useState<Batch | null>(null);
  const [bidSuccess, setBidSuccess] = useState(false);
  const [topMerchants, setTopMerchants] = useState<any[]>([]);
  const [stats, setStats] = useState({
    merchantsReached: 0,
    cycleTransactions: 0,
    nxRedeemed: 0,
    skuVolumes: [] as any[]
  });
  const [myBids, setMyBids] = useState<Set<string>>(new Set());

  // Auto-resolve brand state fallback
  useEffect(() => {
    if (isLoggedIn && !brand) {
      const resolvePartner = async () => {
        try {
          const { data: partners } = await supabase.from('fmcg_partners').select('*').limit(1);
          if (partners && partners.length > 0) {
            setBrand(partners[0]);
          } else {
            const defaultId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
            const { data: newP } = await supabase.from('fmcg_partners').insert({
              id: defaultId,
              name: 'Pembe Foods',
              status: 'approved',
              active: true
            }).select().single();
            if (newP) setBrand(newP);
          }
        } catch (err) {
          console.error("Auto resolve partner error:", err);
        }
      };
      resolvePartner();
    }
  }, [isLoggedIn, brand]);

  // Resolver state
  const [resolverOutput, setResolverOutput] = useState<string>('');
  const [resolverLoading, setResolverLoading] = useState(false);

  // AI Compiler States
  const [compilerInput, setCompilerInput] = useState<string>('');
  const [compilerLoading, setCompilerLoading] = useState(false);
  const [compilerOutput, setCompilerOutput] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  // Safety Rails States
  const [simTier, setSimTier] = useState<'BASIC' | 'CERTIFIED' | 'HUB'>('BASIC');
  const [simMargin, setSimMargin] = useState<number>(1000);
  const [simBoosts, setSimBoosts] = useState<number>(150);
  const [simUtilization, setSimUtilization] = useState<number>(45);

  // Real-time Delivery Tracker States
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);
  const [transitPercent, setTransitPercent] = useState<number>(0);
  const [isSimulatingTransit, setIsSimulatingTransit] = useState(false);
  const [gpsLog, setGpsLog] = useState<string[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentName, setAgentName] = useState('');
  const [onboardingAgent, setOnboardingAgent] = useState(false);
  const [agentToConfirm, setAgentToConfirm] = useState<any>(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  const fetchBatches = async () => {
    setBatchLoading(true);
    try {
      // Use created_at for sorting to be safe across schema variations
      const { data, error: bErr } = await supabase
        .from('restock_batches')
        .select('*')
        .in('status', ['open', 'deal_received', 'deal_accepted'])
        .order('created_at', { ascending: false });
      
      if (bErr) throw bErr;

      if (data) {
        setBatches(data);
        // Also fetch my bids to show "Offer submitted"
        if (brand?.id) {
          const { data: bids } = await supabase.from('restock_batch_offers').select('batch_id').eq('fmcg_partner_id', brand.id);
          if (bids) setMyBids(new Set(bids.map(b => String(b.batch_id))));
        }
      }
    } catch (e: any) {
      console.error('Fetch batches error:', e);
      // Absolute fallback
      const { data } = await supabase.from('restock_batches').select('*').limit(50);
      if (data) setBatches(data);
    }
    setBatchLoading(false);
  };

  const fetchFmcgData = async () => {
    try {
      // 1. Stats from Transactions & Merchants
      const { count: mCount, error: mErr } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'merchant');
      if (mErr) console.warn('Merchant count error:', mErr);

      const { count: tCount, error: tErr } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
      if (tErr) console.warn('Txn count error:', tErr);

      const { data: nxData, error: nxErr } = await supabase.from('transactions').select('nx_amount');
      if (nxErr) console.warn('NX data error:', nxErr);
      
      const totalNx = nxData?.reduce((acc, curr) => acc + (Number(curr.nx_amount) || 0), 0) || 0;

      // 2. Top Merchants (Real)
      const { data: merchantsData } = await supabase
        .from('users')
        .select(`
          merchant_code,
          name,
          location,
          role,
          phone
        `)
        .eq('role', 'merchant')
        .limit(10);

      // 3. SKU Volumes from Inventory
      const { data: invData } = await supabase.from('merchant_inventory').select('sku_code, quantity');
      const skuAgg = invData?.reduce((acc: any, curr) => {
        acc[curr.sku_code] = (acc[curr.sku_code] || 0) + curr.quantity;
        return acc;
      }, {});

      const skuVolumes = Object.entries(skuAgg || {}).map(([code, vol]) => ({
        code,
        vol: Number(vol).toLocaleString(),
        trend: null // No historical data yet, omit trend
      }));

      setStats({
        merchantsReached: mCount || 0,
        cycleTransactions: tCount || 0,
        nxRedeemed: totalNx,
        skuVolumes
      });

      // 4. Pool Contributions (Real) - Fetch early to use in enrichment
      const brandName = brand?.name ? brand.name.trim() : '';
      const { data: poolData } = await supabase.from('fmcg_margin_contributions')
        .select('*')
        .eq('fmcg_name', brandName)
        .order('created_at', { ascending: false })
        .limit(20);

      if (merchantsData) {
        // For each merchant, get their transaction count
        const enriched = await Promise.all(merchantsData.map(async (m) => {
          const { data: nxSumData } = await supabase.from('transactions').select('nx_amount').eq('merchant_code', m.merchant_code);
          const nxSum = nxSumData?.reduce((acc, curr) => acc + (Number(curr.nx_amount) || 0), 0) || 0;
          const txnCount = nxSumData?.length || 0;
          const poolForMerchant = poolData
            ?.filter(c => c.merchant_code === m.merchant_code && c.status === 'active')
            .reduce((acc, c) => acc + Number(c.contribution_amount), 0) || 0;

          return {
            code: m.merchant_code,
            name: m.name || 'Unnamed Duka',
            loc: m.location || 'N/A',
            txns: txnCount,
            nx: nxSum.toFixed(1),
            pool: `+${poolForMerchant.toFixed(0)} NX` 
          };
        }));
        setTopMerchants(enriched);
      }
    } catch (e) {
      console.error('FMCG fetch error:', e);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchBatches();
    fetchFmcgData();
    fetchApiKeys();
    fetchTransactions();
    const ch = supabase
      .channel('fmcg-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restock_batches' }, fetchBatches)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fmcg_margin_contributions' }, fetchFmcgData)
      .subscribe();

    const txInterval = setInterval(fetchTransactions, 20000);

    return () => { 
      supabase.removeChannel(ch); 
      clearInterval(txInterval);
    };
  }, [isLoggedIn, brand?.id]);

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        setTransactions(data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleSetupPassword = async () => {
    setSetupError('');
    if (!setupData.brand || !setupData.apiKey || !setupData.newPassword || !setupData.confirmPassword) {
      setSetupError('All fields required.'); return;
    }
    if (setupData.newPassword !== setupData.confirmPassword) { setSetupError('Passwords do not match.'); return; }
    try {
      const response = await fetch('/api/auth/fmcg-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: setupData.brand, apiKey: setupData.apiKey })
      });
      const authData = await response.json();

      if (!response.ok || !authData.success) {
        setSetupError(authData.error || 'Brand not found or invalid API Key.');
        return;
      }
      
      const partnerId = authData.brand_id;

      // Ensure crypto for frontend
      const encoder = new TextEncoder();
      const pwdData = encoder.encode(setupData.newPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', pwdData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPwd = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error: updateErr } = await supabase.from('fmcg_partners').update({ dashboard_password: hashedPwd }).eq('id', partnerId);
      if (updateErr) throw updateErr;
      setSetupSuccess(true);
      setTimeout(() => { setAuthMode('login'); setSetupSuccess(false); }, 3000);
    } catch (e: any) { setSetupError(e.message || 'Setup failed.'); }
  };

  const fetchApiKeys = async () => {
    if (!brand) return;
    try {
      const res = await fetch(`/api/logistics/api-keys?brand_name=${encodeURIComponent(brand.name)}`, {
        headers: await getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setApiKeys(data.keys || []);
      }
    } catch (err) {
      console.error('Error fetching API keys:', err);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this integration key immediately? All system connections utilizing it will be cut off.")) return;
    setLoading(true);
    try {
      const res = await fetch('/api/logistics/revoke-key', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ key_id: keyId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to revoke key');
      showNotification('Programmatic key revoked successfully', 'success');
      fetchApiKeys();
    } catch (err: any) {
      showNotification('Failed to revoke key: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    if (!brand) return;
    try {
      const res = await fetch(`/api/agents?partner_id=${brand.id}`, {
        headers: await getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) setAgents(data.agents || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const handleOnboardAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;
    setOnboardingAgent(true);
    try {
      const res = await fetch('/api/agents/onboard', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ partner_id: brand.id, name: agentName })
      });
      const data = await res.json();
      if (data.success) {
        setAgentName('');
        fetchAgents();
        showNotification(`${data.agent.name} onboarded with code ${data.agent.agent_code}`, "success");
      }
    } catch (err) {
      console.error('Error onboarding agent:', err);
    } finally {
      setOnboardingAgent(false);
    }
  };

  const handleSuspendAgent = async () => {
    if (!agentToConfirm || confirmationCode !== agentToConfirm.agent_code) {
      showNotification('Confirmation code mismatch!', "error");
      return;
    }
    setIsSuspending(true);
    try {
      const res = await fetch('/api/agents/suspend', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
          agent_id: agentToConfirm.id, 
          agent_code: agentToConfirm.agent_code, 
          confirmed_code: confirmationCode 
        })
      });
      const data = await res.json();
      if (data.success) {
        setAgentToConfirm(null);
        setConfirmationCode('');
        fetchAgents();
        showNotification(`Agent updated successfully`, "success");
      } else {
        showNotification(data.error, "error");
      }
    } catch (err) {
      console.error('Error suspending agent:', err);
    } finally {
      setIsSuspending(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!brand) return;
    if (apiKeys.length > 0) {
      if (!confirm("Regenerating your integration key will immediately revoke and disable all of your existing keys. Do you wish to proceed?")) {
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch('/api/logistics/generate-key', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ brand_name: brand.name, brand_id: brand.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate key');

      setRawKeyToShow(data.key);
      fetchApiKeys();
    } catch (err: any) {
      showNotification('Failed to generate API key: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      if (authMode === 'register') {
        if (!signupData.email || !signupData.password || !signupData.companyName) {
          throw new Error('All fields are required.');
        }

        const signupResponse = await fetch('/api/auth/logistics/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: signupData.email,
            password: signupData.password,
            companyName: signupData.companyName
          })
        });

        const signupResult = await signupResponse.json();
        if (!signupResponse.ok || !signupResult.success) {
          throw new Error(signupResult.error || 'Registration failed.');
        }

        // Automatic login on successful signup
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: signupData.email,
          password: signupData.password
        });
        if (signInError) throw signInError;

        setBrand({
          id: signupResult.partner.id,
          name: signupResult.partner.company_name,
          contact: signupResult.partner.email,
          active: true,
          category: 'Logistics'
        });
        setIsLoggedIn(true);
        showNotification('Logistics Partner registered successfully!', 'success');
      } else {
        // Sign in flow
        if (!loginData.brand || !loginData.password) {
          throw new Error('Email and password are required.');
        }

        const email = loginData.brand.toLowerCase().trim();

        const loginResponse = await fetch('/api/auth/logistics/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: loginData.password
          })
        });

        const loginResult = await loginResponse.json();
        if (!loginResponse.ok || !loginResult.success) {
          throw new Error(loginResult.error || 'Incorrect email or password.');
        }

        // Complete client-side sign in
        await supabase.auth.signInWithPassword({
          email,
          password: loginData.password
        });

        setBrand({
          id: loginResult.partner.id,
          name: loginResult.partner.name,
          contact: loginResult.partner.contact,
          active: true,
          category: 'Logistics'
        });
        setIsLoggedIn(true);
        showNotification('Signed in successfully!', 'success');
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = handleAuth;

  // ── AI BATCH COMPILER & EXPORTS ───────────────────────────
  const handleExportRawBatch = async (batch: Batch) => {
    try {
      const { data: reqs, error } = await supabase
        .from('restock_requests')
        .select('*')
        .eq('batch_id', batch.id);

      if (error) throw error;
      if (!reqs || reqs.length === 0) {
        showNotification("This batch contains no merchant restock requests.", "warning");
        return;
      }

      const merchantCodes = reqs.map(r => r.merchant_code);
      const { data: merchants } = await supabase
        .from('users')
        .select('merchant_code, name, phone, location')
        .eq('role', 'merchant')
        .in('merchant_code', merchantCodes);

      const merchantMap = new Map<string, any>(merchants?.map(m => [m.merchant_code, m]) || []);

      let text = `=== NX BATCH MASTER SHIPMENT FILE ===\n`;
      text += `Batch ID: BATCH-${batch.id}\n`;
      text += `SKU Code: ${batch.sku_code}\n`;
      text += `SKU Label: ${SKU_META[batch.sku_code]?.label || batch.sku_name || 'Generic SKU'}\n`;
      text += `Exported At: ${new Date().toLocaleString()}\n`;
      text += `-------------------------------------\n\n`;

      reqs.forEach((r) => {
        const m = merchantMap.get(r.merchant_code) || { name: `Duka ${r.merchant_code}`, phone: r.merchant_phone || 'N/A', location: 'Unknown Locality (Nairobi Central)' };
        text += `MERCHANT_CODE: ${r.merchant_code} | PHONE: ${m.phone} | ORDER_QTY: ${r.quantity || 1} units | LOCATION: ${m.location}\n`;
      });

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NX_Raw_Batch_${batch.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      showNotification("Export failed: " + e.message, "error");
    }
  };

  const handleDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCompilerInput(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCompilerInput(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const simulateBulkyFile = () => {
    const rawData = `=== NX BATCH MASTER SHIPMENT FILE ===
Batch ID: BATCH-38294
SKU Code: F
SKU Label: Maize & Wheat Flour
Exported At: ${new Date().toLocaleString()}
-------------------------------------

MERCHANT_CODE: M-910 | PHONE: +254712345678 | ORDER_SPEC: Pembe 2kg*15 | ORDER_QTY: 15 units | LOCATION: Kahawa West (Roysambu)
MERCHANT_CODE: M-112 | PHONE: +254787654321 | ORDER_SPEC: Pembe 2kg*8 | ORDER_QTY: 8 units | LOCATION: Githurai (Roysambu)
MERCHANT_CODE: M-305 | PHONE: +254711111111 | ORDER_SPEC: Pembe 2kg*25 | ORDER_QTY: 25 units | LOCATION: Kasarani (Kasarani)
MERCHANT_CODE: M-704 | PHONE: +254722222222 | ORDER_SPEC: Pembe 2kg*10 | ORDER_QTY: 10 units | LOCATION: Clay City (Roysambu)
MERCHANT_CODE: M-443 | PHONE: +254733333333 | ORDER_SPEC: Pembe 2kg*30 | ORDER_QTY: 30 units | LOCATION: Mwiki (Kasarani)
MERCHANT_CODE: M-881 | PHONE: +254744444444 | ORDER_SPEC: Pembe 2kg*12 | ORDER_QTY: 12 units | LOCATION: Kahawa West (Roysambu)
MERCHANT_CODE: M-209 | PHONE: +254755555555 | ORDER_SPEC: Pembe 2kg*18 | ORDER_QTY: 18 units | LOCATION: Githurai (Roysambu)
MERCHANT_CODE: M-104 | PHONE: +254766666666 | ORDER_SPEC: Pembe 2kg*22 | ORDER_QTY: 22 units | LOCATION: Kasarani (Kasarani)
`;
    setCompilerInput(rawData);
  };

  const handleCompileWithAI = async () => {
    if (!compilerInput.trim()) {
      showNotification("Please upload or enter batch content to compile.", "warning");
      return;
    }
    setCompilerLoading(true);
    setCompilerOutput(null);
    try {
      const resp = await fetch('/api/gemini/compile-batch', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ fileContent: compilerInput })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || "Compilation failed");
      
      setCompilerOutput(data.compiled);
      showNotification("AI Regional Compilation complete!", "success");
    } catch (err: any) {
      showNotification("Compilation Error: " + err.message, "error");
    } finally {
      setCompilerLoading(false);
    }
  };

  const handleExportCompiledPlan = () => {
    if (!compilerOutput) return;
    let txt = `=== NX COMPILED LOGISTICS DELIVERY SHEET ===\n`;
    txt += `Batch ID: ${compilerOutput.batchId || 'N/A'}\n`;
    txt += `SKU Code: ${compilerOutput.skuCode || 'N/A'}\n`;
    txt += `Generated: ${new Date().toLocaleString()}\n`;
    txt += `----------------------------------------------\n\n`;

    compilerOutput.localities?.forEach((loc: any) => {
      txt += `[ZONE: ${loc.name.toUpperCase()}]\n`;
      loc.orders?.forEach((o: any) => {
        txt += `• Merchant: ${o.merchantCode} | Name: ${o.merchantName} | Phone: ${o.phone} | Order: ${o.specificOrder} [Qty: ${o.exactQuantity}]\n`;
      });
      txt += `\n`;
    });

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NX_Compiled_RoutePlan_${compilerOutput.batchId || '38294'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDispatchFromCompiler = async () => {
    if (!compilerOutput) return;
    try {
      const newDispatches = compilerOutput.localities.map((loc: any, idx: number) => {
        const totalQty = loc.orders.reduce((acc: number, o: any) => acc + (o.exactQuantity || 0), 0);
        return {
          id: `DSP-${Math.floor(1000 + Math.random() * 9000)}`,
          zone: loc.name,
          driverName: idx === 0 ? "Evans Omoke" : "Brian Mwangi",
          driverPhone: idx === 0 ? "+254 712 345 678" : "+254 799 888 777",
          vehicle: idx === 0 ? "KCY 481G (Light Fuso)" : "KDD 305A (Isuzu FRR)",
          totalMerchants: loc.orders.length,
          totalQty,
          status: 'dispatched',
          points: [
            { name: "FMCG Thika Rd Store", lat: -1.2201, lng: 36.8851, done: true },
            { name: `${loc.name} Hub Entrance`, lat: -1.2150 - (idx * 0.01), lng: 36.8900 + (idx * 0.01), done: false },
            ...loc.orders.map((o: any) => ({
              name: `Duka ${o.merchantCode} (${o.merchantName})`,
              merchantCode: o.merchantCode,
              phone: o.phone,
              orderDesc: o.specificOrder,
              exactQuantity: o.exactQuantity,
              done: false
            }))
          ]
        };
      });

      // Insert/update into our restock_invoices table in database
      for (const loc of compilerOutput.localities) {
        for (const o of loc.orders) {
          const extId = `INV-SIM-${Math.floor(100000 + Math.random() * 900000)}`;
          await supabase.from('restock_invoices').insert({
            merchant_code: o.merchantCode,
            invoice_amount: o.exactQuantity * 75,
            status: 'pending',
            logistics_status: 'dispatched',
            external_id: extId,
            notes: JSON.stringify({
              driver_name: "Evans Omoke",
              driver_phone: "+254712345678",
              vehicle: "KCY 481G (Light Fuso)",
              route_zone: loc.name,
              specific_order: o.specificOrder
            })
          });
        }
      }

      setDispatches(newDispatches);
      setSelectedDispatch(newDispatches[0]);
      setTransitPercent(10);
      setGpsLog(["System: Route dispatches organized successfully.", "Logistics: Truck packed & dispatched from Thika Road FMCG Depot."]);
      setActiveTab('overview');
      showNotification('AI Orders compiled and routing skipped!', 'success');
    } catch (e: any) {
      console.error(e);
      showNotification("Failed to initialize dispatches: " + e.message, "error");
    }
  };

  const handleSimulateHandshake = async () => {
    if (!selectedDispatch) return;
    try {
      const firstMerchantCode = selectedDispatch.points[2]?.merchantCode || 'M-910';
      
      const { error } = await supabase
        .from('restock_invoices')
        .update({ status: 'paid', logistics_status: 'delivered' })
        .eq('merchant_code', firstMerchantCode);

      if (error) throw error;

      const updatedDispatches = dispatches.map(d => {
        if (d.id === selectedDispatch.id) {
          const updatedPoints = d.points.map((p: any) => ({ ...p, done: true }));
          return { ...d, status: 'delivered', points: updatedPoints };
        }
        return d;
      });
      setDispatches(updatedDispatches);
      setSelectedDispatch({ ...selectedDispatch, status: 'delivered', points: selectedDispatch.points.map((p: any) => ({ ...p, done: true })) });
      setTransitPercent(100);
      setGpsLog(prev => [...prev, `Handshake: SECURE PIN Handshake verified successfully for Merchant ${firstMerchantCode}! Status hard-closed.`, `System: Pool contribution limits successfully adjusted.`]);
      showNotification("PIN handshake completed! Invoices fully paid & settled in the database.", "success");
    } catch (e: any) {
      showNotification("Handshake error: " + e.message, "error");
    }
  };

  // ── LOGIN ─────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#f4f5f7] justify-center p-6 font-sans relative overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm mx-auto">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="scale-[0.8] origin-left">
              <NXLogo title="Logistics" />
            </div>
            <div className="text-right border-l border-[#e4e6ea] pl-4">
              <div className="font-bold text-lg text-[#1a1d23]">Logistics Portal</div>
              <div className="text-[10px] text-[#6b7280] uppercase tracking-widest">Fleet & Route Orchestration</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 bg-[#f4f5f7] p-1 rounded-xl mb-8 border border-[#e4e6ea]">
            <button 
              onClick={() => { setAuthMode('login'); setError(''); }}
              className={cn("py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all text-center", authMode === 'login' ? "bg-[#1a1d23] text-white" : "text-[#6b7280] hover:text-[#1a1d23]")}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setError(''); }}
              className={cn("py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all text-center", authMode === 'register' ? "bg-[#1a1d23] text-white" : "text-[#6b7280] hover:text-[#1a1d23]")}
            >
              Register
            </button>
          </div>

          {authMode === 'register' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Company / Fleet Name</label>
                <input type="text" value={signupData.companyName} onChange={e => setSignupData({ ...signupData, companyName: e.target.value })} className="w-full border-2 border-[#e4e6ea] focus:border-[#1a1d23] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors" placeholder="e.g. Nairobi Logistics Hub" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Work Email Address</label>
                <input type="email" value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} className="w-full border-2 border-[#e4e6ea] focus:border-[#1a1d23] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors" placeholder="partner@company.com" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={signupData.password} 
                    onChange={e => setSignupData({ ...signupData, password: e.target.value })} 
                    className="w-full border-2 border-[#e4e6ea] focus:border-[#1a1d23] rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none transition-colors" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#1a1d23] transition-colors cursor-pointer bg-transparent"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle className="w-3 h-3" /> {error}</div>}
              <button disabled={loading} onClick={handleAuth} className="w-full bg-[#1a1d23] text-white font-bold py-3 rounded-xl hover:bg-[#2a2d35] transition-colors mt-4">{loading ? 'Creating Account...' : 'Register & Log In'}</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Work Email Address</label>
                <input type="email" value={loginData.brand} onChange={e => setLoginData({ ...loginData, brand: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full border-2 border-[#e4e6ea] focus:border-[#1a1d23] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors" placeholder="partner@company.com" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={loginData.password} 
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })} 
                    onKeyDown={e => e.key === 'Enter' && handleAuth()} 
                    className="w-full border-2 border-[#e4e6ea] focus:border-[#1a1d23] rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none transition-colors" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#1a1d23] transition-colors cursor-pointer bg-transparent"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle className="w-3 h-3" /> {error}</div>}
              <button disabled={loading} onClick={handleAuth} className="w-full bg-[#1a1d23] text-white font-bold py-3 rounded-xl hover:bg-[#2a2d35] transition-colors mt-2">{loading ? 'Authenticating...' : 'Sign In'}</button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (isLoggedIn && brand && !brand.active) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center p-4 font-sans text-[#1a1d23]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-[#e4e6ea] shadow-xl p-10 w-full max-w-md rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="scale-[0.8] origin-left">
              <NXLogo title="Partner" />
            </div>
            <div className="text-right border-l border-[#e4e6ea] pl-4">
              <div className="font-bold text-xl text-[#1a1d23]">Partner Portal</div>
              <div className="text-[10px] text-[#6b7280] uppercase tracking-widest">Demand Intelligence</div>
            </div>
          </div>

          <div className="text-center py-8 border border-dashed border-[#ffb547]/40 rounded-2xl bg-[#fef3c7]/20 flex flex-col items-center px-6">
            <ShieldAlert className="w-12 h-12 text-[#d97706] mb-4 opacity-80 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-widest mb-2 text-[#d97706]">Verification In Progress</h3>
            <p className="text-[11px] text-[#4b5563] uppercase font-bold tracking-widest max-w-sm leading-relaxed mb-6 text-center">
              Your registration for "{brand.name}" is under manual review.
            </p>
            
            <div className="bg-[#fef3c7]/40 border border-[#fcd34d] rounded-xl p-4 text-left max-w-md mb-6 w-full">
               <div className="text-[10px] uppercase font-bold text-[#b45309] mb-1">Onboarding Policy Notice</div>
               <p className="text-[10px] text-[#4b5563] leading-relaxed">
                  To safeguard the liquidity pools of the NX Live core network, brand connections require manual authorization unless registered via a pre-approved wholesale domain prefix.
               </p>
               <p className="text-[10px] text-[#4b5563] leading-relaxed mt-2 font-semibold">
                  Please contact brand-onboarding@nx-network.com for expedited review.
               </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button 
                 onClick={async () => {
                    setLoading(true);
                    try {
                      const { data, error } = await supabase
                        .from('fmcg_partners')
                        .select('*')
                        .eq('id', brand.id)
                        .single();
                      if (error) throw error;
                      if (data) {
                        setBrand(data);
                      }
                    } catch (err) {
                      console.error('Error fetching partner approval status:', err);
                    } finally {
                      setLoading(false);
                    }
                 }}
                 disabled={loading}
                 className="w-full bg-[#1a1d23] hover:bg-[#2a2d35] text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                 {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                 Check Approval Status
              </button>
              
              <button 
                 onClick={async () => {
                   await supabase.auth.signOut();
                   setIsLoggedIn(false);
                   setBrand(null);
                 }}
                 className="w-full bg-[#f4f5f7] hover:bg-gray-200 border border-[#e4e6ea] text-[#6b7280] hover:text-[#1a1d23] py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                 <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const openBatches   = batches.filter(b => b.status === 'open');
  const activeBatches = batches.filter(b => ['deal_received', 'deal_accepted'].includes(b.status));
  const totalDemand   = openBatches.reduce((a, b) => a + (b.total_quantity || b.total_qty || 0), 0);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#1a1d23] font-sans">
      <AnimatePresence>
        {errorAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className={cn(
              "fixed top-6 right-6 z-[999] p-4 rounded-xl shadow-2xl border flex items-center gap-3 max-w-sm backdrop-blur bg-white/95",
              errorAlert.type === 'error' ? "border-red-200 text-red-800" :
              errorAlert.type === 'success' ? "border-green-200 text-green-800" :
              "border-amber-200 text-amber-800"
            )}
          >
            {errorAlert.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 text-red-500" /> : 
             errorAlert.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-green-500" /> : 
             <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />}
            <div className="text-xs font-semibold leading-relaxed flex-1">{errorAlert.message}</div>
            <button 
              onClick={() => setErrorAlert(null)} 
              className="p-1 hover:bg-black/5 rounded text-inherit shrink-0 cursor-pointer border-0 bg-transparent"
            >
              ✕
            </button>
          </motion.div>
        )}
        {activeBid && (
          <BidModal batch={activeBid} brand={brand} onClose={() => setActiveBid(null)} onSuccess={() => {
            setActiveBid(null); setBidSuccess(true); fetchBatches();
            setTimeout(() => setBidSuccess(false), 4000);
          }} />
        )}
      </AnimatePresence>

      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-bold px-8 py-2.5 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-white animate-pulse" />
            <span>You are currently offline. Operations on AI compiler and direct brand bids are running in local offline cached mode.</span>
          </div>
          <span className="text-[9px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">Cache Active</span>
        </div>
      )}

      <header className="bg-[#1a1d23] text-white h-14 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#22c55e] rounded-md flex items-center justify-center font-extrabold text-xs">NX</div>
          <div className="font-bold text-sm">Partner Intelligence</div>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors">← Landing</a>
          <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-semibold">{brand?.name}</span>
          <NotificationIcon />
          <button onClick={async () => {
            await supabase.auth.signOut();
            setIsLoggedIn(false);
            setBrand(null);
          }} className="text-white/70 hover:text-white text-xs border border-white/20 px-3 py-1 rounded-md transition-colors flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      </header>

      <AnimatePresence>
        {bidSuccess && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#059669] text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" /> Offer submitted! NX will review within 2hrs.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border-b border-[#e4e6ea] px-8 flex overflow-x-auto">
        {[
          { id: 'overview',      label: 'Overview',           icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'demand',        label: 'Live Demand',        icon: <Flame className="w-4 h-4" />, badge: openBatches.length },
          { id: 'merchants',     label: 'Merchants',          icon: <Store className="w-4 h-4" /> },
          { id: 'sku',           label: 'SKU Volume',         icon: <Package className="w-4 h-4" /> },
          { id: 'api_access',    label: 'Programmatic Access',         icon: <Shield className="w-4 h-4" /> },
          { id: 'compiler',      label: 'AI Order Compiler',  icon: <Cpu className="w-4 h-4" />, badgeValue: 'AI' },
          { id: 'intelligence',  label: 'Network map feed', icon: <MapPin className="w-4 h-4" /> },
                            ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
            className={cn('flex items-center gap-2 px-5 py-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap relative',
              activeTab === tab.id ? 'text-[#2563eb] border-[#2563eb]' : 'text-[#6b7280] border-transparent hover:text-[#1a1d23]'
            )}>
            {tab.icon} {tab.label}
            {tab.badge !== undefined && Number(tab.badge) > 0 && (
              <span className="absolute top-3 right-1 bg-[#ef4444] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
            {"badgeValue" in tab && tab.badgeValue && (
              <span className="absolute top-2 right-1.5 bg-[#2563eb] text-white text-[8px] font-extrabold px-1 rounded-sm leading-tight">
                {tab.badgeValue}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="w-full mx-auto p-4 md:p-8">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Merchants Reached',      val: String(stats.merchantsReached), sub: 'Stocking your products' },
                { label: 'Open Demand Batches',    val: String(openBatches.length),     sub: 'Live, accepting bids now' },
                { label: 'Total Units Demanded',   val: totalDemand.toLocaleString(),   sub: 'Across open batches' },
                { label: 'Cycle Transactions',     val: stats.cycleTransactions.toLocaleString(), sub: 'At your merchants' },
              ].map((stat, i) => (
                <div key={i} className="bg-white border border-[#e4e6ea] p-5 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280] mb-3">{stat.label}</div>
                  <div className="text-2xl font-extrabold text-[#1a1d23]">{stat.val}</div>
                  <div className="text-[10px] text-[#6b7280] mt-2">{stat.sub}</div>
                </div>
              ))}
            </div>

            {openBatches.length > 0 && (
              <div className="bg-white border border-[#e4e6ea] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e4e6ea] flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#ef4444]" /> Live Demand — Submit Bids
                  </h3>
                  <button onClick={() => setActiveTab('demand')} className="text-xs text-[#2563eb] font-bold flex items-center gap-1 hover:underline">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {openBatches.slice(0, 4).map(b => {
                  const meta = SKU_META[b.sku_code] ?? { emoji: '📦', label: b.sku_code, unit: 'units' };
                  return (
                    <div key={b.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#fafafa] border-b border-[#f4f5f7] last:border-0">
                      <span className="text-2xl">{meta.emoji}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{meta.label} {b.variant_code && `(${b.variant_code})`}</div>
                        <div className="text-xs text-[#6b7280]">{(b.total_quantity || b.total_qty || 0).toLocaleString()} {meta.unit} · {b.merchant_count} dukas</div>
                      </div>
                      <button onClick={() => { setActiveBid(b); }}
                        className="text-xs font-bold bg-[#1a1d23] text-white px-4 py-2 rounded-lg hover:bg-[#2a2d35] transition-colors flex items-center gap-1">
                        Bid <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-white border border-[#e4e6ea] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e4e6ea]">
                <h3 className="font-bold text-xs uppercase tracking-wider">Top Performing Merchants</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-[#6b7280] border-b border-[#e4e6ea]">
                      {['Code','Name','Location','Cycle Txns','Pool Contribution'].map(h => (
                        <th key={h} className="px-6 py-4 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e6ea]">
                    {topMerchants.length > 0 ? topMerchants.map((row, i) => (
                      <tr key={i} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-[#6b7280]">{row.code}</td>
                        <td className="px-6 py-4 text-sm font-bold">{row.name}</td>
                        <td className="px-6 py-4 text-xs text-[#6b7280]">{row.loc}</td>
                        <td className="px-6 py-4 text-sm">{row.txns}</td>
                        <td className="px-6 py-4 text-sm"><span className="bg-[#d1fae5] text-[#059669] px-2 py-1 rounded-full text-[10px] font-bold">{row.pool}</span></td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-xs text-[#6b7280]">
                          No merchant data recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* LIVE DEMAND BOARD */}
        {activeTab === 'demand' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-xl text-[#1a1d23] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#ef4444]" /> Live Demand Board
                </h2>
                <p className="text-xs text-[#6b7280] mt-1">Aggregated duka restock requests. Submit a price to win the batch.</p>
              </div>
              <button onClick={fetchBatches} className="flex items-center gap-2 text-xs font-bold border border-[#e4e6ea] px-4 py-2 rounded-xl hover:border-[#1a1d23] transition-colors">
                <RefreshCw className={cn('w-3 h-3', batchLoading && 'animate-spin')} /> Refresh
              </button>
            </div>

            <div className="bg-[#1a1d23] text-white rounded-2xl p-6 grid grid-cols-3 gap-6">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Open Windows</div>
                <div className="text-3xl font-extrabold">{openBatches.length}</div>
              </div>
              <div className="border-l border-white/10 pl-6">
                <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Total Units</div>
                <div className="text-3xl font-extrabold">{totalDemand.toLocaleString()}</div>
              </div>
              <div className="border-l border-white/10 pl-6">
                <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Dukas Committed</div>
                <div className="text-3xl font-extrabold">{openBatches.reduce((a, b) => a + b.merchant_count, 0)}</div>
              </div>
            </div>

            {batchLoading ? (
              <div className="flex justify-center py-20 text-[#6b7280] text-sm gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading batches…
              </div>
            ) : openBatches.length === 0 && activeBatches.length === 0 ? (
              <div className="text-center py-24 text-[#6b7280]">
                <ShoppingCart className="w-10 h-10 mx-auto mb-4 opacity-30" />
                <div className="font-bold text-sm">No open batches right now</div>
                <div className="text-xs mt-1">Merchants dial USSD → new batches open every 48hrs</div>
              </div>
            ) : (
              <>
                {openBatches.length > 0 && (
                  <>
                    <p className="font-bold text-xs uppercase tracking-widest text-[#6b7280]">Open — Accepting Bids</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {openBatches.map(b => <BatchCard key={b.id} batch={b} brand={brand} onBid={setActiveBid} myBids={myBids} onExportRaw={handleExportRawBatch} />)}
                    </div>
                  </>
                )}
                {activeBatches.length > 0 && (
                  <>
                    <p className="font-bold text-xs uppercase tracking-widest text-[#6b7280] mt-4">In Progress</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {activeBatches.map(b => <BatchCard key={b.id} batch={b} brand={brand} onBid={setActiveBid} myBids={myBids} onExportRaw={handleExportRawBatch} />)}
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* MERCHANTS */}
        {activeTab === 'merchants' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white border border-[#e4e6ea] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e4e6ea]"><h3 className="font-bold text-xs uppercase tracking-wider">Your Merchants</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="text-[10px] uppercase tracking-widest text-[#6b7280] border-b border-[#e4e6ea]">{['Code','Name','Location','Cycle Txns','Pool'].map(h=><th key={h} className="px-6 py-4 font-bold">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-[#e4e6ea]">
                    {topMerchants.length > 0 ? topMerchants.map((row,i)=>(
                      <tr key={i} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-[#6b7280]">{row.code}</td>
                        <td className="px-6 py-4 text-sm font-bold">{row.name}</td>
                        <td className="px-6 py-4 text-xs text-[#6b7280]">{row.loc}</td>
                        <td className="px-6 py-4 text-sm">{row.txns}</td>
                        <td className="px-6 py-4 text-sm"><span className="bg-[#d1fae5] text-[#059669] px-2 py-1 rounded-full text-[10px] font-bold">{row.pool}</span></td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-xs text-[#6b7280]">
                          No merchant partnerships synchronized yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* SKU */}
        {activeTab === 'sku' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="bg-[#dbeafe] border border-[#bfdbfe] rounded-xl p-5 flex gap-4 items-start">
              <Info className="w-5 h-5 text-[#2563eb] shrink-0" />
              <p className="text-sm text-[#2563eb]">Restock order volumes by SKU. Higher volume = stronger negotiation leverage in the next batch window.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.skuVolumes.map((sku, i)=>{
                const meta = SKU_META[sku.code];
                const isUp = sku.trend.startsWith('+');
                return (
                  <div key={i} className="bg-white border border-[#e4e6ea] rounded-xl p-6 text-center hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-2">{meta?.emoji || '📦'}</div>
                    <div className="font-mono text-sm font-bold mb-1">{sku.code}</div>
                    <div className="text-xs text-[#6b7280] mb-4">{meta?.label || sku.code}</div>
                    <div className="text-2xl font-extrabold text-[#2563eb]">{sku.vol}</div>
                    <div className="text-[10px] text-[#6b7280] mb-2">units across duka network</div>
                    {sku.trend && (
                      <div className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full inline-block', sku.trend.startsWith('+') ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#fef2f2] text-[#ef4444]')}>
                        {sku.trend} vs last cycle
                      </div>
                    )}
                  </div>
                );
              })}
              {stats.skuVolumes.length === 0 && (
                <div className="col-span-5 py-12 text-center text-[#6b7280] text-sm">No SKU inventory data available.</div>
              )}
            </div>
          </motion.div>
        )}

        {/* API ACCESS */}
        {activeTab === 'api_access' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-extrabold text-[#1a1d23]">Programmatic Access & Automation</h1>
                <p className="text-sm text-[#6b7280] mt-1">Manage secure credentials to interface your digital supply systems and ERP directly with NX.</p>
              </div>
              {!rawKeyToShow && (
                <button 
                  onClick={handleGenerateKey}
                  disabled={loading}
                  className="bg-[#1a1d23] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#2a2d35] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
                >
                  <Plus className={cn("w-4 h-4", loading && "animate-spin")} />
                  Generate Integration Key
                </button>
              )}
            </div>



            {rawKeyToShow && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#fef3c7] border-2 border-[#f59e0b]/30 p-8 rounded-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Key className="w-24 h-24 text-[#f59e0b]" /></div>
                <div className="flex items-center gap-2 text-[#b45309] font-bold text-sm mb-2 uppercase tracking-widest">
                  <AlertCircle className="w-4 h-4" /> Security Notice
                </div>
                <h3 className="text-xl font-extrabold text-[#1a1d23] mb-2">Programmatic Integration Key Authorized</h3>
                <p className="text-sm text-[#92400e] mb-6 max-w-lg">
                  Please copy this key now and store it securely. For your security, we cannot show this key to you again.
                </p>

                <div className="flex gap-2">
                  <div className="bg-white border-2 border-[#f59e0b]/50 px-6 py-4 rounded-xl flex-1 font-mono text-[#1a1d23] text-xl font-bold break-all shadow-inner">
                    {rawKeyToShow}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(rawKeyToShow);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className="bg-[#f59e0b] text-white px-8 rounded-xl font-bold uppercase tracking-widest hover:bg-[#d97706] transition-all flex items-center gap-2 shadow-md"
                  >
                    {copySuccess ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copySuccess ? 'Copied' : 'Copy Key'}
                  </button>
                </div>

                <div className="mt-6">
                  <button 
                    onClick={() => setRawKeyToShow(null)}
                    className="text-xs font-bold text-[#b45309] underline hover:text-[#92400e] transition-colors"
                  >
                    I have saved this key securely, close this notice.
                  </button>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white border border-[#e4e6ea] rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-[#e4e6ea] bg-[#fafafa] flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider">Active System Connectors</h3>
                    <div className="px-2 py-0.5 bg-[#d1fae5] text-[#059669] rounded text-[9px] font-bold uppercase">Production</div>
                  </div>
                  <div className="divide-y divide-[#f4f5f7]">
                    {apiKeys.length === 0 ? (
                      <div className="p-16 text-center text-[#6b7280]">
                        <Key className="w-10 h-10 mx-auto mb-4 opacity-10" />
                        <p className="text-sm font-medium">No active integration keys found.</p>
                        <p className="text-xs mt-1">Generate a key to start using the NX APIs.</p>
                      </div>
                    ) : (
                      apiKeys.map(key => (
                        <div key={key.id} className="p-6 flex items-center justify-between hover:bg-[#fafafa] transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#f4f5f7] rounded-xl flex items-center justify-center text-[#1a1d23]">
                              <Shield className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="font-mono text-sm font-bold text-[#1a1d23]">{key.prefix}••••••••{key.last4}</div>
                              <div className="text-[10px] text-[#6b7280] uppercase tracking-widest mt-1 font-bold">Authorized {new Date(key.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#059669] bg-[#d1fae5] px-2.5 py-1 rounded-full uppercase">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                              Active
                            </span>
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all border border-red-200/50"
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-[#e4e6ea] p-6 rounded-2xl">
                  <h3 className="font-bold text-[11px] uppercase tracking-widest text-[#6b7280] mb-4">Programmatic Tasks & Actions</h3>
                  <div className="space-y-3">
                    {[
                      { 
                        name: 'Query SKU Catalog',
                        icon: <Search className="w-3.5 h-3.5" />,
                        desc: 'Request complete pricing and active wholesale catalogues dynamically.',
                        instructions: 'Pull active SKU price grids and volumes into your ERP. This allows you to verify stock requirements and match incoming order allocations against your brand warehouse availability.',
                        code: 'GET /api/fmcg/sku-catalog\nAuthorization: Bearer nx_live_...\nReturns 200 OK with pricing tier models.'
                      },
                      { 
                        name: 'Submit Restock Offers',
                        icon: <Send className="w-3.5 h-3.5" />,
                        desc: 'Send restock bidding allocations directly to merchants.',
                        instructions: 'Automate restock fulfillment. When a merchant places bulk restock bids, query matching batches and post restock bidding quotes programmatically from your digital wholesale supply system.',
                        code: 'POST /api/fmcg/bids\nAuthorization: Bearer nx_live_...\n{\n  "batch_id": "b-987",\n  "bid_price_kes": 17800\n}'
                      },
                      { 
                        name: 'Telemetry Webhooks',
                        icon: <LayoutDashboard className="w-3.5 h-3.5" />,
                        desc: 'Receive system alerts and checkout webhooks in real-time.',
                        instructions: 'Establish a continuous synchronization link. Get instant callbacks when merchants clear checkouts so that your warehousing and dispatch teams can organize delivery logistics immediately.',
                        code: 'POST /your-erp-webhook\n{\n  "event": "merchant.checkout",\n  "shop_code": "SHOP-A",\n  "total_volume_kes": 18500\n}'
                      },
                    ].map(doc => (
                      <button 
                        key={doc.name} 
                        onClick={() => setSelectedDoc(doc)}
                        className="w-full text-left p-4 border border-[#f4f5f7] hover:border-[#1a1d23] hover:bg-[#fafafa] rounded-xl transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#6b7280] group-hover:text-[#1a1d23]">{doc.icon}</span>
                            <span className="text-xs font-bold text-[#1a1d23]">{doc.name}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#e4e6ea] group-hover:text-[#1a1d23]" />
                        </div>
                        <p className="text-[10px] text-[#6b7280] uppercase tracking-wider leading-normal">{doc.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {selectedDoc && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="fixed inset-0 z-50 bg-[#1a1d23]/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setSelectedDoc(null)}
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white border text-[#1a1d23] border-[#e4e6ea] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-[#e4e6ea] bg-[#fafafa] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[#6b7280]">{selectedDoc.icon}</span>
                      <h3 className="font-extrabold text-[#1a1d23] text-sm uppercase tracking-wider">{selectedDoc.name}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedDoc(null)}
                      className="text-[#6b7280] hover:text-[#1a1d23] transition-colors p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-8 space-y-6">
                    <div>
                      <h4 className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-2">Operation & Context</h4>
                      <p className="text-sm text-[#1a1d23] leading-relaxed font-medium">{selectedDoc.instructions}</p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-2">Automated Integration Blueprint</h4>
                      <pre className="bg-[#f4f5f7] border border-[#e4e6ea] p-5 rounded-xl font-mono text-xs text-[#1a1d23] overflow-x-auto leading-relaxed font-bold">
                        {selectedDoc.code}
                      </pre>
                    </div>
                  </div>
                  <div className="p-6 border-t border-[#e4e6ea] bg-[#fafafa] flex justify-end">
                    <button 
                      onClick={() => setSelectedDoc(null)}
                      className="bg-[#1a1d23] text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-[#2a2d35] transition-colors"
                    >
                      Acknowledge Blueprint
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* AI COMPILER */}
        {activeTab === 'compiler' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-extrabold text-[#1a1d23] flex items-center gap-3">
                  <Cpu className="text-[#2563eb]" /> 
                  AI Order Compiler
                </h1>
                <p className="text-sm text-[#6b7280] mt-1">Intelligently bundle bulky batch data files by geographical localities.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={simulateBulkyFile}
                  className="bg-white border border-[#e4e6ea] text-[#1a1d23] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#f4f5f7] transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Load Sample Master File
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#1a1d23] uppercase tracking-wider">Raw File Input</h3>
                  <label className="cursor-pointer bg-white border border-[#e4e6ea] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#f4f5f7] transition-all flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload .TXT
                    <input type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
                
                <div 
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  className={cn("w-full h-96 rounded-2xl border-2 border-dashed p-4 transition-all overflow-hidden flex flex-col", dragActive ? "border-[#2563eb] bg-[#2563eb]/5" : "border-[#e4e6ea] bg-white")}
                >
                  {compilerInput ? (
                    <textarea 
                      value={compilerInput}
                      onChange={e => setCompilerInput(e.target.value)}
                      className="w-full h-full resize-none outline-none font-mono text-[10px] text-[#6b7280] bg-transparent whitespace-pre flex-1"
                      placeholder="Paste raw batch export here..."
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#6b7280] text-center pointer-events-none">
                      <FileText className="w-8 h-8 mb-4 text-[#e4e6ea]" />
                      <p className="text-sm font-bold">Drag & drop raw batch file here</p>
                      <p className="text-xs mt-1 max-w-[200px]">Or click the upload button above or paste raw log data.</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCompileWithAI}
                  disabled={!compilerInput || compilerLoading}
                  className="w-full bg-[#2563eb] text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {compilerLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {compilerLoading ? 'AI Compiling Regions...' : 'Compile via Gemini AI'}
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#1a1d23] uppercase tracking-wider">Compiled Itinerary</h3>
                  {compilerOutput && (
                    <button onClick={handleExportCompiledPlan} className="bg-white border border-[#e4e6ea] text-[#1a1d23] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#f4f5f7] transition-all flex items-center gap-2">
                       <Download className="w-4 h-4" /> Export Itinerary
                    </button>
                  )}
                </div>
                
                <div className="bg-[#1a1d23] rounded-2xl p-6 h-96 overflow-y-auto w-full custom-scrollbar">
                  {!compilerOutput && !compilerLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-white/30 text-center">
                      <Cpu className="w-12 h-12 mb-4 opacity-50" />
                      <p className="font-bold">Awaiting AI Compilation</p>
                      <p className="text-xs mt-1">Compiled localized grouping will appear here.</p>
                    </div>
                  )}
                  {compilerLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-white/50 text-center">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                        <RefreshCw className="w-8 h-8 mb-4" />
                      </motion.div>
                      <p className="font-mono text-xs">Analyzing spatial clustering...</p>
                    </div>
                  )}
                  {compilerOutput && (
                    <div className="space-y-6">
                      <div className="border-b border-white/10 pb-4 mb-4">
                        <div className="text-[10px] text-white/50 uppercase tracking-widest">Compiled Route Plan</div>
                        <div className="font-mono text-white text-sm mt-1">{compilerOutput.batchId} / SKU: {compilerOutput.skuCode}</div>
                      </div>
                      
                      {compilerOutput.localities?.map((loc: any, idx: number) => (
                        <div key={idx} className="bg-white/5 rounded-xl border border-white/10 p-4">
                          <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#4d9fff]" /> {loc.name}
                          </h4>
                          <div className="space-y-2">
                            {loc.orders?.map((o: any, i: number) => (
                              <div key={i} className="flex flex-col gap-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[#4d9fff] font-mono text-xs font-bold">{o.merchantCode}</span>
                                  <span className="text-white/40 text-[10px] font-mono">{o.phone}</span>
                                </div>
                                <div className="text-white text-xs">{o.merchantName}</div>
                                <div className="text-white/60 text-[10px] flex justify-between items-center mt-1">
                                  <span className="truncate mr-2 max-w-[150px]">{o.specificOrder}</span>
                                  <span className="bg-[#4d9fff]/20 text-[#4d9fff] px-2 py-0.5 rounded font-bold text-[9px]">QTY: {o.exactQuantity}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                
              </div>
            </div>
          </motion.div>
        )}

        

        {/* NETWORK MAP FEED TAB */}
        {activeTab === 'intelligence' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#e4e6ea] pb-6">
              <div>
                <h1 className="text-3xl font-extrabold text-[#1a1d23] flex items-center gap-3">
                  <MapPin className="text-[#2563eb]" />
                  Network map feed
                </h1>
                <p className="text-sm text-[#6b7280] mt-1 font-medium">Real-time geocoded telemetry of high-density wholesale clusters and micro-retail duka nodes in Kenya.</p>
              </div>

              {/* Persistent View Switcher Toggle - ALWAYS VISIBLE throughout */}
              <div className="flex bg-[#f4f5f7] p-1 rounded-xl border border-[#e4e6ea] shadow-inner">
                <button 
                  id="partner-map-mode-toggle"
                  onClick={() => setIntelViewMode('map')}
                  className={cn(
                    "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                    intelViewMode === 'map' ? "bg-white text-[#1a1d23] font-extrabold shadow" : "text-[#6b7280] hover:text-[#1a1d23]"
                  )}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  Interactive Map
                </button>
                <button 
                  id="partner-feed-mode-toggle"
                  onClick={() => setIntelViewMode('feed')}
                  className={cn(
                    "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                    intelViewMode === 'feed' ? "bg-white text-[#1a1d23] font-extrabold shadow" : "text-[#6b7280] hover:text-[#1a1d23]"
                  )}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Live Activity Feed
                </button>
              </div>
            </div>

            {intelViewMode === 'map' ? (
              /* Leaflet/Google Maps Dual Intelligence Map with Geolocation */
              <div className="bg-white border border-[#e4e6ea] rounded-3xl p-6 shadow-sm relative overflow-hidden animate-fade-in space-y-4">
                {/* Map Controls - Positioned directly above, not in the map */}
                <div className="bg-[#f4f5f7] border border-[#e4e6ea] p-2 rounded-xl flex items-center justify-between shadow-sm max-w-full overflow-x-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-mono font-bold px-1">Map View Mode:</span>
                    <button 
                      onClick={() => setIntelHeatmapMode(false)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${!intelHeatmapMode ? 'bg-white text-[#1a1d23] shadow-sm border border-[#e4e6ea]' : 'text-[#6b7280] hover:text-[#1a1d23]'}`}
                    >
                      Pins
                    </button>
                    <button 
                      onClick={() => setIntelHeatmapMode(true)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${intelHeatmapMode ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20' : 'text-[#6b7280] hover:text-[#1a1d23]'}`}
                    >
                      Heatmap
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border border-[#e4e6ea] h-[600px] relative">
                  <MapContainer 
                    center={[intelMapCenter.lat, intelMapCenter.lng]} 
                    zoom={intelMapZoom === 12 ? 6 : intelMapZoom} 
                    minZoom={2}
                    scrollWheelZoom={true} 
                    style={{ height: '100%', width: '100%', background: '#ffffff' }}
                  >
                    <MapRecenter center={intelMapCenter} zoom={intelMapZoom} />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                  
                  {intelHeatmapMode ? (
                     intelMapPoints.map((pt, i) => (
                       <div key={i}>
                         <CircleMarker center={[pt.lat, pt.lng]} radius={15} pathOptions={{ stroke: false, fillColor: '#ff0000', fillOpacity: 0.2 }} />
                         <CircleMarker center={[pt.lat, pt.lng]} radius={30} pathOptions={{ stroke: false, fillColor: '#ef4444', fillOpacity: 0.1 }} />
                         <CircleMarker center={[pt.lat, pt.lng]} radius={50} pathOptions={{ stroke: false, fillColor: '#f59e0b', fillOpacity: 0.05 }} />
                       </div>
                     ))
                  ) : (
                     intelMapPoints.map((pt, i) => (
                       <Marker key={i} position={[pt.lat, pt.lng]} icon={pt.type === 'hub' ? customHubIconPartner : customShopIconPartner}>
                         <Popup>
                           <div className="font-sans text-[11px] text-black">
                             <span className={cn("inline-block uppercase tracking-wider block text-[13px] mb-1 font-bold", pt.tier === 'HUB' ? "text-[#2563eb]" : pt.tier === 'CERTIFIED' ? "text-[#059669]" : "text-red-500")}>
                                {pt.type === 'hub' ? '🏢 ' : '🏪 '}{pt.name}
                             </span>
                             <span className="block mt-1">Tier: <b className={cn(pt.tier === 'HUB' && "text-[#2563eb]")}>{pt.tier}</b></span>
                             <span className="block text-[10px] mt-1 text-gray-500 whitespace-pre-wrap">{pt.role.replace(`Franchise Tier: ${pt.tier} `, '')}</span>
                           </div>
                         </Popup>
                       </Marker>
                     ))
                  )}
                </MapContainer>

                {/* Intel Selected Pin Details Card */}
                {intelSelectedPin && (
                  <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-md border border-[#e4e6ea] p-5 rounded-xl shadow-lg max-w-xs w-[calc(100%-2rem)]">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[9px] font-mono tracking-widest text-[#2563eb] bg-[#2563eb]/10 px-2 py-0.5 rounded uppercase font-bold font-display">
                          {intelSelectedPin.type}
                        </span>
                        <h4 className="font-display font-bold text-sm text-[#1a1d23] mt-1.5">{intelSelectedPin.name || 'NX Intelligence Node'}</h4>
                      </div>
                      <button 
                        onClick={() => setIntelSelectedPin(null)}
                        className="text-neutral-500 hover:text-black text-xs font-bold font-mono px-1.5 py-0.5 rounded hover:bg-black/5"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <p className="text-xs text-[#4b5563] whitespace-pre-line leading-relaxed">
                      {intelSelectedPin.role}
                    </p>
                  </div>
                )}

              </div>
            </div>
            ) : (
              /* Live Activity Feed Content */
              <div className="space-y-6 animate-fade-in text-[#1a1d23]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-[#e4e6ea] p-5 rounded-2xl relative overflow-hidden shadow-sm">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Total Live Telemetry</div>
                    <div className="text-2xl font-extrabold text-[#1a1d23]">{Math.max(transactions.length, 5)} Nodes</div>
                    <div className="text-[10px] text-green-600 mt-1 font-semibold">✦ Real-time synchronized stream</div>
                  </div>
                  <div className="bg-white border border-[#e4e6ea] p-5 rounded-2xl relative overflow-hidden shadow-sm">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Total Traded GMV Volume</div>
                    <div className="text-2xl font-extrabold text-[#e28743]">
                      KES {(transactions.reduce((acc, curr) => acc + Number(curr.amount_ksh || curr.amount || 0), 0) || 50140).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[#6b7280] mt-1">Kenya informal market liquidity</div>
                  </div>
                  <div className="bg-white border border-[#e4e6ea] p-5 rounded-2xl relative overflow-hidden shadow-sm">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Channel Activity Status</div>
                    <div className="text-2xl font-extrabold text-[#059669] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
                      84.21 Kbps
                    </div>
                    <div className="text-[10px] text-[#6b7280] mt-1">Nominal stream heartbeat</div>
                  </div>
                </div>

                <div className="bg-white border border-[#e4e6ea] rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-[#e4e6ea] flex justify-between items-center bg-gray-50/50">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#1a1d23]">Live Activity Logs Feed</h3>
                      <p className="text-[10px] text-[#6b7280] uppercase tracking-widest mt-1">Incoming telemetry from merchant USSD dialers</p>
                    </div>
                    {transactionsLoading && <Loader2 className="w-4 h-4 text-[#e28743] animate-spin" />}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="bg-gray-100 text-[#6b7280] font-bold uppercase tracking-widest text-[9px] border-b border-[#e4e6ea]">
                          <th className="px-8 py-4">Timestamp</th>
                          <th className="px-8 py-4">Merchant Code</th>
                          <th className="px-8 py-4">Absolute Amount</th>
                          <th className="px-8 py-4">Loyalty Earned</th>
                          <th className="px-8 py-4">Duka Verification</th>
                          <th className="px-8 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e4e6ea]">
                        {(transactions.length > 0 ? transactions : [
                          { id: 't1', created_at: new Date(Date.now() - 3 * 60000).toISOString(), merchant_code: 'DUKA_7721', amount_ksh: 4850, nx_redeemed: 120, status: 'confirmed' },
                          { id: 't2', created_at: new Date(Date.now() - 17 * 60000).toISOString(), merchant_code: 'DUKA_2041', amount_ksh: 12400, nx_redeemed: 350, status: 'completed' },
                          { id: 't3', created_at: new Date(Date.now() - 41 * 60000).toISOString(), merchant_code: 'DUKA_5510', amount_ksh: 750, nx_redeemed: 20, status: 'confirmed' },
                          { id: 't4', created_at: new Date(Date.now() - 75 * 60000).toISOString(), merchant_code: 'DUKA_8892', amount_ksh: 18900, nx_redeemed: 500, status: 'completed' },
                          { id: 't5', created_at: new Date(Date.now() - 120 * 60000).toISOString(), merchant_code: 'DUKA_1203', amount_ksh: 3200, nx_redeemed: 80, status: 'confirmed' }
                        ]).map((txn, index) => (
                          <tr key={txn.id || index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-8 py-4 font-mono text-[#1a1d23]">
                              {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-8 py-4 font-mono font-bold text-[#e28743]">
                              {txn.merchant_code}
                            </td>
                            <td className="px-8 py-4 text-[#1a1d23] font-mono font-bold">
                              KES {(txn.amount_ksh || txn.amount || 0).toLocaleString()}
                            </td>
                            <td className="px-8 py-4 font-mono text-green-600 font-bold">
                              +{txn.nx_redeemed || txn.nx_amount || 0} NX
                            </td>
                            <td className="px-[#6b7280] py-4 text-[#6b7280] uppercase tracking-wider text-[9px]">
                              {txn.merchant_code?.startsWith('DUKA_7') ? 'Unilever Boost active' : 'Standard wholesale restock'}
                            </td>
                            <td className="px-8 py-4">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[8px] font-bold font-mono tracking-widest uppercase",
                                txn.status === 'confirmed' || txn.status === 'completed' ? "bg-green-100 text-green-800 border border-green-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                              )}>
                                {txn.status || 'confirmed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        

      </main>

      <footer className="w-full mx-auto px-4 md:px-8 py-12 border-t border-[#e4e6ea] text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#6b7280] mb-4">Support</div>
        <a href="tel:0781550151" className="text-lg text-[#1a1d23] font-bold block">0781550151</a>
        <p className="text-[11px] text-[#6b7280] mt-1">Contact NX Support for any portal issues or account queries.</p>
      </footer>
    </div>
  );
}
