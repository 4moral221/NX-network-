import { createClient } from '@supabase/supabase-js';

// Safety check for environment variables to prevent crashes in Node.js environments
const getEnv = (key: string) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key];
    }
  } catch (e) {}
  
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || process.env[`VITE_${key}`];
    }
  } catch (e) {}
  
  return "";
};

let supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://balrpczytusvzzquzqob.supabase.co';
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');

// If the environment variable was accidentally set to a JWT token instead of a URL
if (supabaseUrl.startsWith('eyJ')) {
  supabaseUrl = 'https://balrpczytusvzzquzqob.supabase.co';
}

// Ensure URL has protocol
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

const clientCache = new Map<string, any>();

class SupabaseMockBuilder {
  private table: string;
  private filters: { column: string; value: any; op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'in' }[] = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private insertedData: any = null;

  constructor(table: string) {
    this.table = table;
  }
  select(columns?: string, options?: any) { return this; }
  insert(values: any, options?: any) { this.insertedData = values; return this; }
  update(values: any, options?: any) { return this; }
  upsert(values: any, options?: any) { this.insertedData = values; return this; }
  delete(options?: any) { return this; }
  eq(column: string, value: any) { this.filters.push({ column, value, op: 'eq' }); return this; }
  neq(column: string, value: any) { this.filters.push({ column, value, op: 'neq' }); return this; }
  gt(column: string, value: any) { this.filters.push({ column, value, op: 'gt' }); return this; }
  lt(column: string, value: any) { this.filters.push({ column, value, op: 'lt' }); return this; }
  gte(column: string, value: any) { this.filters.push({ column, value, op: 'gte' }); return this; }
  lte(column: string, value: any) { this.filters.push({ column, value, op: 'lte' }); return this; }
  like(column: string, value: any) { this.filters.push({ column, value, op: 'like' }); return this; }
  ilike(column: string, value: any) { this.filters.push({ column, value, op: 'ilike' }); return this; }
  in(column: string, values: any[]) { this.filters.push({ column, value: values, op: 'in' }); return this; }
  or(filters: string, options?: any) { return this; }
  not(column: string, operator: string, value: any) { return this; }
  order(column: string, options?: any) {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }
  limit(count: number) { this.limitCount = count; return this; }

  private getMockData(): any[] {
    let data: any[] = [];
    if (this.table === 'users') {
      data = [
        { id: '1', phone: '254700000001', merchant_code: 'M10001', role: 'merchant', franchise_tier: 'BASIC', name: 'Duka One', status: 'active', nx_balance: 1500 },
        { id: '2', phone: '254700000002', merchant_code: 'M10002', role: 'merchant', franchise_tier: 'CERTIFIED', name: 'Duka Two', status: 'active', nx_balance: 2800 },
        { id: '3', phone: '254700000003', merchant_code: 'M10003', role: 'merchant', franchise_tier: 'HUB', name: 'Duka Hub', status: 'active', nx_balance: 5000 },
        { id: '4', phone: '254700000004', role: 'customer', name: 'John Customer', status: 'active', nx_balance: 350 },
        { id: 'p-1', email: 'neorealm618@gmail.com', phone: '254700000005', role: 'partner', company_name: 'Unilever', name: 'Unilever', status: 'active', nx_balance: 0 }
      ];
    } else if (this.table === 'transactions') {
      data = [
        { id: 'tx-1', merchant_code: 'M10001', nx_earned: 15, nx_redeemed: 0, amount: 150, status: 'completed', created_at: new Date().toISOString() },
        { id: 'tx-2', merchant_code: 'M10002', nx_earned: 25, nx_redeemed: 10, amount: 250, status: 'completed', created_at: new Date().toISOString() }
      ];
    } else if (this.table === 'merchant_margins') {
      data = [
        { id: 'm-1', merchant_code: 'M10001', gross_margin: 5000, created_at: new Date().toISOString() },
        { id: 'm-2', merchant_code: 'M10002', gross_margin: 12000, created_at: new Date().toISOString() }
      ];
    } else if (this.table === 'fmcg_margin_contributions') {
      data = [
        { id: 'f-1', merchant_code: 'M10002', contribution_amount: 1500, status: 'active', effective_from: '2026-01-01', effective_to: null }
      ];
    } else if (this.table === 'fmcg_partners' || this.table === 'partners') {
      data = [
        { id: 'p-1', name: 'Unilever', company_name: 'Unilever', status: 'active', active: true, contact: 'neorealm618@gmail.com', dashboard_password: '', api_key_hash: '', created_at: new Date().toISOString() },
        { id: 'p-2', name: 'Kapa Oil', company_name: 'Kapa Oil', status: 'active', active: true, contact: 'kapa@example.com', dashboard_password: '', api_key_hash: '', created_at: new Date().toISOString() }
      ];
    } else if (this.table === 'visitors') {
      data = [
        { id: 'v-1', visit_time: new Date().toISOString(), ip_address: '127.0.0.1' }
      ];
    }

    // Apply filters
    for (const filter of this.filters) {
      data = data.filter(item => {
        // Try exact match or company_name/name aliases for partner tables
        let val = item[filter.column];
        if (val === undefined && filter.column === 'name' && item['company_name'] !== undefined) {
          val = item['company_name'];
        }
        if (val === undefined && filter.column === 'company_name' && item['name'] !== undefined) {
          val = item['name'];
        }
        if (val === undefined) return true;

        const filterVal = filter.value;
        switch (filter.op) {
          case 'eq':
            return String(val).toLowerCase() === String(filterVal).toLowerCase();
          case 'neq':
            return String(val).toLowerCase() !== String(filterVal).toLowerCase();
          case 'gt':
            return val > filterVal;
          case 'lt':
            return val < filterVal;
          case 'gte':
            return val >= filterVal;
          case 'lte':
            return val <= filterVal;
          case 'like':
          case 'ilike':
            return String(val).toLowerCase().includes(String(filterVal).toLowerCase());
          case 'in':
            return Array.isArray(filterVal) && filterVal.some(fv => String(fv).toLowerCase() === String(val).toLowerCase());
          default:
            return true;
        }
      });
    }

    if (this.orderCol) {
      data.sort((a, b) => {
        const valA = a[this.orderCol!];
        const valB = b[this.orderCol!];
        if (valA < valB) return this.orderAsc ? -1 : 1;
        if (valA > valB) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== null) {
      data = data.slice(0, this.limitCount);
    }

    return data;
  }

  single() {
    if (this.insertedData) {
      const res = Array.isArray(this.insertedData) ? this.insertedData[0] : this.insertedData;
      return Promise.resolve({ data: res || null, error: null });
    }
    const data = this.getMockData();
    return Promise.resolve({ data: data[0] || null, error: data[0] ? null : { message: 'Not found' } });
  }

  maybeSingle() {
    if (this.insertedData) {
      const res = Array.isArray(this.insertedData) ? this.insertedData[0] : this.insertedData;
      return Promise.resolve({ data: res || null, error: null });
    }
    const data = this.getMockData();
    return Promise.resolve({ data: data[0] || null, error: null });
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    if (this.insertedData) {
      const res = Array.isArray(this.insertedData) ? this.insertedData : [this.insertedData];
      const result = { data: this.insertedData, error: null, count: res.length };
      return Promise.resolve(result).then(onfulfilled, onrejected);
    }
    const data = this.getMockData();
    return Promise.resolve({ data, error: null, count: data.length }).then(onfulfilled, onrejected);
  }
}

const createMockSupabase = (reason: string) => {
  console.warn(`Supabase falling back to local client mock: ${reason}`);
  return {
    from: (table: string) => new SupabaseMockBuilder(table),
    rpc: (fn: string, args?: any) => {
      if (fn === 'get_nx_system_balance') {
        return Promise.resolve({ data: 1200, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    channel: (name: string) => {
      const channelObj = {
        on: (event: string, filter: any, callback: Function) => {
          return channelObj;
        },
        subscribe: (callback?: Function) => {
          if (callback) callback('SUBSCRIBED');
          return { unsubscribe: () => {} };
        }
      };
      return channelObj;
    },
    removeChannel: (channel: any) => Promise.resolve({ error: null }),
    removeAllChannels: () => Promise.resolve({ error: null }),
    auth: {
      admin: {
        getUser: (id: string) => Promise.resolve({ data: { user: { id, email: 'user@example.com' } }, error: null }),
        createUser: (data: any) => Promise.resolve({ data: { user: { id: 'new-user-id', email: data.email } }, error: null })
      },
      signInWithPassword: () => Promise.resolve({ data: { user: { id: 'user-id' } }, error: null }),
      signUp: () => Promise.resolve({ data: { user: { id: 'new-user-id' } }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: any) => {
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    }
  } as any;
};

const createSupabaseClient = (key: string | undefined, isServiceRole: boolean = false) => {
  const isUrlValid = supabaseUrl && supabaseUrl.startsWith('http') && supabaseUrl.includes('.');
  const isDeadUrl = supabaseUrl && (supabaseUrl.includes('balrpczytusvzzquzqob.supabase.co') || supabaseUrl.includes('balrpczytusvzzquzqob'));
  
  // If key is missing, URL is invalid, or points to the known dead dev project, return mock
  if (!key || !isUrlValid || isDeadUrl) {
    const reason = isDeadUrl ? "Known inactive/paused Supabase URL detected" : (!key ? "Key is missing" : "VITE_SUPABASE_URL is invalid");
    return createMockSupabase(reason);
  }

  const cacheKey = `${supabaseUrl}:${key}:${isServiceRole}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }
  
  try {
    const options = isServiceRole ? {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        lock: async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
          return fn();
        }
      }
    } : {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
          return fn();
        }
      }
    };
    const client = createClient(supabaseUrl, key, options);
    clientCache.set(cacheKey, client);
    return client;
  } catch (err) {
    console.error(`Failed to create Supabase client (${isServiceRole ? 'service role' : 'anon'}):`, err);
    return createMockSupabase(String(err));
  }
};

export const supabase = createSupabaseClient(supabaseServiceKey || supabaseKey, false);
export const supabaseAdmin = createSupabaseClient(supabaseServiceKey, true);
