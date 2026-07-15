import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Store, Package, Truck, Trophy, Zap, Clock, BarChart3, LogOut, AlertCircle, CheckCircle2, Activity, Key, Copy, Shield, Eye, EyeOff, Plus, ChevronRight, Check, ShieldAlert, RefreshCw, Loader2, Sparkles, Cpu, ChevronDown, Award, HelpCircle, MapPin, User, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import NXLogo from '../../components/NXLogo';
import NotificationIcon from '../../components/NotificationIcon';

// Map Imports for Custom Leaflet Implementation
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const hasGoogleMapsKey = false;

function MapRecenter({ center, zoom }: { center: { lat: number, lng: number }, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

// Fix typical Leaflet marker icon asset issue
const customShopIcon = new L.DivIcon({
  html: '<div class="text-2xl filter drop-shadow">🏪</div>',
  className: 'custom-leaflet-shop',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const customHubIcon = new L.DivIcon({
  html: '<div class="text-2xl filter drop-shadow border-2 border-nx-amber rounded-full bg-nx-amber/20 p-0.5">🏬</div>',
  className: 'custom-leaflet-hub',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

/**
 * Generates a secure random API key with a prefix.
 */
function generateSecureApiKey(): string {
  const prefix = 'nx_live_';
  // Use Web Crypto API for secure random values
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  // Convert to base64 and make it URL safe
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

export default function FmcgsPortal() {
  const getAuthHeaders = async (extraHeaders: Record<string, string> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || 'mock_fmcg_token';
    return {
      'Authorization': `Bearer ${token}`,
      ...extraHeaders
    };
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
  
  // Whitelist Retrieve Key States
  const [whitelistEmail, setWhitelistEmail] = useState('');
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [whitelistResult, setWhitelistResult] = useState<{ brand_name: string; email: string; magic_link: string } | null>(null);
  const [whitelistError, setWhitelistError] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // API Key Management States
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [rawKeyToShow, setRawKeyToShow] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [copyDocSuccess, setCopyDocSuccess] = useState(false);

  const [contributionStatus, setContributionStatus] = useState('');
  const [targetMerchant, setTargetMerchant] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  const [acceptedPools, setAcceptedPools] = useState<any[]>([]);
  const [merchantContributions, setMerchantContributions] = useState<any[]>([]);
  const [bonusStatus, setBonusStatus] = useState<string | null>(null);

  // Analytics States
  const [skuStatus, setSkuStatus] = useState<any[]>([]);
  const [territoryStats, setTerritoryStats] = useState<any[]>([]);
  const [predictiveAlerts, setPredictiveAlerts] = useState<any[]>([]);
  const [velocityNodes, setVelocityNodes] = useState<any[]>([]);
  const [hubStats, setHubStats] = useState({ health: 'Stable', fillRate: '0%', reorders: '0', turnover: '0.0' });
  const [warehouseData, setWarehouseData] = useState<any[]>([]);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true); // Default to true to avoid flash
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');

  const [agents, setAgents] = useState<any[]>([]);
  const [agentName, setAgentName] = useState('');
  const [onboardingAgent, setOnboardingAgent] = useState(false);
  const [agentToConfirm, setAgentToConfirm] = useState<any>(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

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

  // Safety Rails States
  const [simTier, setSimTier] = useState<'BASIC' | 'CERTIFIED' | 'HUB'>('BASIC');
  const [simMargin, setSimMargin] = useState<number>(1000);
  const [simBoosts, setSimBoosts] = useState<number>(150);
  const [simUtilization, setSimUtilization] = useState<number>(45);

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
            
            // Trigger raw alert fallback if toast is not ready, or a standard visual modal
            alert(`Claim successfully executed!\n\nBrand: ${data.brand_name}\nIdentity Key: ${data.apiKey}\n\nYou have been fast-tracked. Please define your Access PIN below to lock your portal workspace.`);

            // Strip from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('signup_token');
            window.history.replaceState({}, '', url.pathname + url.search);
          } else {
            alert(data.error || 'Failed to claim secure setup key.');
          }
        } catch (err: any) {
          console.error('[Token claim exception]', err);
        }
      }
    };
    handleSignupToken();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
// removed call to checkEmailStatus
    fetchAcceptedPools();
    fetchAnalytics();
    fetchApiKeys();
    fetchAgents();
    fetchTransactions();
    const sub = supabase.channel('fmcg_pools_dedicated')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fmcg_margin_contributions' }, fetchAcceptedPools)
      .subscribe();
    
    // Refresh analytics periodically
    const analyticsInterval = setInterval(fetchAnalytics, 60000);
    const transactionsInterval = setInterval(fetchTransactions, 20000);

    return () => { 
      supabase.removeChannel(sub); 
      clearInterval(analyticsInterval);
      clearInterval(transactionsInterval);
    };
  }, [isLoggedIn]);

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

// removed email verification requirement

  const fetchAnalytics = async () => {
    try {
      // 1. SKU Status
      const { data: inv } = await supabase.from('merchant_inventory').select('sku_code, quantity');
      const { data: catalog } = await supabase.from('sku_catalog').select('sku_code, name_en');
      
      const skuMap: any = {};
      inv?.forEach(item => {
        let code = item.sku_code;
        if (code === 'MF' || code === 'FL') {
            code = 'F';
        }
        if (!skuMap[code]) skuMap[code] = 0;
        skuMap[code] += item.quantity;
      });

      let cleanedCatalog = catalog || [];
      let hasF = false;
      cleanedCatalog = cleanedCatalog.map(sku => {
        if (sku.sku_code === 'MF' || sku.sku_code === 'FL' || sku.sku_code === 'F') {
            return { ...sku, sku_code: 'F', name_en: 'Maize & Wheat Flour' };
        }
        return sku;
      }).filter(sku => {
        if (sku.sku_code === 'F') {
            if (hasF) return false;
            hasF = true;
        }
        return true;
      });

      const processedSkuStatus = cleanedCatalog.slice(0, 5).map(sku => {
        const total = skuMap[sku.sku_code] || 0;
        return {
          name: sku.name_en,
          status: total > 100 ? 'Healthy' : total > 20 ? 'Action Needed' : 'Low Stock',
          color: total > 100 ? 'text-nx-green' : total > 20 ? 'text-nx-amber' : 'text-[#ff4757]',
          bg: total > 100 ? 'bg-nx-green/5' : total > 20 ? 'bg-nx-amber/5' : 'bg-[#ff4757]/5',
          border: total > 100 ? 'border-nx-green/20' : total > 20 ? 'border-nx-amber/20' : 'border-[#ff4757]/20'
        };
      });
      setSkuStatus(processedSkuStatus);

      // 2. Territory Performance
      const { data: merchants } = await supabase.from('merchants').select('location');
      const locationMap: any = {};
      merchants?.forEach(m => {
        const loc = m.location || 'Unknown';
        locationMap[loc] = (locationMap[loc] || 0) + 1;
      });
      const totalMerchants = merchants?.length || 1;
      const sortedLocations = Object.entries(locationMap)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]: any) => ({
          name,
          share: Math.round((count / totalMerchants) * 100) + '%',
          grow: 'Upward' 
        }));
      setTerritoryStats(sortedLocations);

      // 3. Predictive Radar (Low inventory nodes)
      const { data: lowInv } = await supabase
        .from('merchant_inventory')
        .select('merchant_code, sku_code, quantity, merchants!inner(name)')
        .lt('quantity', 20)
        .limit(3);
      
      setPredictiveAlerts((lowInv || []).map(item => ({
        id: item.merchant_code,
        name: (item as any).merchants?.name || 'M-Node',
        sku: item.sku_code,
        ETA: 'Calculated at checkout',
        risk: item.quantity < 5 ? 'high' : 'med'
      })));

      // 4. Velocity Nodes
      const { data: txns } = await supabase.from('transactions').select('merchant_code');
      const txMap: any = {};
      txns?.forEach(t => {
        txMap[t.merchant_code] = (txMap[t.merchant_code] || 0) + 1;
      });
      
      const { data: topMerchants } = await supabase.from('merchants').select('merchant_code, name').limit(10);
      const movers = (topMerchants || [])
        .map(m => ({ 
          id: m.merchant_code, 
          name: m.name, 
          vol: txMap[m.merchant_code] || 0 
        }))
        .sort((a, b) => b.vol - a.vol)
        .slice(0, 4)
        .map((m, idx) => ({
          ...m,
          vol: m.vol + ' units',
          rank: idx + 1,
          p: 'Verified Node'
        }));
      setVelocityNodes(movers);

      // 5. Hub Stats
      const totalInvCount = inv?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      setHubStats({
        health: totalInvCount > 1000 ? 'Optimal' : 'Checking',
        fillRate: Math.min(100, Math.round((totalInvCount / 5000) * 100)) + '%',
        reorders: String(lowInv?.length || 0),
        turnover: 'Real-time'
      });

      // 6. Warehouse Allocation Table
      setWarehouseData(cleanedCatalog.slice(0, 4).map(sku => {
        const total = skuMap[sku.sku_code] || 0;
        return {
          id: sku.sku_code,
          name: sku.name_en,
          qty: total.toLocaleString(),
          vel: 'Calculating...',
          trend: 'STABLE'
        };
      }));

    } catch (err) {
      console.error('Analytics fetch error:', err);
    }
  };

  const fetchAcceptedPools = async () => {
    const { data } = await supabase
      .from('fmcg_margin_contributions')
      .select('*, merchant:merchant_code(name)')
      .eq('fmcg_name', brand?.name);
    
    const today = new Date().toISOString().slice(0, 10);
    setAcceptedPools((data || []).filter(p => p.status === 'active' && (!p.effective_to || p.effective_to >= today)));
    
    // Aggregation Logic for Merchant Contributions
    const agg: any = {};
    (data || []).forEach(p => {
      const mCode = p.merchant_code;
      const isExpired = p.effective_to && p.effective_to < today;
      if (!agg[mCode]) {
        agg[mCode] = {
          code: mCode,
          name: p.merchant?.name || 'Shop Node',
          total: 0,
          pending: 0,
          active: 0,
          expired: 0,
          lastInjection: p.created_at
        };
      }
      agg[mCode].total += p.contribution_amount;
      if (p.status === 'pending') agg[mCode].pending += p.contribution_amount;
      else if (isExpired) agg[mCode].expired += p.contribution_amount;
      else if (p.status === 'active') agg[mCode].active += p.contribution_amount;
      
      if (new Date(p.created_at) > new Date(agg[mCode].lastInjection)) {
        agg[mCode].lastInjection = p.created_at;
      }
    });
    setMerchantContributions(Object.values(agg));
  };

  const fetchApiKeys = async () => {
    if (!brand) return;
    try {
      const res = await fetch(`/api/fmcg/api-keys?brand_name=${encodeURIComponent(brand.name)}`, {
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
    if (!window.confirm("Are you sure you want to revoke this Programmatic Access Key? Any active automated syncs using this key will immediately fail.")) return;
    try {
      const res = await fetch('/api/fmcg/revoke-key', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ key_id: keyId })
      });
      const data = await res.json();
      if (data.success) {
        alert("Programmatic access key revoked successfully.");
        fetchApiKeys();
      } else {
        alert("Failed to revoke key: " + (data.error || 'Server error'));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
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
        alert(`Success: ${data.agent.name} onboarded with code ${data.agent.agent_code}`);
      }
    } catch (err) {
      console.error('Error onboarding agent:', err);
    } finally {
      setOnboardingAgent(false);
    }
  };

  const handleSuspendAgent = async () => {
    if (!agentToConfirm || confirmationCode !== agentToConfirm.agent_code) {
      alert('Confirmation code mismatch!');
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
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Error suspending agent:', err);
    } finally {
      setIsSuspending(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!brand) return;
    setLoading(true);
    try {
      const res = await fetch('/api/fmcg/generate-key', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ brand_name: brand.name, brand_id: brand.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate key');

      setRawKeyToShow(data.key);
      fetchApiKeys();
    } catch (err: any) {
      alert('Failed to generate API key: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndSignup = async () => {
    setError('');
    setLoading(true);
    try {
      // 1. Verify OTP
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupData.email, otp: verificationOtp })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.error || 'Invalid OTP');

      // 2. Sign up via proxy to auto-confirm
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: signupData.email, 
          password: signupData.password, 
          companyName: signupData.companyName 
        })
      });
      const resData = await response.json();
      if (!response.ok || !resData.success) throw new Error(resData.error || 'Signup failed');

      // 3. Sign in immediately
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: signupData.email,
        password: signupData.password
      });
      if (signInError) throw signInError;

      // 4. Set the partner records returned from the backend (inserted using service role)
      if (!resData.fmcgPartner) {
        throw new Error('Failed to create partner profile in the system.');
      }

      setBrand(resData.fmcgPartner);
      setShowEmailVerification(false);
      setIsLoggedIn(true);
    } catch (err: any) {
      setError(err.message);
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
           throw new Error('All fields required');
        }
        const res = await fetch('/api/auth/send-otp', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ email: signupData.email, type: 'fmcg_verification' })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send verification code');
        setShowEmailVerification(true);
      } else {
        // Custom Secure Login Flow using client-side Supabase Auth first
        if (!loginData.brand || !loginData.password) { setError('All fields required.'); setLoading(false); return; }
        
        let targetEmail = loginData.brand.toLowerCase().trim();
        let directAuthSuccess = false;
        let pId = null;

        // Try direct Supabase Sign-in
        try {
          if (!targetEmail.includes('@')) {
            // Retrieve email for this brand name
            const { data: pRec } = await supabase
              .from('fmcg_partners')
              .select('contact')
              .ilike('name', targetEmail)
              .maybeSingle();
            
            if (pRec?.contact) {
              targetEmail = pRec.contact;
            }
          }

          if (targetEmail.includes('@')) {
            const { data: authResult, error: signInError } = await supabase.auth.signInWithPassword({
              email: targetEmail,
              password: loginData.password
            });

            if (!signInError && authResult?.user) {
              pId = authResult.user.id;
              directAuthSuccess = true;
            }
          }
        } catch (e) {
          console.warn("Client-side direct login skipped or error:", e);
        }

        let partnerData = null;

        if (directAuthSuccess && pId) {
          // Resolve standard fmcg_partner profile from the database
          const { data } = await supabase
            .from('fmcg_partners')
            .select('*')
            .or(`contact.ilike."${targetEmail}",id.eq."${pId}"`)
            .maybeSingle();
          if (data) {
            partnerData = data;
          } else {
            // Find by user_id linked in standard partners table
            const { data: pData } = await supabase.from('partners').select('*').eq('user_id', pId).maybeSingle();
            if (pData) {
              partnerData = {
                id: pData.id,
                name: pData.company_name,
                contact: targetEmail,
                active: pData.status === 'active',
                category: 'Partner'
              };
            }
          }
        }

        // Fallback to Backend proxy in case user hasn't synced with Auth schema or uses old SHA256 hashed password
        if (!partnerData) {
          const response = await fetch('/api/auth/fmcg-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brand: loginData.brand, password: loginData.password })
          });
          const authData = await response.json();

          if (!response.ok || !authData.success) {
            setError(authData.error || 'Incorrect brand name or password.');
            setLoading(false);
            return;
          }

          const { data } = await supabase
            .from('fmcg_partners')
            .select('*')
            .eq('id', authData.brand_id)
            .maybeSingle();
          partnerData = data;

          if (!partnerData) {
            // Standard partners check
            const { data: pData } = await supabase.from('partners').select('*').eq('id', authData.brand_id).maybeSingle();
            if (pData) {
               partnerData = {
                 id: pData.id,
                 name: pData.company_name,
                 contact: pData.contact || loginData.brand,
                 active: pData.status === 'active',
                 category: 'Partner'
               };
            }
          }
          
          if (partnerData) {
            // Ensure client-side session is logged in in the background too
            try {
              await supabase.auth.signInWithPassword({
                email: partnerData.contact || loginData.brand,
                password: loginData.password
              });
            } catch (e) {}
          }
        }

        if (!partnerData) {
          setError('Could not resolve business partner profile.');
          setLoading(false);
          return;
        }

        setBrand(partnerData); 
        setIsLoggedIn(true);
      }
    } catch (e: any) { 
      setError(e.message || 'Auth failed.'); 
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = handleAuth; // Alias for backward compatibility if needed

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

  const handleContribute = async () => {
    if (!targetMerchant || !targetAmount) return;
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + Number(expiryDays || 30));

      const response = await fetch('/api/fmcg/contribute', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          merchant_code: targetMerchant,
          fmcg_name: brand?.name || 'Brookside (Dedicated)',
          contribution_amount: Number(targetAmount),
          effective_from: new Date().toISOString().slice(0, 10),
          effective_to: expiryDate.toISOString().slice(0, 10),
          status: 'pending'
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Margin injection failed');
      }

      setContributionStatus(`Injection scheduled until ${expiryDate.toLocaleDateString()}`);
      setTargetMerchant('');
      setTargetAmount('');
      setTimeout(() => setContributionStatus(''), 5000);
      fetchAcceptedPools();
    } catch (e: any) {
      alert("Failed to execute margin boost: " + e.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col justify-center p-6 font-sans text-white relative overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm mx-auto">
          <div className="flex items-center justify-between gap-3 mb-8">
            <NXLogo title="FMCG Portal" />
            <div className="text-right border-l border-white/10 pl-4">
              <div className="font-display text-xl text-nx-paper">Dedicated Portal</div>
              <div className="text-[10px] text-nx-muted uppercase tracking-[0.2em]">FMCG Intelligence</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl mb-8 border border-white/5">
            <button 
              onClick={() => { setAuthMode('login'); setError(''); }}
              className={cn("py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all text-center", authMode === 'login' ? "bg-nx-amber text-nx-ink" : "text-nx-muted hover:text-white")}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setError(''); }}
              className={cn("py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all text-center", authMode === 'register' ? "bg-nx-amber text-nx-ink" : "text-nx-muted hover:text-white")}
            >
              Register
            </button>
            <button 
              onClick={() => { setAuthMode('whitelist_signup'); setError(''); setWhitelistError(''); setWhitelistResult(null); }}
              className={cn("py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all text-center", authMode === 'whitelist_signup' ? "bg-nx-amber text-nx-ink" : "text-nx-muted hover:text-white")}
            >
              Get API Key
            </button>
          </div>

          {showEmailVerification ? (
            <div className="space-y-4">
               <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#00e676] mb-2">Verification Code</label>
                  <p className="text-xs text-nx-muted mb-4">Please enter the 6-digit code sent to your email to confirm registration.</p>
                  <input type="text" value={verificationOtp} onChange={e => setVerificationOtp(e.target.value)} className="w-full bg-black border border-nx-border focus:border-nx-amber rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center outline-none transition-all text-[#00e676]" placeholder="000000" maxLength={6} />
               </div>
               {error && <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle className="w-3 h-3" /> {error}</div>}
               <button disabled={loading || verificationOtp.length !== 6} onClick={verifyAndSignup} className="w-full bg-[#00e676] text-black font-display font-bold py-3.5 rounded-xl hover:bg-[#00e676]/90 transition-all mt-4 tracking-widest disabled:opacity-50">
                 {loading ? 'VERIFYING...' : 'VERIFY & COMPLETE SETUP'}
               </button>
               <button disabled={loading} onClick={() => setShowEmailVerification(false)} className="w-full bg-transparent text-nx-muted font-bold text-[10px] py-2 uppercase tracking-widest hover:text-white transition-all disabled:opacity-50">
                 Cancel
               </button>
            </div>
          ) : authMode === 'register' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-nx-muted mb-2">Company Name</label>
                <input type="text" value={signupData.companyName} onChange={e => setSignupData({ ...signupData, companyName: e.target.value })} className="w-full bg-black border border-nx-border focus:border-nx-amber rounded-xl px-4 py-3 text-sm outline-none transition-all text-white" placeholder="e.g. Brookside Dairy" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-nx-muted mb-2">Work Email</label>
                <input type="email" value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} className="w-full bg-black border border-nx-border focus:border-nx-amber rounded-xl px-4 py-3 text-sm outline-none transition-all text-white" placeholder="partner@company.com" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-nx-muted mb-2">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={signupData.password} 
                    onChange={e => setSignupData({ ...signupData, password: e.target.value })} 
                    className="w-full bg-black border border-nx-border focus:border-nx-amber rounded-xl pl-4 pr-10 py-3 text-sm outline-none transition-all text-white" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nx-muted hover:text-white transition-colors cursor-pointer bg-transparent"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle className="w-3 h-3" /> {error}</div>}
              <button disabled={loading} onClick={handleAuth} className="w-full bg-nx-amber text-nx-ink font-display font-bold py-3.5 rounded-xl hover:bg-nx-amber/90 transition-all mt-4 tracking-widest disabled:opacity-50">
                {loading ? 'CREATING ACCOUNT...' : 'CREATE PARTNER ACCOUNT'}
              </button>
              <p className="text-[9px] text-nx-muted text-center uppercase tracking-widest leading-relaxed mt-4">
                By registering, you agree to the NX Network Data Integrity Protocols.
              </p>
            </div>
          ) : authMode === 'whitelist_signup' ? (
            <div className="space-y-4">
              <div className="text-[10px] text-nx-muted mb-4 p-4 bg-white/5 border-l border-nx-amber uppercase tracking-widest leading-relaxed">
                Retrieve your designated portal API key using your whitelisted professional domain or representative email.
              </div>

              {!whitelistResult ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-nx-muted mb-2">Representative Work Email</label>
                    <input 
                      type="email" 
                      value={whitelistEmail} 
                      onChange={e => setWhitelistEmail(e.target.value)} 
                      className="w-full bg-black border border-nx-border focus:border-nx-amber rounded-xl px-4 py-3 text-sm outline-none transition-all text-white placeholder-white/20" 
                      placeholder="e.g. representative@unilever.com" 
                      required
                    />
                  </div>

                  {whitelistError && (
                    <div className="flex items-center gap-2 text-red-500 text-xs">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{whitelistError}</span>
                    </div>
                  )}

                  <button 
                    disabled={whitelistLoading} 
                    onClick={async () => {
                      if (!whitelistEmail) {
                        setWhitelistError('Please enter your work email.');
                        return;
                      }
                      setWhitelistLoading(true);
                      setWhitelistError('');
                      try {
                        const res = await fetch('/api/auth/request-signup-link', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: whitelistEmail, portal: 'fmcgs' })
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) {
                          throw new Error(data.error || 'Failed to dispatch magic link.');
                        }
                        setWhitelistResult(data);
                      } catch (err: any) {
                        setWhitelistError(err.message);
                      } finally {
                        setWhitelistLoading(false);
                      }
                    }} 
                    className="w-full bg-nx-amber text-nx-ink font-display font-bold py-3.5 rounded-xl hover:bg-nx-amber/90 transition-all mt-4 tracking-widest disabled:opacity-50"
                  >
                    {whitelistLoading ? 'VERIFYING WHITELIST...' : 'DISPATCH SETUP LINK'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-[#10b981]/10 rounded-xl border border-[#10b981]/30">
                  <h4 className="text-xs uppercase font-bold text-[#10b981] flex items-center gap-2">
                    <Check className="w-4 h-4" /> LINK DISPATCHED SUCCESSFULLY
                  </h4>
                  <p className="text-[10px] text-nx-muted leading-relaxed uppercase tracking-wider">
                    A secure authentication payload has been generated for <b>{whitelistResult.brand_name}</b> ({whitelistResult.email}).
                  </p>
                  
                  <div className="p-3 bg-black rounded-lg border border-nx-border font-mono text-[9px] text-[#10b981] break-all">
                    Link: {window.location.origin + window.location.pathname + whitelistResult.magic_link}
                  </div>

                  <p className="text-[8px] text-nx-muted leading-relaxed uppercase">
                    In actual production setup, representatives click this link inside their email. For developer preview verification, click the fast-track button below to instantly load the claimed API key credentials.
                  </p>

                  <a 
                    href={whitelistResult.magic_link}
                    className="w-full bg-[#10b981] text-black text-center block font-display font-bold py-3.5 rounded-xl hover:bg-[#10b981]/90 transition-all tracking-widest text-[10px]"
                  >
                    FAST-TRACK MAGIC SETUP LINK
                  </a>

                  <button 
                    onClick={() => setWhitelistResult(null)} 
                    className="w-full text-center text-[10px] text-nx-muted hover:text-white uppercase tracking-widest mt-2"
                  >
                    Retrieve for another email
                  </button>
                </div>
              )}
            </div>
          ) : authMode === 'login' ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-nx-muted mb-2">Brand Account</label>
                  <input type="text" value={loginData.brand} onChange={e => setLoginData({ ...loginData, brand: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full bg-black border border-nx-border focus:border-nx-amber rounded-xl px-4 py-3 text-sm outline-none transition-all text-white" placeholder="e.g. Brookside Dairy" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-nx-muted mb-2">Access PIN</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={loginData.password} 
                      onChange={e => setLoginData({ ...loginData, password: e.target.value })} 
                      onKeyDown={e => e.key === 'Enter' && handleAuth()} 
                      className="w-full bg-black border border-nx-border focus:border-nx-amber rounded-xl pl-4 pr-10 py-3 text-sm outline-none transition-all text-white" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-nx-muted hover:text-white transition-colors cursor-pointer bg-transparent"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle className="w-3 h-3" /> {error}</div>}
                <button disabled={loading} onClick={handleAuth} className="w-full bg-nx-amber text-nx-ink font-display font-bold py-3.5 rounded-xl hover:bg-nx-amber/90 transition-all mt-4 tracking-widest disabled:opacity-50">
                  {loading ? 'AUTHENTICATING...' : 'ENTER PORTAL'}
                </button>
              </div>
              <div className="mt-8 space-y-4">
                <button onClick={() => setAuthMode('setup')} className="w-full text-center text-[10px] text-nx-muted hover:text-nx-amber transition-colors uppercase tracking-widest">Already have a key? Set up PIN →</button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] text-nx-muted mb-8 p-4 bg-white/5 border-l border-nx-amber uppercase tracking-widest leading-relaxed">Verification required. Use your assigned FMCG API Key to establish a new Access PIN.</div>
              <div className="space-y-5">
                {[
                  { label: 'Brand Name', key: 'brand', type: 'text', ph: 'e.g. Brookside Dairy' },
                  { label: 'Portal API Key', key: 'apiKey', type: 'text', ph: 'nx_live_...' },
                  { label: 'New Access PIN', key: 'newPassword', type: 'password', ph: '' },
                  { label: 'Confirm PIN', key: 'confirmPassword', type: 'password', ph: '' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-nx-muted mb-2">{f.label}</label>
                    <div className="relative">
                      <input 
                        type={f.type === 'password' ? (f.key === 'newPassword' ? (showNewPassword ? 'text' : 'password') : (showConfirmPassword ? 'text' : 'password')) : f.type} 
                        value={(setupData as any)[f.key]} 
                        onChange={e => {
                          let val = e.target.value;
                          if (f.key === 'apiKey' || f.key === 'brand') val = val.trim();
                          setSetupData({ ...setupData, [f.key]: val });
                        }} 
                        placeholder={f.ph} 
                        className={cn("w-full bg-black border border-nx-border focus:border-nx-amber rounded-xl py-3 text-sm outline-none transition-all text-white", f.type === 'password' ? "pl-4 pr-10" : "px-4")} 
                      />
                      {f.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (f.key === 'newPassword') {
                              setShowNewPassword(!showNewPassword);
                            } else {
                              setShowConfirmPassword(!showConfirmPassword);
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-nx-muted hover:text-white transition-colors cursor-pointer bg-transparent"
                        >
                          {f.key === 'newPassword' ? (
                            showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
                          ) : (
                            showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {setupError && <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle className="w-3 h-3" /> {setupError}</div>}
                <AnimatePresence>
                  {setupSuccess && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 text-nx-green text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> SECURITY PIN ESTABLISHED. RETURNING TO LOGIN...</motion.div>
                  )}
                </AnimatePresence>
                <button onClick={handleSetupPassword} className="w-full bg-nx-amber text-nx-ink font-display font-bold py-3.5 rounded-xl hover:bg-nx-amber/90 transition-all mt-2 tracking-widest">SAVE SECURITY PIN</button>
              </div>
              <button onClick={() => setAuthMode('login')} className="w-full text-center text-[10px] text-nx-muted mt-6 hover:text-nx-amber transition-colors uppercase tracking-widest">← Back to access</button>
            </>
          )}
        </motion.div>
      </div>
    );
  }
  
  if (isLoggedIn && brand && !brand.active) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col justify-center p-6 font-sans text-white relative overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm mx-auto">
          <div className="absolute top-0 right-0 w-64 h-64 bg-nx-amber/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <div className="flex items-center justify-between gap-3 mb-8 relative z-10">
            <NXLogo title="FMCG Portal" />
            <div className="text-right border-l border-white/10 pl-4">
              <div className="font-display text-xl text-nx-paper">Dedicated Portal</div>
              <div className="text-[10px] text-nx-muted uppercase tracking-[0.2em]">FMCG Intelligence</div>
            </div>
          </div>

          <div className="text-center py-8 border border-dashed border-nx-amber/30 rounded-2xl bg-black/40 flex flex-col items-center px-6 relative z-10">
            <ShieldAlert className="w-12 h-12 text-nx-amber mb-4 opacity-80 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-widest mb-2 text-nx-amber">Verification In Progress</h3>
            <p className="text-[11px] text-nx-muted uppercase font-bold tracking-widest max-w-sm leading-relaxed mb-6 text-center">
              Your registration for "{brand.name}" is under manual review.
            </p>
            
            <div className="bg-nx-amber/5 border border-nx-amber/20 rounded-xl p-4 text-left max-w-md mb-6 w-full">
               <div className="text-[10px] uppercase font-bold text-nx-amber mb-1">Onboarding Policy Notice</div>
               <p className="text-[10px] text-nx-muted leading-relaxed">
                  To safeguard the liquidity pools of the NX Live core network, brand connections require manual authorization unless registered via a pre-approved wholesale domain prefix.
               </p>
               <p className="text-[10px] text-nx-muted leading-relaxed mt-2 font-semibold font-sans">
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
                 className="w-full bg-nx-amber hover:bg-nx-amber/90 text-nx-ink py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                 className="w-full bg-[#111] hover:bg-white/5 border border-white/10 text-nx-muted hover:text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                 <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className={cn("min-h-screen bg-[#0a0a0a] text-nx-paper font-sans")}>
      <nav className="border-b border-nx-border h-16 flex items-center px-6 justify-between bg-nx-ink/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-nx-amber rounded-lg flex items-center justify-center font-extrabold text-xs text-nx-ink">NX</div>
          <span className="font-display text-lg tracking-[0.2em] text-nx-amber uppercase">Dedicated Portal</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest text-nx-amber font-bold">{brand?.name}</div>
          <NotificationIcon />
          <button onClick={async () => {
            await supabase.auth.signOut();
            setIsLoggedIn(false);
            setBrand(null);
          }} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-nx-muted hover:text-nx-amber transition-all">
             <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      </nav>
      
      <div className="flex">
        <aside className="w-64 border-r border-nx-border min-h-[calc(100vh-64px)] p-6 static lg:sticky lg:top-16">
          <div className="space-y-4">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'pool_tracking', label: 'Pool Tracking', icon: Store },
              { id: 'intelligence', label: 'Network map feed', icon: MapPin },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'inventory', label: 'Inventory', icon: Package },
                                          { id: 'api_access', label: 'Programmatic Access', icon: Shield },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold transition-all border-l-2",
                  activeTab === tab.id ? "text-nx-amber bg-nx-amber/5 border-nx-amber" : "text-nx-muted hover:text-nx-paper border-transparent hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </aside>
        
        <main className="flex-1 p-4 md:p-8 space-y-8 w-full">
          {activeTab === 'overview' && (
            <>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="p-10 border border-nx-border bg-nx-card relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-nx-amber/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <h1 className="text-3xl font-display text-nx-paper mb-4 uppercase tracking-tighter">Market Pulse: {brand?.name}</h1>
                <p className="text-sm text-nx-muted mb-8 max-w-2xl leading-relaxed">Advanced analytics dashboard for {brand?.name} field operations. Monitor real-time SKU movement, merchant pool health, and delivery velocities across the informal network.</p>

                {/* Contribution Form */}
                <div className="bg-[#111111] p-6 border border-nx-border rounded-2xl mt-4 max-w-2xl relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                     <Zap className="w-4 h-4 text-nx-amber" />
                     <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-nx-paper">Liquidity Injection Control</h3>
                  </div>
                  <div className="flex gap-3">
                    <input 
                      type="text" placeholder="Merchant Code (M12345)" 
                      value={targetMerchant} onChange={(e) => setTargetMerchant(e.target.value)}
                      className="bg-black border border-nx-border rounded-xl px-4 py-2.5 text-xs text-white flex-1 focus:border-nx-amber outline-none transition-all"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-nx-muted">KSH</span>
                      <input 
                        type="number" placeholder="Amount" 
                        value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
                        className="bg-black border border-nx-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white w-36 focus:border-nx-amber outline-none transition-all"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-nx-muted">DAYS</span>
                      <input 
                        type="number" placeholder="Expiry" 
                        value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)}
                        className="bg-black border border-nx-border rounded-xl pl-12 pr-4 py-2.5 text-xs text-white w-28 focus:border-nx-amber outline-none transition-all"
                      />
                    </div>
                    <button 
                      onClick={handleContribute} 
                      className="px-6 py-2.5 bg-nx-amber text-nx-ink text-[10px] uppercase font-display font-bold rounded-xl hover:bg-nx-amber/90 transition-all tracking-widest shadow-lg shadow-nx-amber/20"
                    >
                      Inject Pool
                    </button>
                  </div>
                  {contributionStatus && <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-nx-green text-[10px] font-bold mt-4 flex items-center gap-2 uppercase tracking-widest"><CheckCircle2 className="w-3 h-3" /> {contributionStatus}</motion.p>}
                </div>

                {/* Notifications */}
                <AnimatePresence>
                  {acceptedPools.length > 0 && (
                    <div className="mt-10 space-y-3 max-w-2xl">
                       <h3 className="font-bold text-[10px] uppercase tracking-widest text-nx-muted mb-4">Network Confirmation Archive</h3>
                       {acceptedPools.map((pool, idx) => (
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={idx} className="bg-nx-green/5 text-nx-green p-4 border border-nx-green/20 text-[11px] rounded-xl flex justify-between items-center">
                            <span>
                               <span className="font-bold uppercase tracking-widest">{pool.merchant_code}</span> 
                               <span className="mx-2 text-white/30 text-[8px]">●</span>
                               <span className="text-white/80">"{pool.merchant?.name || 'Shop Name'}"</span> has received <b>{pool.contribution_amount} KSH</b> pool boost.
                            </span>
                            <span className="text-[9px] font-mono opacity-50">{new Date(pool.created_at).toLocaleDateString()}</span>
                          </motion.div>
                       ))}
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <div className="p-8 border border-nx-border bg-nx-card rounded-2xl flex flex-col">
                  <h2 className="text-lg font-display text-white mb-6 uppercase tracking-widest font-bold">INVENTORY STATUS & ALERTS</h2>
                  <div className="flex-1 flex items-center justify-between">
                    <div className="h-48 w-48 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Active', value: 85, color: '#4ade80' },
                              { name: 'Low Stock', value: 12, color: '#fbbf24' },
                              { name: 'Out of Stock', value: 3, color: '#f87171' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {
                              [
                                { name: 'Active', value: 85, color: '#4ade80' },
                                { name: 'Low Stock', value: 12, color: '#fbbf24' },
                                { name: 'Out of Stock', value: 3, color: '#f87171' }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))
                            }
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#181817', borderColor: '#2b2b28', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="flex flex-col justify-center space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#4ade80]" />
                        <span className="text-white font-medium">Active <span className="text-[#4ade80] ml-1">(85%)</span></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#fbbf24]" />
                        <span className="text-white font-medium">Low Stock <span className="text-[#fbbf24] ml-1">(12%)</span></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#f87171]" />
                        <span className="text-white font-medium">Out of Stock <span className="text-[#f87171] ml-1">(3%)</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 border border-nx-border bg-nx-card rounded-2xl">
                   <h2 className="text-lg font-display text-nx-amber mb-6 uppercase tracking-widest">Territory Performance</h2>
                   <div className="space-y-6">
                      {territoryStats.map(region => (
                         <div key={region.name} className="space-y-2">
                            <div className="flex justify-between items-end">
                               <span className="text-xs font-bold text-white uppercase tracking-widest">{region.name}</span>
                               <span className="text-[10px] font-mono text-nx-amber">{region.share} Network Share</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-nx-amber" style={{ width: region.share }} />
                            </div>
                            <div className="text-[8px] text-nx-green uppercase font-bold tracking-widest leading-none">{region.grow} Monthly Growth</div>
                         </div>
                      ))}
                      {territoryStats.length === 0 && <p className="text-[10px] text-nx-muted uppercase tracking-widest text-center py-8">Aggregating Regional Analytics...</p>}
                   </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'pool_tracking' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-display text-nx-paper uppercase tracking-tighter">Merchant Pool Tracking</h1>
                  <p className="text-xs text-nx-muted uppercase tracking-widest mt-2">{brand?.name} contribution logs per merchant node</p>
                </div>
                <div className="flex gap-4">
                   <div className="p-4 bg-nx-green/5 border border-nx-green/20 rounded-2xl">
                      <div className="text-[9px] uppercase tracking-widest text-nx-muted mb-1">Total Active Injection</div>
                      <div className="text-xl font-display text-nx-green">
                        {merchantContributions.reduce((sum, m) => sum + m.active, 0).toLocaleString()} KSH
                      </div>
                   </div>
                   <div className="p-4 bg-nx-amber/5 border border-nx-amber/20 rounded-2xl">
                      <div className="text-[9px] uppercase tracking-widest text-nx-muted mb-1">Total Pending</div>
                      <div className="text-xl font-display text-nx-amber">
                        {merchantContributions.reduce((sum, m) => sum + m.pending, 0).toLocaleString()} KSH
                      </div>
                   </div>
                </div>
              </div>

              <div className="bg-nx-card border border-nx-border rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-0">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-[#111] text-nx-muted font-bold uppercase tracking-widest text-[9px]">
                      <tr>
                        <th className="px-8 py-5">Merchant Details</th>
                        <th className="px-8 py-5">Total Contribution</th>
                        <th className="px-8 py-5">Active Pool</th>
                        <th className="px-8 py-5">Pending/Expired</th>
                        <th className="px-8 py-5">Last Injection</th>
                        <th className="px-8 py-5 text-right">Activity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {merchantContributions.map(m => (
                        <tr key={m.code} className="hover:bg-white/5 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="font-bold text-white uppercase tracking-widest mb-1">{m.name}</div>
                            <div className="text-[9px] text-nx-muted font-mono">{m.code}</div>
                          </td>
                          <td className="px-8 py-5 font-mono text-white/50">{m.total.toLocaleString()} KSH</td>
                          <td className="px-8 py-5 font-mono text-nx-green font-bold">{m.active.toLocaleString()} KSH</td>
                          <td className="px-8 py-5 font-mono">
                            <span className="text-nx-amber">{m.pending.toLocaleString()}</span>
                            <span className="mx-1 opacity-20">/</span>
                            <span className="text-nx-muted opacity-50">{m.expired.toLocaleString()}</span>
                          </td>
                          <td className="px-8 py-5 text-nx-muted uppercase text-[9px] tracking-widest">
                            {new Date(m.lastInjection).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-5 text-right">
                             <div className="flex gap-2 justify-end">
                               <button className="p-2 border border-white/10 rounded-lg hover:border-nx-amber transition-all">
                                 <Activity className="w-3 h-3 text-nx-amber" />
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                      {merchantContributions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center">
                            <Store className="w-10 h-10 text-nx-muted mx-auto mb-4 opacity-20" />
                            <p className="text-[10px] text-nx-muted uppercase tracking-[0.2em]">No merchant pool contributions tracked yet.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'intelligence' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-6">
                <div>
                  <h1 className="text-3xl font-display text-nx-paper mb-2 uppercase tracking-tighter">Network map feed</h1>
                  <p className="text-xs text-nx-muted uppercase tracking-widest leading-relaxed">
                     Real-time geocoded telemetry of high-density wholesale clusters and micro-retail duka nodes in Kenya.
                  </p>
                </div>

                {/* Persistent View Switcher Toggle - ALWAYS VISIBLE throughout */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                  <button 
                    id="fmcg-map-mode-toggle"
                    onClick={() => setIntelViewMode('map')}
                    className={cn(
                      "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                      intelViewMode === 'map' ? "bg-nx-amber text-nx-ink font-extrabold shadow" : "text-nx-muted hover:text-nx-paper"
                    )}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    Interactive Map
                  </button>
                  <button 
                    id="fmcg-feed-mode-toggle"
                    onClick={() => setIntelViewMode('feed')}
                    className={cn(
                      "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                      intelViewMode === 'feed' ? "bg-nx-amber text-nx-ink font-extrabold shadow" : "text-nx-muted hover:text-nx-paper"
                    )}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Live Activity Feed
                  </button>
                </div>
              </div>

              {intelViewMode === 'map' ? (
                /* Leaflet/Google Maps Dual Intelligence Map with Geolocation */
                <div className="bg-white border border-nx-border rounded-3xl p-6 relative overflow-hidden animate-fade-in space-y-4">
                  {/* Map Controls - Positioned directly above, not in the map */}
                  <div className="bg-[#f4f5f7] border border-[#e4e6ea] p-2 rounded-xl flex items-center justify-between shadow-sm max-w-full overflow-x-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-mono font-bold px-1">Map View Mode:</span>
                      <button 
                        onClick={() => setIntelHeatmapMode(false)}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${!intelHeatmapMode ? 'bg-white text-nx-ink shadow-sm border border-[#e4e6ea]' : 'text-[#6b7280] hover:text-[#1a1d23]'}`}
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

                  <div className="rounded-2xl overflow-hidden border border-nx-border h-[600px] relative">
                  
                  <MapContainer 
                    center={[intelMapCenter.lat, intelMapCenter.lng]} 
                    zoom={intelMapZoom === 12 ? 6 : intelMapZoom} 
                    minZoom={2}
                    scrollWheelZoom={true} 
                    style={{ height: '100%', width: '100%', background: '#ffffff' }}
                  >
                    <MapRecenter center={intelMapCenter} zoom={intelMapZoom} />
                    <TileLayer
                      attribution='&amp;copy; &lt;a href="https://www.openstreetmap.org/copyright"&gt;OpenStreetMap&lt;/a&gt; contributors'
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
                         <Marker key={i} position={[pt.lat, pt.lng]} icon={pt.type === 'hub' ? customHubIcon : customShopIcon}>
                           <Popup>
                             <div className="font-sans text-[11px] text-black">
                               <span className={cn("inline-block uppercase tracking-wider block text-[13px] mb-1 font-bold", pt.tier === 'HUB' ? "text-[#2563eb]" : pt.tier === 'CERTIFIED' ? "text-yellow-600" : "text-red-500")}>
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
                    <div className="absolute bottom-4 left-4 z-[500] bg-[#0c0d14]/95 backdrop-blur-md border border-nx-border p-5 rounded-xl shadow-2xl max-w-xs w-[calc(100%-2rem)]">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[9px] font-mono tracking-widest text-[#ff6b35] bg-[#ff6b35]/10 px-2 py-0.5 rounded uppercase font-bold font-display">
                            {intelSelectedPin.type}
                          </span>
                          <h4 className="font-display font-bold text-sm text-white mt-1.5">{intelSelectedPin.name || 'NX Intelligence Node'}</h4>
                        </div>
                        <button 
                          onClick={() => setIntelSelectedPin(null)}
                          className="text-neutral-500 hover:text-white text-xs font-bold font-mono px-1.5 py-0.5 rounded hover:bg-white/5"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <p className="text-xs text-neutral-400 whitespace-pre-line leading-relaxed">
                        {intelSelectedPin.role}
                      </p>
                    </div>
                  )}

                </div>
              </div>
              ) : (
                /* Live Activity Feed mode content */
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#111] border border-nx-border p-5 rounded-2xl relative overflow-hidden">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Total Live Telemetry</div>
                      <div className="text-2xl font-extrabold text-[#f4f5f7]">{Math.max(transactions.length, 5)} Nodes</div>
                      <div className="text-[10px] text-nx-green mt-1">✦ Real-time synchronized stream</div>
                    </div>
                    <div className="bg-[#111] border border-nx-border p-5 rounded-2xl relative overflow-hidden">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Total Traded GMV Volume</div>
                      <div className="text-2xl font-extrabold text-nx-amber">
                        KES {(transactions.reduce((acc, curr) => acc + Number(curr.amount_ksh || curr.amount || 0), 0) || 50140).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-nx-muted mt-1">Kenya informal market liquidity</div>
                    </div>
                    <div className="bg-[#111] border border-nx-border p-5 rounded-2xl relative overflow-hidden">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b7280] mb-2">Channel Activity Status</div>
                      <div className="text-2xl font-extrabold text-[#10b981] flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                        84.21 Kbps
                      </div>
                      <div className="text-[10px] text-nx-muted mt-1">Nominal stream heartbeat</div>
                    </div>
                  </div>

                  <div className="bg-nx-card border border-nx-border rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-nx-border flex justify-between items-center bg-[#111]">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Live Activity Logs Feed</h3>
                        <p className="text-[10px] text-[#6b7280] uppercase tracking-widest mt-1">Incoming telemetry from merchant USSD dialers</p>
                      </div>
                      {transactionsLoading && <Loader2 className="w-4 h-4 text-nx-amber animate-spin" />}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead>
                          <tr className="bg-black/60 text-[#6b7280] font-bold uppercase tracking-widest text-[9px] border-b border-nx-border">
                            <th className="px-8 py-4">Timestamp</th>
                            <th className="px-8 py-4">Merchant Code</th>
                            <th className="px-8 py-4">Absolute Amount</th>
                            <th className="px-8 py-4">Loyalty Earned</th>
                            <th className="px-8 py-4">Duka Verification</th>
                            <th className="px-8 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(transactions.length > 0 ? transactions : [
                            { id: 't1', created_at: new Date(Date.now() - 3 * 60000).toISOString(), merchant_code: 'DUKA_7721', amount_ksh: 4850, nx_redeemed: 120, status: 'confirmed' },
                            { id: 't2', created_at: new Date(Date.now() - 17 * 60000).toISOString(), merchant_code: 'DUKA_2041', amount_ksh: 12400, nx_redeemed: 350, status: 'completed' },
                            { id: 't3', created_at: new Date(Date.now() - 41 * 60000).toISOString(), merchant_code: 'DUKA_5510', amount_ksh: 750, nx_redeemed: 20, status: 'confirmed' },
                            { id: 't4', created_at: new Date(Date.now() - 75 * 60000).toISOString(), merchant_code: 'DUKA_8892', amount_ksh: 18900, nx_redeemed: 500, status: 'completed' },
                            { id: 't5', created_at: new Date(Date.now() - 120 * 60000).toISOString(), merchant_code: 'DUKA_1203', amount_ksh: 3200, nx_redeemed: 80, status: 'confirmed' }
                          ]).map((txn, index) => (
                            <tr key={txn.id || index} className="hover:bg-white/5 transition-colors">
                              <td className="px-8 py-4 font-mono text-white">
                                {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                              <td className="px-8 py-4 font-mono font-bold text-nx-amber">
                                {txn.merchant_code}
                              </td>
                              <td className="px-8 py-4 text-white font-mono font-bold">
                                KES {(txn.amount_ksh || txn.amount || 0).toLocaleString()}
                              </td>
                              <td className="px-8 py-4 font-mono text-nx-green font-bold">
                                +{txn.nx_redeemed || txn.nx_amount || 0} NX
                              </td>
                              <td className="px-8 py-4 text-nx-muted uppercase tracking-wider text-[9px]">
                                {txn.merchant_code?.startsWith('DUKA_7') ? 'Unilever Boost active' : 'Standard wholesale restock'}
                              </td>
                              <td className="px-8 py-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[8px] font-bold font-mono tracking-widest uppercase",
                                  txn.status === 'confirmed' || txn.status === 'completed' ? "bg-nx-green/10 text-nx-green border border-nx-green/20" : "bg-nx-amber/10 text-nx-amber border border-nx-amber/20"
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Real-time Predictive Radar */}
                <div className="bg-[#111111] border border-nx-border rounded-2xl p-8 relative overflow-hidden ring-1 ring-white/5">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                     <Activity className="w-24 h-24" />
                  </div>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-[#00d4ff] flex items-center gap-3">
                       <Clock className="w-5 h-5 animate-pulse" /> Predictive Stock Radar
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                     {predictiveAlerts.map(alert => (
                        <div key={alert.id} className={cn("p-5 border rounded-2xl flex justify-between items-center transition-all group", alert.risk === 'high' ? 'border-[#ff4757]/30 bg-[#ff4757]/5' : 'border-[#ffb547]/30 bg-[#ffb547]/5')}>
                           <div>
                              <div className="text-xs font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-widest">{alert.id} <span className="text-white/20">/</span> {alert.name}</div>
                              <div className="text-[10px] text-white/50 font-mono leading-relaxed">Depletion imminent: <span className="font-bold text-white">{alert.sku}</span> within ~{alert.ETA}</div>
                           </div>
                           <button className="px-4 py-2 flex items-center gap-2 bg-[#111] border border-white/10 hover:bg-[#00d4ff] hover:text-[#000] hover:border-[#00d4ff] rounded-xl text-[10px] font-mono font-bold transition-all uppercase tracking-widest group-hover:shadow-lg group-hover:shadow-[#00d4ff]/20">
                              <Truck className="w-4 h-4" /> Dispatch
                           </button>
                        </div>
                     ))}
                     {predictiveAlerts.length === 0 && <p className="text-[10px] text-nx-muted uppercase tracking-widest text-center py-8">Scanning for Stock Risks...</p>}
                  </div>
                </div>

                {/* Gamification Top Movers */}
                <div className="bg-[#111111] border border-nx-border rounded-2xl p-8 relative overflow-hidden ring-1 ring-white/5">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-[#ffb547] flex items-center gap-3">
                       <Trophy className="w-5 h-5" /> Top Velocity Nodes
                    </h3>
                  </div>

                  <AnimatePresence>
                    {bonusStatus && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-6 bg-nx-green/10 text-nx-green border border-nx-green/30 px-5 py-4 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-nx-green/10">
                        <Zap className="w-4 h-4 fill-current" /> {bonusStatus}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="space-y-3">
                     {velocityNodes.map(mover => (
                       <div key={mover.id} className="flex items-center justify-between p-4 border border-nx-border hover:bg-white/5 hover:border-nx-amber/30 rounded-2xl transition-all cursor-pointer group">
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-full bg-nx-border/50 border border-white/5 flex items-center justify-center text-[11px] font-bold text-nx-amber group-hover:bg-nx-amber group-hover:text-nx-ink transition-all">{mover.rank}</div>
                             <div>
                               <div className="text-xs font-bold text-white uppercase tracking-widest">{mover.name}</div>
                               <div className="text-[10px] text-white/40 font-mono lowercase">{mover.vol} moved <span className="mx-1 opacity-20">|</span> <span className="text-nx-green">{mover.p} loyalty pull</span></div>
                             </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setBonusStatus(`⚡ 500 NX Instant Bonus Injected to ${mover.name} (${mover.id})!`);
                              setTimeout(() => setBonusStatus(null), 5000);
                            }}
                            className="p-2 flex items-center gap-2 bg-[#4d9fff]/5 text-[#4d9fff] hover:bg-[#4d9fff] hover:text-white rounded-xl text-[10px] font-mono font-bold transition-all uppercase px-4 ring-1 ring-[#4d9fff]/20"
                          >
                            <Zap className="w-3 h-3 fill-current" /> Bonus
                          </button>
                       </div>
                     ))}
                     {velocityNodes.length === 0 && <p className="text-[10px] text-nx-muted uppercase tracking-widest text-center py-8">Calculating Velocity Leaders...</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          

          {activeTab === 'api_access' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-display text-nx-paper uppercase tracking-tighter">Programmatic Access & Automation</h1>
                    <p className="text-xs text-nx-muted uppercase tracking-widest mt-2">Manage secure credentials to interface your digital supply systems and ERP directly with NX</p>
                  </div>
                  {!rawKeyToShow && (
                    <button 
                      onClick={handleGenerateKey}
                      disabled={loading}
                      className="bg-nx-amber text-nx-ink px-6 py-2.5 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className={cn("w-4 h-4 transition-transform", loading && "animate-spin")} />
                      Generate Integration Key
                    </button>
                  )}
               </div>



               {rawKeyToShow && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-nx-amber/10 border border-nx-amber/30 p-8 rounded-3xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Shield className="w-16 h-16 text-nx-amber" /></div>
                    <h3 className="text-nx-amber text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                       <AlertCircle className="w-4 h-4" /> Programmatic Access Key Created
                    </h3>
                    <p className="text-[11px] text-white/70 max-w-lg mb-6 leading-relaxed uppercase">
                      Copy this access key right now. For security purposes, we only display it this once. If lost, you must generate a new key.
                    </p>
                    
                    <div className="flex gap-2">
                       <div className="bg-black/40 border border-nx-amber/20 px-6 py-4 rounded-xl flex-1 font-mono text-nx-amber text-lg tracking-wider break-all">
                          {rawKeyToShow}
                       </div>
                       <button 
                        onClick={() => {
                          navigator.clipboard.writeText(rawKeyToShow);
                          setCopySuccess(true);
                          setTimeout(() => setCopySuccess(false), 2000);
                        }}
                        className="bg-nx-amber text-nx-ink px-6 rounded-xl font-bold uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                       >
                         {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                         {copySuccess ? 'Copied' : 'Copy'}
                       </button>
                    </div>

                    <button 
                      onClick={() => setRawKeyToShow(null)}
                      className="mt-6 text-[10px] font-bold text-nx-muted uppercase tracking-widest hover:text-white transition-colors"
                    >
                      I have saved this key securely
                    </button>
                  </motion.div>
               )}

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-nx-card border border-nx-border rounded-2xl overflow-hidden shadow-2xl">
                      <div className="p-6 border-b border-nx-border bg-white/5 flex items-center justify-between">
                         <h3 className="text-xs font-bold uppercase tracking-widest text-nx-paper">Active System Connectors</h3>
                         <div className="px-2 py-0.5 bg-nx-green/10 text-nx-green border border-nx-green/20 rounded text-[8px] font-bold uppercase tracking-tighter">Live</div>
                      </div>
                      <div className="divide-y divide-white/5">
                        {apiKeys.length === 0 ? (
                          <div className="p-12 text-center text-nx-muted uppercase text-[10px] tracking-widest">
                            <Key className="w-8 h-8 mx-auto mb-4 opacity-10" />
                            No active integration keys found
                          </div>
                        ) : (
                          apiKeys.map(key => (
                            <div key={key.id} className="p-6 flex items-center justify-between group hover:bg-white/5 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-nx-ink border border-nx-border flex items-center justify-center text-nx-amber">
                                     <Shield className="w-5 h-5" />
                                  </div>
                                  <div>
                                     <div className="text-xs font-bold text-white font-mono uppercase tracking-widest">{key.prefix}••••••••{key.last4}</div>
                                     <div className="text-[9px] text-nx-muted uppercase tracking-widest mt-1">Authorized on {new Date(key.created_at).toLocaleDateString()}</div>
                                  </div>
                               </div>
                               <div className="flex gap-3 items-center">
                                  <div className="px-3 py-1 bg-nx-green/5 border border-nx-green/10 rounded-full text-[8px] font-bold text-nx-green uppercase tracking-widest">Active</div>
                                  <button
                                    onClick={() => handleRevokeKey(key.id)}
                                    className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all"
                                  >
                                    Revoke
                                  </button>
                               </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="p-6 bg-nx-amber/5 border border-nx-amber/10 rounded-2xl flex items-start gap-4">
                       <AlertCircle className="w-5 h-5 text-nx-amber shrink-0 mt-0.5" />
                       <div>
                          <h4 className="text-[11px] font-bold text-white uppercase tracking-widest mb-1">Brand Interlink Guidelines</h4>
                          <p className="text-[10px] text-nx-muted leading-relaxed uppercase tracking-wide">
                            All automated transactions are processed with strict system authentication. Protect access keys diligently. We recommend revoking keys immediately if you shift ERP/IT operations.
                          </p>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-8 border border-nx-border bg-nx-card rounded-2xl">
                       <h3 className="text-nx-amber text-xs font-bold uppercase tracking-widest mb-6">Programmatic Tasks & Actions</h3>
                       <div className="space-y-4">
                          {[
                            { 
                               name: 'Automate SKU Catalogs', 
                               desc: 'Push live price lists and stock availability directly to target shop screens.',
                               instructions: 'Keep your local brand ERP inventory aligned with NX. Push SKU catalogues so that merchants see accurate retail pricing and live availability instantly, boosting order precision.',
                               code: 'POST /api/fmcg/inventory-sync\nAuthorization: Bearer nx_live_...\n{\n  "brand": "Your Brand",\n  "skus": [\n    { "sku_code": "BF-02", "stock_count": 450, "wholesale_price": 140 }\n  ]\n}'
                             },
                            { 
                               name: 'Programmatic Campaign Boosts', 
                               desc: 'Deploy automated merchant loyalty and margin boosts dynamically.',
                               instructions: 'Trigger real-time campaigns. Whenever high-volume merchants complete checkouts, programmatically drop custom subsidies or boosts (e.g., Unilever Boost KES 25) directly into active merchant pools.',
                               code: 'POST /api/fmcg/margin-drops\nAuthorization: Bearer nx_live_...\n{\n  "merchant_code": "SHOP-A",\n  "boost_amount": 75,\n  "campaign_ref": "Q2-Wholesale-Boost"\n}'
                            },
                            { 
                               name: 'Restock Bid & Invoicing Feeds', 
                               desc: 'Draw pending merchant wholesale restock streams into your warehousing system.',
                               instructions: 'Extract full merchant demand streams. Pull the exact daily restock batches, push bulk bidding quotes, and ingest successful allocations automatically to generate precise digital invoices.',
                               code: 'GET /api/fmcg/pending-bids\nAuthorization: Bearer nx_live_...\nReturns 200 OK\n{\n  "active_batches": [\n    { "batch_id": "b-987", "volume_kes": 18500, "region": "Nairobi Central" }\n  ]\n}'
                            },
                          ].map(lib => (
                            <div key={lib.name} onClick={() => setSelectedDoc(lib)} className="p-4 bg-black/40 border border-white/5 rounded-xl hover:bg-nx-amber/5 hover:border-nx-amber/20 transition-all cursor-pointer group">
                               <div className="flex items-center justify-between mb-1">
                                 <span className="text-[10px] font-bold text-white group-hover:text-nx-amber uppercase tracking-widest transition-colors">{lib.name}</span>
                                  <ChevronRight className="w-4 h-4 text-nx-muted group-hover:text-nx-amber transition-colors" />
                               </div>
                               <p className="text-[9px] text-nx-muted uppercase tracking-wider leading-relaxed">{lib.desc}</p>
                               
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="p-8 border border-nx-border bg-nx-card rounded-2xl">
                       <h3 className="text-nx-amber text-xs font-bold uppercase tracking-widest mb-6">Rate Limits</h3>
                       <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-[9px] uppercase tracking-widest text-nx-muted mb-2">
                               <span>Real-time Injections</span>
                               <span className="text-white">100/min</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-nx-green" style={{ width: '40%' }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[9px] uppercase tracking-widest text-nx-muted mb-2">
                               <span>Telemetry Read</span>
                               <span className="text-white">500/min</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-nx-green" style={{ width: '20%' }} />
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
             <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                <h1 className="text-3xl font-display text-nx-paper uppercase tracking-tighter">Strategic Inventory Hub</h1>
                <div className="grid md:grid-cols-3 gap-6">
                   <div className="p-6 bg-nx-ink border border-nx-border rounded-2xl">
                      <div className="text-[10px] uppercase tracking-widest text-nx-muted mb-4 opacity-50">Global Supply Health</div>
                      <div className="text-4xl font-display text-nx-green uppercase tracking-tighter">{hubStats.health}</div>
                      <div className="mt-4 flex items-center gap-2 text-nx-muted text-[10px] uppercase tracking-widest font-bold">
                         <Activity className="w-3 h-3" /> {hubStats.fillRate} Fill Rate
                      </div>
                   </div>
                   <div className="p-6 bg-nx-ink border border-nx-border rounded-2xl">
                      <div className="text-[10px] uppercase tracking-widest text-nx-muted mb-4 opacity-50">Critical Stock Nodes</div>
                      <div className="text-4xl font-display text-nx-amber uppercase tracking-tighter">{hubStats.reorders} Nodes</div>
                      <div className="mt-4 flex items-center gap-2 text-nx-muted text-[10px] uppercase tracking-widest font-bold">
                         <Clock className="w-3 h-3" /> Real-time Radar Active
                      </div>
                   </div>
                   <div className="p-6 bg-nx-ink border border-nx-border rounded-2xl">
                      <div className="text-[10px] uppercase tracking-widest text-nx-muted mb-4 opacity-50">Inventory Turnover</div>
                      <div className="text-4xl font-display text-nx-paper uppercase tracking-tighter">{hubStats.turnover}</div>
                      <div className="mt-4 flex items-center gap-2 text-nx-muted text-[10px] uppercase tracking-widest font-bold">
                         <BarChart3 className="w-3 h-3" /> Aggregate Velocity
                      </div>
                   </div>
                </div>

                <div className="bg-nx-card border border-nx-border rounded-3xl overflow-hidden shadow-2xl">
                   <div className="p-6 border-b border-nx-border flex justify-between items-center bg-white/5">
                      <h3 className="font-display text-sm tracking-widest uppercase">Central Warehouse Allocation</h3>
                      <button className="text-[10px] font-bold text-nx-amber border border-nx-amber/30 px-4 py-2 rounded-xl transition-all hover:bg-nx-amber hover:text-nx-ink">EXPORT MANIFEST</button>
                   </div>
                   <div className="p-0">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-[#111] text-nx-muted font-bold uppercase tracking-widest text-[9px]">
                           <tr>
                              <th className="px-8 py-5">Product identifier</th>
                              <th className="px-8 py-5">Stock level</th>
                              <th className="px-8 py-5">Weekly velocity</th>
                              <th className="px-8 py-5">Demand trend</th>
                              <th className="px-8 py-5 text-right">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {warehouseData.map(row => (
                              <tr key={row.id} className="hover:bg-white/5 transition-colors">
                                 <td className="px-8 py-5">
                                    <div className="font-bold text-white leading-none mb-1 uppercase tracking-widest">{row.id}</div>
                                    <div className="text-[9px] text-nx-muted font-mono">{row.name}</div>
                                 </td>
                                 <td className="px-8 py-5 font-mono text-white/50">{row.qty} Units</td>
                                 <td className="px-8 py-5 font-mono text-nx-amber">{row.vel}</td>
                                 <td className="px-8 py-5">
                                    <span className={cn("px-2 py-0.5 rounded text-[8px] font-bold tracking-widest ring-1", row.trend === 'UP' ? 'text-nx-green ring-nx-green/20' : row.trend === 'DOWN' ? 'text-[#ff4757] ring-[#ff4757]/20' : 'text-nx-muted ring-white/5')}>
                                       {row.trend}
                                    </span>
                                 </td>
                                 <td className="px-8 py-5 text-right">
                                    <button className="text-nx-amber hover:text-white transition-colors uppercase font-bold tracking-widest text-[9px] border-b border-nx-amber/30 hover:border-white">Logistics Plan</button>
                                 </td>
                              </tr>
                           ))}
                           {warehouseData.length === 0 && (
                              <tr>
                                 <td colSpan={5} className="px-8 py-12 text-center text-[10px] text-nx-muted uppercase tracking-widest">
                                    Awaiting Warehouse Integration...
                                 </td>
                              </tr>
                           )}
                        </tbody>
                      </table>
                   </div>
                </div>
             </motion.div>
          )}

          {activeTab === 'analytics' && (
             <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                <div className="flex justify-between items-center">
                   <div>
                      <h1 className="text-3xl font-display text-nx-paper uppercase tracking-tighter">Market Analytics</h1>
                      <p className="text-xs text-nx-muted uppercase tracking-widest mt-2">Dynamic and historical product performance metrics</p>
                   </div>
                </div>

                <div className="grid md:grid-cols-4 gap-6">
                   <div className="p-6 bg-nx-ink border border-nx-border rounded-xl">
                      <span className="text-[9px] uppercase tracking-widest text-nx-muted block mb-2">Total FMCG Boost Contribution</span>
                      <span className="text-2xl font-mono text-white font-bold">KES 1,240,000</span>
                   </div>
                   <div className="p-6 bg-nx-ink border border-nx-border rounded-xl">
                      <span className="text-[9px] uppercase tracking-widest text-nx-muted block mb-2">Cycle Conversion Rate</span>
                      <span className="text-2xl font-mono text-nx-green font-bold">94.2%</span>
                   </div>
                   <div className="p-6 bg-nx-ink border border-[#00d4ff]/20 rounded-xl">
                      <span className="text-[9px] uppercase tracking-widest text-[#00d4ff] block mb-2">Average Dealer Margin Boost</span>
                      <span className="text-2xl font-mono text-[#00d4ff] font-bold">KES 184 / Case</span>
                   </div>
                   <div className="p-6 bg-nx-ink border border-nx-border rounded-xl">
                      <span className="text-[9px] uppercase tracking-widest text-nx-muted block mb-2">Active Micro-Merchants</span>
                      <span className="text-2xl font-mono text-white font-bold">384 Shops</span>
                   </div>
                </div>

                <div className="bg-nx-card border border-nx-border rounded-2xl p-8 space-y-6">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-nx-amber">Aggregated Brand Penetration Rank</h3>
                   <div className="space-y-4">
                      {[
                        { rank: 1, name: "Unilever East Africa (Royco, Blueband, Geisha)", share: "42.5%", color: "bg-blue-500" },
                        { rank: 2, name: "Brookside Dairy Ltd (Milk, Butter)", share: "28.1%", color: "bg-purple-500" },
                        { rank: 3, name: "Diageo / KBL (White Cap, Chrome)", share: "18.4%", color: "bg-amber-500" },
                        { rank: 4, name: "Other Certified Wholesalers", share: "11.0%", color: "bg-gray-500" }
                      ].map((item, id) => (
                         <div key={id} className="space-y-2">
                            <div className="flex justify-between text-xs font-mono">
                               <span>#{item.rank} {item.name}</span>
                               <span className="text-nx-amber">{item.share} Market Share</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full rounded-2xl bg-nx-amber" style={{ width: item.share }} />
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </motion.div>
          )}

        </main>

        <AnimatePresence>
          {selectedDoc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setSelectedDoc(null);
                setCopyDocSuccess(false);
              }}
              id="integration-modal-backdrop"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-nx-ink border border-nx-border w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
                id="integration-modal-content"
              >
                {/* Header */}
                <div className="p-6 border-b border-nx-border flex items-center justify-between bg-white/5" id="integration-modal-header">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-nx-amber uppercase tracking-widest block mb-1">
                      Integration Workspace
                    </span>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#ffffff] font-display">
                      {selectedDoc.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDoc(null);
                      setCopyDocSuccess(false);
                    }}
                    className="p-2 text-nx-muted hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                    id="integration-modal-close-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6" id="integration-modal-body">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">
                      Action Description
                    </h4>
                    <p className="text-xs text-nx-muted leading-relaxed uppercase tracking-wide">
                      {selectedDoc.desc}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">
                      Usage Instructions
                    </h4>
                    <p className="text-xs text-nx-muted leading-relaxed uppercase tracking-wide">
                      {selectedDoc.instructions}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">
                        Payload / Endpoint Sample
                      </h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedDoc.code);
                          setCopyDocSuccess(true);
                           setTimeout(() => setCopyDocSuccess(false), 2000);
                        }}
                        className="text-[9px] text-nx-amber hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg"
                        id="integration-modal-copy-btn"
                      >
                        {copyDocSuccess ? (
                          <>
                            <Check className="w-3 h-3 text-nx-green" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Sample
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 bg-black/60 border border-white/5 rounded-xl text-[10px] text-nx-amber font-mono overflow-x-auto whitespace-pre leading-relaxed">
                      {selectedDoc.code}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/40 border-t border-nx-border flex justify-end" id="integration-modal-footer">
                  <button
                    onClick={() => {
                      setSelectedDoc(null);
                      setCopyDocSuccess(false);
                    }}
                    className="bg-white text-nx-ink px-5 py-2 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-nx-amber hover:text-nx-ink transition-all"
                    id="integration-modal-dismiss-btn"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Minimal icon imports needed
