import React, { useState, useEffect, useRef } from 'react';
import { Marker, Popup, useMap, CircleMarker, TileLayer, MapContainer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/src/lib/supabase';
import { parseCoordinate, getUserObj } from '@/src/lib/mapUtils';
import { TrendingUp, Users, Wallet, Activity, Compass, Map as MapIcon, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { motion } from 'motion/react';

const GOOGLE_MAPS_KEY = 
  process.env.GOOGLE_MAPS_PLATFORM_KEY || 
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY || 
  '';
const hasGoogleMapsKey = Boolean(GOOGLE_MAPS_KEY) && GOOGLE_MAPS_KEY !== 'YOUR_API_KEY';

const shopIcon = new L.DivIcon({
  html: '<div style="font-size: 24px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">🏪</div>',
  className: 'custom-shop-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const outOfStockIcon = new L.DivIcon({
  html: '<div style="font-size: 24px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5)); border: 2px solid red; border-radius: 50%; background: rgba(255,0,0,0.2);">🏪</div>',
  className: 'custom-shop-icon-alert',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

interface MerchantData {
  id: string;
  merchant_code: string;
  name: string;
  lat: number;
  lng: number;
  out_of_stock: string[];
}

interface Transaction {
  id: string;
  transaction_code: string;
  merchant_code: string;
  amount: number;
  nx_earned: number;
  nx_redeemed: number;
  created_at: string;
  merchant_name?: string;
  lat?: number;
  lng?: number;
}

const getCoordinates = (locationStr: string | null) => {
  if (!locationStr) return null;
  const loc = locationStr.toLowerCase();
  const coordinates: Record<string, [number, number]> = {
    'nairobi': [-1.2864, 36.8172],
    'mombasa': [-4.0352, 39.6716],
    'kisumu': [-0.0917, 34.7680],
    'nakuru': [-0.3031, 36.0800],
    'eldoret': [0.5143, 35.2698],
    'keiyo': [0.6698, 35.4851],
    'uasin gishu': [0.5204, 35.2590],
    'kiambu': [-1.1714, 36.8356],
    'kajiado': [-1.8524, 36.7768],
    'machakos': [-1.5177, 37.2634],
    'meru': [0.0463, 37.6559],
    'nyeri': [-0.4167, 36.9500],
    'kilifi': [-3.6307, 39.8499],
    'kwale': [-4.1737, 39.4521],
    'narok': [-1.0788, 35.8601],
    'garissa': [-0.4532, 39.6461],
    'wajir': [1.7471, 40.0573],
    'mandera': [3.9366, 41.8569],
    'turkana': [3.1160, 35.5960],
    'bungoma': [0.5635, 34.5606],
    'kakamega': [0.2827, 34.7519],
    'busia': [0.4608, 34.1115],
    'kericho': [-0.3677, 35.2831],
    'bomet': [ -0.7813, 35.3416]
  };

  for (const [key, coords] of Object.entries(coordinates)) {
    if (loc.includes(key)) {
      return { lat: coords[0] + (Math.random() - 0.5) * 0.05, lng: coords[1] + (Math.random() - 0.5) * 0.05 };
    }
  }
  return null;
};

const agentIcon = new L.DivIcon({
  html: '<div style="font-size: 24px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5)); border: 2px solid #00d4ff; border-radius: 50%; background: rgba(0,212,255,0.2);">🛵</div>',
  className: 'custom-agent-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

interface StaffData {
  id: string;
  name: string;
  phone: string;
  admin_role: string;
  lat: number;
  lng: number;
  last_updated: string;
}

function MapRecenter({ center, zoom }: { center: { lat: number, lng: number }, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

export interface LiveMapProps {
  hideStaffAndNX?: boolean;
}

export default function LiveMap({ hideStaffAndNX = false }: LiveMapProps = {}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [stats, setStats] = useState({
    txCount: 0,
    volume: 0,
    merchants: 0,
    nxIssued: 0,
    activeStaff: 0
  });

  const [merchantsList, setMerchantsList] = useState<MerchantData[]>([]);
  const [staffList, setStaffList] = useState<StaffData[]>([]);

  // Google Maps & Geolocation Controls
  const [mapProvider, setMapProvider] = useState<'google' | 'leaflet'>(hasGoogleMapsKey ? 'google' : 'leaflet');
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number }>({ lat: -1.2864, lng: 36.8172 });
  const [mapZoom, setMapZoom] = useState(7);
  const [selectedPin, setSelectedPin] = useState<any | null>(null);
  const [geolocating, setGeolocating] = useState(false);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        setMapZoom(13);
        setGeolocating(false);
        toast.success("Location acquired successfully!");
      },
      (error) => {
        console.error("Geolocation error:", error);
        setGeolocating(false);
        alert("Failed to acquire location. Please check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const fetchStaff = async () => {
    const { data: staff, error } = await supabase
      .from('users')
      .select('id, name, phone, admin_role, latitude, longitude, updated_at')
      .eq('is_admin', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) return;

    const processed = staff.map(s => {
      const latVal = parseCoordinate(s.latitude) ?? (-1.2864 + (Math.random() - 0.5) * 0.5);
      const lngVal = parseCoordinate(s.longitude) ?? (36.8172 + (Math.random() - 0.5) * 0.5);
      return {
        id: s.id,
        name: s.name || 'Staff',
        phone: s.phone,
        admin_role: s.admin_role || 'Staff',
        lat: latVal,
        lng: lngVal,
        last_updated: s.updated_at
      };
    });

    setStaffList(processed);
    setStats(prev => ({ ...prev, activeStaff: processed.length }));
  };

  const fetchMerchants = async () => {
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, merchant_code, name, location, latitude, longitude')
      .eq('role', 'merchant')
      .not('merchant_code', 'is', null);

    if (userError) return;

    const codeList = users.map(u => u.merchant_code);
    const { data: inventory } = await supabase
      .from('merchant_inventory')
      .select('merchant_code, sku_code, quantity')
      .in('merchant_code', codeList)
      .lt('quantity', 10); // threshold for "running out"

    const stockMap: Record<string, string[]> = {};
    if (inventory) {
      inventory.forEach(inv => {
        if (!stockMap[inv.merchant_code]) stockMap[inv.merchant_code] = [];
        stockMap[inv.merchant_code].push(inv.sku_code);
      });
    }

    const processed = users.map(u => {
      const coords = getCoordinates(u.location);
      const latVal = parseCoordinate(u.latitude) ?? parseCoordinate(coords?.lat) ?? (-1.2864 + (Math.random() - 0.5) * 0.5);
      const lngVal = parseCoordinate(u.longitude) ?? parseCoordinate(coords?.lng) ?? (36.8172 + (Math.random() - 0.5) * 0.5);
      return {
        id: u.id,
        merchant_code: u.merchant_code,
        name: u.name || 'NX Merchant',
        lat: latVal,
        lng: lngVal,
        out_of_stock: stockMap[u.merchant_code] || []
      };
    });

    setMerchantsList(processed);
  };

  const fetchRecentTxns = async () => {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users!transactions_merchant_phone_fkey (
          name,
          location,
          latitude,
          longitude
        )
      `)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Map fetch error:', error);
      return;
    }

    const processed = (transactions || []).map((t: any) => {
      const userObj = getUserObj(t.users);
      const coords = getCoordinates(userObj?.location);
      const latVal = parseCoordinate(userObj?.latitude) ?? parseCoordinate(coords?.lat) ?? (-1.2864 + (Math.random() - 0.5) * 0.5);
      const lngVal = parseCoordinate(userObj?.longitude) ?? parseCoordinate(coords?.lng) ?? (36.8172 + (Math.random() - 0.5) * 0.5);
      return {
        ...t,
        merchant_name: userObj?.name || t.merchant_code,
        lat: latVal,
        lng: lngVal
      };
    });

    setTxns(processed);
    
    setStats({
      txCount: processed.length,
      volume: processed.reduce((acc, curr) => acc + Number(curr.amount), 0),
      merchants: new Set(processed.map(p => p.merchant_code)).size,
      nxIssued: processed.reduce((acc, curr) => acc + Number(curr.nx_earned), 0)
    });
  };

  useEffect(() => {
    fetchRecentTxns();
    fetchMerchants();
    fetchStaff();

    const channel = supabase
      .channel('live-map')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => fetchRecentTxns())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: 'is_admin=eq.true' }, () => fetchStaff())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Stats Bar */}
      <div className={`grid gap-4 ${hideStaffAndNX ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        {[
          { label: 'Active Staff', val: stats.activeStaff, icon: <Activity className="w-4 h-4 text-[#00d4ff]" />, hide: hideStaffAndNX },
          { label: 'Network Volume', val: `KSH ${stats.volume.toLocaleString()}`, icon: <TrendingUp className="w-4 h-4 text-[#00d4ff]" /> },
          { label: 'Active Merchants', val: stats.merchants, icon: <Users className="w-4 h-4 text-[#ffb547]" /> },
          { label: 'NX Issued', val: stats.nxIssued.toLocaleString(), icon: <Wallet className="w-4 h-4 text-[#ff4757]" />, hide: hideStaffAndNX },
        ].filter(s => !s.hide).map((s, i) => (
          <div key={i} className="bg-[#111111] border border-[#1e1e1e] p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] flex items-center justify-center">
              {s.icon}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#666] mb-0.5">{s.label}</div>
              <div className="font-mono text-lg font-bold text-[#e8e8e8]">{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map Controls - Positioned directly above, not in the map */}
      <div className="bg-nx-card border border-nx-border p-3 rounded-2xl flex gap-2 flex-wrap items-center shadow-lg justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-nx-muted font-mono font-bold">Mode:</span>
          <div className="flex gap-1 bg-[#1a1b25] p-1 rounded-lg border border-nx-border">
            <button 
              id="map-pins-btn"
              onClick={() => setHeatmapMode(false)}
              className={`px-3 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${!heatmapMode ? 'bg-nx-green/10 text-nx-green border border-nx-green/20' : 'text-nx-muted hover:text-nx-paper'}`}
            >
              Pins
            </button>
            <button 
              id="map-heatmap-btn"
              onClick={() => setHeatmapMode(true)}
              className={`px-3 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${heatmapMode ? 'bg-nx-ember/10 text-nx-ember border border-nx-ember/20' : 'text-nx-muted hover:text-nx-paper'}`}
            >
              Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="flex-1 bg-white border border-nx-border rounded-2xl overflow-hidden relative min-h-[400px]">
        {mapProvider === 'google' && hasGoogleMapsKey ? (
          <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
            <Map
              center={mapCenter}
              zoom={mapZoom}
              onCenterChanged={(e) => setMapCenter(e.detail.center)}
              onZoomChanged={(e) => setMapZoom(e.detail.zoom)}
              mapId="NX_LIVE_MAP"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%', background: '#ffffff' }}
              gestureHandling={'cooperative'}
              disableDefaultUI={true}
            >
              {showStaff && staffList.map(staff => (
                <AdvancedMarker 
                  key={staff.id} 
                  position={{ lat: staff.lat, lng: staff.lng }}
                  onClick={() => setSelectedPin({ ...staff, type: 'Staff' })}
                >
                  <div style={{ fontSize: '24px', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))', width: '28px', height: '28px' }} className="cursor-pointer select-none">
                    🛵
                  </div>
                </AdvancedMarker>
              ))}

              {!heatmapMode && merchantsList.map(merchant => (
                <AdvancedMarker 
                  key={merchant.id} 
                  position={{ lat: merchant.lat, lng: merchant.lng }}
                  onClick={() => setSelectedPin({ ...merchant, type: 'Merchant' })}
                >
                  <div 
                    style={{ 
                      fontSize: '24px', 
                      filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))',
                      width: '24px', 
                      height: '24px' 
                    }} 
                    className={`cursor-pointer select-none ${merchant.out_of_stock.length > 0 ? 'border-2 border-red-500 rounded-full bg-red-500/20 p-0.5' : ''}`}
                  >
                    🏪
                  </div>
                </AdvancedMarker>
              ))}

              {heatmapMode ? 
                txns.map((txn, i) => (
                  <AdvancedMarker key={`heat-${i}`} position={{ lat: txn.lat!, lng: txn.lng! }}>
                    <div className="relative flex items-center justify-center pointer-events-none">
                      <div className="absolute w-[30px] h-[30px] rounded-full bg-red-500/25 animate-pulse" />
                      <div className="absolute w-[60px] h-[60px] rounded-full bg-red-500/15" />
                      <div className="absolute w-[100px] h-[100px] rounded-full bg-orange-500/05" />
                      <div className="w-2.5 h-2.5 rounded-full bg-red-650" />
                    </div>
                  </AdvancedMarker>
                ))
              : 
                txns.map((txn) => (
                  <AdvancedMarker 
                    key={txn.id} 
                    position={{ lat: txn.lat!, lng: txn.lng! }}
                    onClick={() => setSelectedPin({ ...txn, type: 'Transaction' })}
                  >
                    <div className="relative flex items-center justify-center cursor-pointer select-none">
                      <div className="absolute w-[20px] h-[20px] rounded-full bg-emerald-500/30 animate-ping" />
                      <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 border border-black flex items-center justify-center shadow-lg text-[9px] text-black font-extrabold font-mono">
                        $
                      </div>
                    </div>
                  </AdvancedMarker>
                ))
              }
            </Map>
          </APIProvider>
        ) : (
          <MapContainer 
            center={[mapCenter.lat, mapCenter.lng]} 
            zoom={mapZoom} 
            style={{ height: '100%', width: '100%', background: '#ffffff' }}
            zoomControl={false}
          >
            <MapRecenter center={mapCenter} zoom={mapZoom} />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            
            {showStaff && staffList.filter(s => typeof s.lat === 'number' && !isNaN(s.lat) && typeof s.lng === 'number' && !isNaN(s.lng)).map(staff => (
              <Marker 
                key={staff.id} 
                position={[staff.lat, staff.lng]} 
                icon={agentIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedPin({ ...staff, type: 'Staff' });
                  },
                }}
              />
            ))}
            
            {!heatmapMode && merchantsList.filter(m => typeof m.lat === 'number' && !isNaN(m.lat) && typeof m.lng === 'number' && !isNaN(m.lng)).map(merchant => (
              <Marker 
                key={merchant.id} 
                position={[merchant.lat, merchant.lng]} 
                icon={merchant.out_of_stock.length > 0 ? outOfStockIcon : shopIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedPin({ ...merchant, type: 'Merchant' });
                  },
                }}
              />
            ))}
            
            {heatmapMode ? 
              txns.filter(t => typeof t.lat === 'number' && !isNaN(t.lat) && typeof t.lng === 'number' && !isNaN(t.lng)).map((txn, i) => (
                <React.Fragment key={`heat-${i}`}>
                   <CircleMarker center={[txn.lat!, txn.lng!]} radius={15} pathOptions={{ stroke: false, fillColor: '#ff0000', fillOpacity: 0.2 }} />
                   <CircleMarker center={[txn.lat!, txn.lng!]} radius={30} pathOptions={{ stroke: false, fillColor: '#ff4757', fillOpacity: 0.1 }} />
                   <CircleMarker center={[txn.lat!, txn.lng!]} radius={50} pathOptions={{ stroke: false, fillColor: '#ffb547', fillOpacity: 0.05 }} />
                </React.Fragment>
              ))
            : 
              txns.filter(t => typeof t.lat === 'number' && !isNaN(t.lat) && typeof t.lng === 'number' && !isNaN(t.lng)).map((txn) => (
                <CircleMarker
                  key={txn.id}
                  center={[txn.lat!, txn.lng!]}
                  radius={8}
                  pathOptions={{
                    fillColor: '#00ff88',
                    fillOpacity: 0.6,
                    color: '#00ff88',
                    weight: 1
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedPin({ ...txn, type: 'Transaction' });
                    },
                  }}
                />
              ))}
          </MapContainer>
        )}

        {/* Selected Pin Details Card */}
        {selectedPin && (
          <motion.div 
            drag
            dragConstraints={mapContainerRef}
            dragElastic={0.1}
            dragMomentum={false}
            className="absolute bottom-4 left-4 z-[500] bg-[#0c0d14]/95 backdrop-blur-md border border-[#1f1f2e] p-5 rounded-xl shadow-2xl max-w-xs w-[calc(100%-2rem)] cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex justify-between items-start mb-3 pointer-events-none">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-[#ff6b35] bg-[#ff6b35]/10 px-2 py-0.5 rounded uppercase font-bold font-display">
                  {selectedPin.type}
                </span>
                <h4 className="font-display font-bold text-sm text-white mt-1.5">{selectedPin.name || 'NX Network Node'}</h4>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin(null);
                }}
                className="text-neutral-500 hover:text-white text-xs font-bold font-mono px-1.5 py-0.5 rounded hover:bg-white/5 pointer-events-auto"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 text-xs text-neutral-400 pointer-events-none">
              {selectedPin.type === 'Merchant' && (
                <>
                  <div className="flex justify-between">
                    <span>Code:</span>
                    <span className="font-mono font-bold text-white">{selectedPin.merchant_code}</span>
                  </div>
                  <div>
                    {selectedPin.out_of_stock?.length > 0 ? (
                      <div className="text-red-500 font-bold bg-red-500/10 p-2 rounded border border-red-500/20 mt-1">
                        ⚠️ Low Stock: {selectedPin.out_of_stock.join(', ')}
                      </div>
                    ) : (
                      <div className="text-[#00ff88] font-bold bg-[#00ff88]/10 p-2 rounded border border-[#00ff88]/20 mt-1">
                        ✓ Stock Status Normal
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedPin.type === 'Staff' && (
                <>
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="text-white font-bold">{selectedPin.admin_role?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="font-mono text-white">{selectedPin.phone || 'N/A'}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 italic mt-1 text-right">
                    Updated: {new Date(selectedPin.last_updated).toLocaleTimeString()}
                  </div>
                </>
              )}

              {selectedPin.type === 'Transaction' && (
                <>
                  <div className="flex justify-between">
                    <span>Txn Code:</span>
                    <span className="font-mono font-bold text-white">{selectedPin.transaction_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-mono font-bold text-white">KES {selectedPin.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NX Earned:</span>
                    <span className="font-mono text-[#00ff88] font-bold">+{selectedPin.nx_earned} NX</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Live Feed Overlay */}
        <div className="absolute top-4 right-4 w-64 bg-[#060810]/80 backdrop-blur-md border border-[#1e1e1e] rounded-xl overflow-hidden z-[1000] hidden md:block">
          <div className="px-4 py-2 border-b border-[#1e1e1e] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#666]">Live Feed</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[9px] font-mono text-[#00ff88]">LIVE</span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {txns.slice(0, 5).map((txn) => (
              <div key={txn.id} className="p-3 border-b border-[#1e1e1e] last:border-0 hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-bold text-[#e8e8e8] truncate pr-2">{txn.merchant_name}</span>
                  <span className="text-[9px] font-mono text-[#666] shrink-0">{new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-[#00d4ff]">KSH {txn.amount}</span>
                  <span className="text-[10px] font-mono text-[#00ff88]">+{txn.nx_earned} NX</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
