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

let supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://balrpczytusvzzquzqob.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY') || getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxNjY4MDAsImV4cCI6MjAyMjcyMjgwMH0.placeholder';

if (supabaseUrl.startsWith('eyJ')) {
  // Defensive: catches the case where URL and key env vars were swapped
  supabaseUrl = 'https://balrpczytusvzzquzqob.supabase.co';
}
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

// Direct export of standard Supabase JS client without table query interceptors or local bypasses
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

const nodeMockStore: Record<string, any[]> = {};

const getStoredMockTable = (table: string): any[] => {
  if (typeof window === 'undefined') {
    if (!nodeMockStore[table]) {
      if (table === 'users') {
        nodeMockStore[table] = [
          { id: '1', email: 'formidablefoe254@gmail.com', phone: '254700000000', role: 'admin', is_admin: true, admin_role: 'super_admin', name: 'Admin', status: 'active', language: 'en' },
          { id: '2', phone: '254700000005', role: 'customer', name: 'Alex jaka', status: 'active', nx_balance: 1000, recovery_pin: '1234', language: 'en' },
          { id: 'merchant-3267', phone: '254703267919', role: 'merchant', merchant_code: 'M798253', location: 'Mombasa', national_id: '12345678', recovery_pin: '1234', status: 'active', name: 'Corner Shop', franchise_tier: 'BASIC', nx_balance: 0, language: 'en' }
        ];
      } else if (table === 'merchant_margins') {
        nodeMockStore[table] = [
          { id: 'margin-3267', merchant_code: 'M798253', gross_margin: 10000 }
        ];
      } else {
        nodeMockStore[table] = [];
      }
    }
    return nodeMockStore[table];
  }
  const stored = localStorage.getItem(`nx_mock_table_${table}`);
  if (stored) {
    try {
      let parsed = JSON.parse(stored);
      let migrated = false;
      if (Array.isArray(parsed)) {
        parsed = parsed.map((item: any) => {
          if (item.merchant_code === 'M703267') {
            item.merchant_code = 'M798253';
            migrated = true;
          }
          return item;
        });
        if (migrated) {
          localStorage.setItem(`nx_mock_table_${table}`, JSON.stringify(parsed));
        }
      }
      return parsed;
    } catch (e) { console.warn(`Failed to parse mock table ${table}`, e); }
  }

  let defaults: any[] = [];
  if (table === 'users') {
    defaults = [
      { id: '1', email: 'formidablefoe254@gmail.com', phone: '254700000000', role: 'admin', is_admin: true, admin_role: 'super_admin', name: 'Admin', status: 'active', language: 'en' },
      { id: '2', phone: '254700000005', role: 'customer', name: 'Alex jaka', status: 'active', nx_balance: 1000, recovery_pin: '1234', language: 'en' },
      { id: 'merchant-3267', phone: '254703267919', role: 'merchant', merchant_code: 'M798253', location: 'Mombasa', national_id: '12345678', recovery_pin: '1234', status: 'active', name: 'Corner Shop', franchise_tier: 'BASIC', nx_balance: 0, language: 'en' }
    ];
  } else if (table === 'transactions') {
    defaults = [];
  } else if (table === 'merchant_margins') {
    defaults = [
      { id: 'margin-3267', merchant_code: 'M798253', gross_margin: 10000 }
    ];
  } else if (table === 'fmcg_margin_contributions') {
    defaults = [];
  } else if (table === 'fmcg_partners') {
    defaults = [];
  } else if (table === 'family_accounts') {
    defaults = [];
  }

  localStorage.setItem(`nx_mock_table_${table}`, JSON.stringify(defaults));
  return defaults;
};

const setStoredMockTable = (table: string, data: any[]) => {
  if (typeof window === 'undefined') {
    nodeMockStore[table] = data;
    return;
  }
  localStorage.setItem(`nx_mock_table_${table}`, JSON.stringify(data));
};

class SupabaseMockBuilder {
  private table: string;
  private filters: { column: string; value: any; op: string }[] = [];
  private orFilters: { column: string; value: any; op: string }[][] = [];
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
  or(expr?: string) {
    if (expr) {
      const parts = expr.split(',');
      const conds: { column: string; value: any; op: string }[] = [];
      for (const part of parts) {
        const m = part.match(/^([^.]+)\.([^.]+)\.(.+)$/);
        if (m) {
          conds.push({ column: m[1], op: m[2], value: m[3] });
        }
      }
      if (conds.length > 0) {
        this.orFilters.push(conds);
      }
    }
    return this;
  }
  not() { return this; }
  order(column: string, options?: any) { this.orderCol = column; this.orderAsc = options?.ascending !== false; return this; }
  limit(count: number) { this.limitCount = count; return this; }

  private getFilteredData(dataList: any[]): any[] {
    let data = [...dataList];
    for (const filter of this.filters) {
      data = data.filter(item => {
        const val = item[filter.column];
        if (val === undefined) return filter.op === 'neq';
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
    for (const orConds of this.orFilters) {
      data = data.filter(item => {
        return orConds.some(cond => {
          const val = item[cond.column];
          if (val === undefined) return false;
          const fv = cond.value;
          switch (cond.op) {
            case 'eq': return String(val).toLowerCase() === String(fv).toLowerCase();
            case 'neq': return String(val).toLowerCase() !== String(fv).toLowerCase();
            case 'like': case 'ilike': return String(val).toLowerCase().includes(String(fv).toLowerCase());
            default: return false;
          }
        });
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
  rpc: (fn: string, args?: any) => {
    if (fn === 'get_nx_system_balance') {
      return Promise.resolve({ data: 1200, error: null });
    }
    if (fn === 'hash_password') {
      const password = args?.password || "1234";
      return Promise.resolve({ data: "mock_hash_" + password, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  },
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
