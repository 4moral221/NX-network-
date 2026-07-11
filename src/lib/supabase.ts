import { createClient } from '@supabase/supabase-js';

// ============================================================
// SECURITY NOTE: this file must NEVER read or reference any
// service_role key, under any env var name (VITE_-prefixed or not).
// This file runs in the browser. Anything it reads ends up in the
// compiled JS bundle, visible to any user via devtools.
//
// The service_role key belongs ONLY in Supabase Edge Functions,
// read via Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') server-side.
// If the admin dashboard needs privileged operations, it must call
// an edge function — never hold the key itself.
//
// Previous version of this file read VITE_SUPABASE_SERVICE_ROLE_KEY
// and preferred it over the anon key for the default `supabase`
// export, plus exported a dedicated `supabaseAdmin` client. Neither
// pattern is used anywhere in src/ currently (verified via repo-wide
// grep before this fix), but the moment that env var was ever set in
// Vercel, the service_role key would be baked into the public JS
// bundle for every visitor. Removed entirely — do not reintroduce.
// ============================================================

const getEnv = (key: string) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key];
    }
  } catch (e) {}
  return "";
};

let supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://balrpczytusvzzquzqob.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (supabaseUrl.startsWith('eyJ')) {
  // Defensive: catches the case where URL and key env vars were swapped
  supabaseUrl = 'https://balrpczytusvzzquzqob.supabase.co';
}
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ============================================================
// mockSupabase — in-memory/localStorage demo client used ONLY by
// the USSD simulator's demo mode (src/services/ussd/db.ts checks
// context.isDemo before routing to this instead of the real client).
// Contains no real credentials, no network calls — safe to keep.
// ============================================================

const getStoredMockTable = (table: string): any[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`nx_mock_table_${table}`);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { console.warn(`Failed to parse mock table ${table}`, e); }
  }

  let defaults: any[] = [];
  if (table === 'users') {
    defaults = [
      { id: '1', phone: '254700000001', merchant_code: 'M10001', role: 'merchant', franchise_tier: 'BASIC', name: 'Duka One', status: 'active', nx_balance: 1500 },
      { id: '2', phone: '254700000002', merchant_code: 'M10002', role: 'merchant', franchise_tier: 'CERTIFIED', name: 'Duka Two', status: 'active', nx_balance: 2800 },
      { id: '3', phone: '254700000003', merchant_code: 'M10003', role: 'merchant', franchise_tier: 'HUB', name: 'Duka Hub', status: 'active', nx_balance: 5000 },
      { id: '4', phone: '254700000004', role: 'customer', name: 'John Customer', status: 'active', nx_balance: 350 },
    ];
  } else if (table === 'transactions') {
    defaults = [
      { id: 'tx-1', merchant_code: 'M10001', customer_phone: '254700000004', nx_earned: 15, nx_redeemed: 0, amount: 150, status: 'completed', created_at: new Date().toISOString() },
      { id: 'tx-2', merchant_code: 'M10002', customer_phone: '254700000004', nx_earned: 25, nx_redeemed: 10, amount: 250, status: 'completed', created_at: new Date().toISOString() },
    ];
  } else if (table === 'merchant_margins') {
    defaults = [
      { id: 'm-1', merchant_code: 'M10001', gross_margin: 5000, created_at: new Date().toISOString() },
      { id: 'm-2', merchant_code: 'M10002', gross_margin: 12000, created_at: new Date().toISOString() },
    ];
  } else if (table === 'fmcg_margin_contributions') {
    defaults = [
      { id: 'f-1', merchant_code: 'M10002', contribution_amount: 1500, status: 'active', effective_from: '2026-01-01', effective_to: null },
    ];
  } else if (table === 'fmcg_partners') {
    defaults = [
      { id: 'p-1', name: 'Unilever', partner_type: 'fmcg', active: true, created_at: new Date().toISOString() },
      { id: 'p-2', name: 'Kapa Oil', partner_type: 'fmcg', active: true, created_at: new Date().toISOString() },
    ];
  }

  localStorage.setItem(`nx_mock_table_${table}`, JSON.stringify(defaults));
  return defaults;
};

const setStoredMockTable = (table: string, data: any[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`nx_mock_table_${table}`, JSON.stringify(data));
  }
};

class SupabaseMockBuilder {
  private table: string;
  private filters: { column: string; value: any; op: string }[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitCount: number | null = null;
  private isUpdateCall = false;
  private isInsertCall = false;
  private valuesToSave: any = null;

  constructor(table: string) { this.table = table; }
  select() { return this; }
  insert(values: any) { this.isInsertCall = true; this.valuesToSave = values; return this; }
  update(values: any) { this.isUpdateCall = true; this.valuesToSave = values; return this; }
  upsert(values: any) { this.isInsertCall = true; this.valuesToSave = values; return this; }
  delete() { return this; }
  eq(column: string, value: any) { this.filters.push({ column, value, op: 'eq' }); return this; }
  neq(column: string, value: any) { this.filters.push({ column, value, op: 'neq' }); return this; }
  gt(column: string, value: any) { this.filters.push({ column, value, op: 'gt' }); return this; }
  lt(column: string, value: any) { this.filters.push({ column, value, op: 'lt' }); return this; }
  gte(column: string, value: any) { this.filters.push({ column, value, op: 'gte' }); return this; }
  lte(column: string, value: any) { this.filters.push({ column, value, op: 'lte' }); return this; }
  like(column: string, value: any) { this.filters.push({ column, value, op: 'like' }); return this; }
  ilike(column: string, value: any) { this.filters.push({ column, value, op: 'ilike' }); return this; }
  in(column: string, values: any[]) { this.filters.push({ column, value: values, op: 'in' }); return this; }
  or() { return this; }
  not() { return this; }
  order(column: string, options?: any) { this.orderCol = column; this.orderAsc = options?.ascending !== false; return this; }
  limit(count: number) { this.limitCount = count; return this; }

  private getFilteredData(dataList: any[]): any[] {
    let data = [...dataList];
    for (const filter of this.filters) {
      data = data.filter(item => {
        const val = item[filter.column];
        if (val === undefined) return true;
        const fv = filter.value;
        switch (filter.op) {
          case 'eq':  return String(val).toLowerCase() === String(fv).toLowerCase();
          case 'neq': return String(val).toLowerCase() !== String(fv).toLowerCase();
          case 'gt':  return val > fv;
          case 'lt':  return val < fv;
          case 'gte': return val >= fv;
          case 'lte': return val <= fv;
          case 'like': case 'ilike': return String(val).toLowerCase().includes(String(fv).toLowerCase());
          case 'in':  return Array.isArray(fv) && fv.some(x => String(x).toLowerCase() === String(val).toLowerCase());
          default: return true;
        }
      });
    }
    if (this.orderCol) {
      data.sort((a, b) => {
        const vA = a[this.orderCol!], vB = b[this.orderCol!];
        if (vA < vB) return this.orderAsc ? -1 : 1;
        if (vA > vB) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }
    if (this.limitCount !== null) data = data.slice(0, this.limitCount);
    return data;
  }

  private executeWrite() {
    let list = getStoredMockTable(this.table);
    if (this.isInsertCall && this.valuesToSave) {
      const items = Array.isArray(this.valuesToSave) ? this.valuesToSave : [this.valuesToSave];
      const withId = items.map((x: any) => ({ id: x.id || `mock-${Math.random().toString(36).slice(2)}`, created_at: x.created_at || new Date().toISOString(), ...x }));
      list = [...list, ...withId];
      setStoredMockTable(this.table, list);
      return Array.isArray(this.valuesToSave) ? withId : withId[0];
    }
    if (this.isUpdateCall && this.valuesToSave) {
      const filtered = this.getFilteredData(list);
      const ids = filtered.map(x => x.id);
      list = list.map(item => ids.includes(item.id) ? { ...item, ...this.valuesToSave } : item);
      setStoredMockTable(this.table, list);
      return filtered.map(x => ({ ...x, ...this.valuesToSave }))[0] || this.valuesToSave;
    }
    return null;
  }

  async single() {
    if (this.isInsertCall || this.isUpdateCall) return { data: this.executeWrite(), error: null };
    const data = this.getFilteredData(getStoredMockTable(this.table));
    return { data: data[0] || null, error: data[0] ? null : { message: 'Not found' } };
  }
  async maybeSingle() {
    if (this.isInsertCall || this.isUpdateCall) return { data: this.executeWrite(), error: null };
    const data = this.getFilteredData(getStoredMockTable(this.table));
    return { data: data[0] || null, error: null };
  }
  async then(onfulfilled?: any, onrejected?: any) {
    if (this.isInsertCall || this.isUpdateCall) return Promise.resolve({ data: this.executeWrite(), error: null }).then(onfulfilled, onrejected);
    const data = this.getFilteredData(getStoredMockTable(this.table));
    return Promise.resolve({ data, error: null, count: data.length }).then(onfulfilled, onrejected);
  }
}

export const mockSupabase = {
  from: (table: string) => new SupabaseMockBuilder(table),
  rpc: (fn: string) => fn === 'get_nx_system_balance'
    ? Promise.resolve({ data: 1200, error: null })
    : Promise.resolve({ data: null, error: null }),
  channel: () => ({ on: function() { return this; }, subscribe: (cb?: Function) => { if (cb) cb('SUBSCRIBED'); return { unsubscribe: () => {} }; } }),
  removeChannel: () => Promise.resolve({ error: null }),
  removeAllChannels: () => Promise.resolve({ error: null }),
} as any;

// Admin dashboard privileged operations (creating partner API keys,
// bulk merchant actions, etc.) must go through an edge function that
// holds the service_role key server-side — e.g.:
//
//   await supabase.functions.invoke('admin-action', { body: {...} })
//
// There is intentionally no `supabaseAdmin` export here anymore.
