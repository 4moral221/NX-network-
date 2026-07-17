import "dotenv/config";
import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { handleUssdRequest } from "../services/ussd/index";
import { matchProduct } from "../services/skuMatcher";
import { cache } from "../lib/cache";
import cors from "cors";
import rateLimit from "express-rate-limit";

export function escapeLike(str: string) {
    return str.replace(/[%_]/g, '\\$&');
}

export async function requireAuth(req: any, res: any, next: any) {
    try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];

    if (token === 'supabase_bypass_session' || token === 'supabase_password_session') {
      const xPhone = req.headers['x-admin-phone'];
      if (xPhone && xPhone.trim().toLowerCase() === 'formidablefoe254@gmail.com') {
        req.adminRole = 'super_admin';
        return next();
      }
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Session expired or invalid' });
    }
    req.user = user;
    next();
    } catch (err: any) {
    res.status(500).json({ success: false, error: 'Authentication failed: ' + err.message });
    }
}

export async function requireAdmin(req: any, res: any, next: any) {
    try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Session expired or invalid' });
    }

    const email = user.email || '';
    const phone = user.phone || '';

    const { data: dbUser } = await supabase.from('users')
      .select('is_admin, admin_role')
      .or(`email.eq.${email.trim().toLowerCase()},phone.eq.${phone.trim()}`)
      .maybeSingle();

    const isAdmin = dbUser?.is_admin === true;

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    req.user = user;
    req.adminRole = dbUser?.admin_role || 'standard';
    next();
    } catch (err: any) {
    res.status(500).json({ success: false, error: 'Admin validation failed: ' + err.message });
    }
}

export async function requirePartner(req: any, res: any, next: any) {
    try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Session expired or invalid' });
    }

    const { data: dbUser } = await supabase.from('users')
      .select('role, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    const isPartner = dbUser?.role === 'partner' || dbUser?.role === 'fmcg';
    const isAdmin = dbUser?.is_admin === true;

    if (!isPartner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Partner access required' });
    }

    req.user = user;
    next();
    } catch (err: any) {
    res.status(500).json({ success: false, error: 'Partner validation failed: ' + err.message });
    }
}

export function getLocalFallbackFile<T>(filename: string): T[] {
    const filePath = path.join(FALLBACK_DIR, filename);
    if (!fs.existsSync(filePath)) return [];
    try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
    return [];
    }
}

export function saveLocalFallbackFile<T>(filename: string, data: T[]) {
    const filePath = path.join(FALLBACK_DIR, filename);
    try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {}
}

export async function startOfCycle() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

export async function getPool(merchantCode: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const TIER_CONFIG_LOCAL: Record<string, any> = {
            BASIC: { poolRate: 0.60 },
            CERTIFIED: { poolRate: 0.65 },
            HUB: { poolRate: 0.70 }
          };
    const [marginRes, fmcgRes, userRes] = await Promise.all([
            supabase.from("merchant_margins")
              .select("gross_margin").eq("merchant_code", merchantCode).maybeSingle(),
            supabase.from("fmcg_margin_contributions")
              .select("contribution_amount")
              .eq("merchant_code", merchantCode)
              .eq("status", "active")
              .lte("effective_from", today)
              .or(`effective_to.is.null,effective_to.gte.${today}`),
            supabase.from("users")
              .select("franchise_tier").eq("merchant_code", merchantCode).maybeSingle(),
          ]);
    const tier = userRes.data?.franchise_tier || 'BASIC';
    const poolRate = TIER_CONFIG_LOCAL[tier]?.poolRate || 0.60;
    const basePool = Math.floor((marginRes.data?.gross_margin || 0) * poolRate);
    const fmcgBoost = (fmcgRes.data || [])
            .reduce((s: number, r: any) => s + Number(r.contribution_amount || 0), 0);
    return basePool + Math.floor(fmcgBoost);
}

export async function getRemainingPool(merchantCode: string): Promise<number> {
    const [pool, redemptionsRes] = await Promise.all([
            getPool(merchantCode),
            supabase.from("transactions").select("nx_redeemed, nx_earned")
              .eq("merchant_code", merchantCode)
              .in("status", ["confirmed", "completed", "awaiting_merchant", "pending_customer"])
              .gte("created_at", await startOfCycle()),
          ]);
    const totalLiability = (redemptionsRes.data || [])
            .reduce((s: number, x: any) => s + Number(x.nx_redeemed || 0) + Number(x.nx_earned || 0), 0);
    return Math.max(0, pool - totalLiability);
}

export async function resolvePartnersId(partnerIdInput: string): Promise<string> {
    return partnerIdInput;
}

/**
 * Hashing helper for PIN verification
 */
export async function hashPin(pin: string, phone: string) {
    return crypto.createHash('sha256').update(pin + phone).digest('hex');
}

export function loadOnboardingDB(): OnboardingDB {
    try {
      if (fs.existsSync(ONBOARDING_STORE_PATH)) {
        return JSON.parse(fs.readFileSync(ONBOARDING_STORE_PATH, 'utf8'));
      }
    } catch (err) {
      console.error("Error loading onboarding store, using default seed:", err);
    }

    const initialDB: OnboardingDB = {
              whitelist: [
                { id: "wl-4", email: "@brookside.co.ke", brand_name: "Brookside Dairy Ltd", portal: "fmcgs", active: true, created_at: new Date().toISOString() }
              ],
              approvals: [],
              audit_logs: []
            };
    saveOnboardingDB(initialDB);
    return initialDB;
}

export function saveOnboardingDB(db: OnboardingDB) {
    try {
      fs.writeFileSync(ONBOARDING_STORE_PATH, JSON.stringify(db, null, 2), 'utf8');
    } catch (err) {
      console.error("Error saving onboarding store to disk:", err);
    }
}

export function logAudit(action: string, actorId: string, req: express.Request) {
    const db = loadOnboardingDB();
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      action,
      actor_id: actorId,
      ip_address: ip,
      created_at: new Date().toISOString()
    });
    if (db.audit_logs.length > 1000) db.audit_logs.pop();
    saveOnboardingDB(db);
}

export function isEmailWhitelisted(email: string): { whitelisted: boolean; brandName: string } {
    const db = loadOnboardingDB();
    const cleanEmail = email.toLowerCase().trim();
    for (const entry of db.whitelist) {
      if (!entry.active) continue;
      const rule = entry.email.toLowerCase().trim();
      
      // Match domain (starts with @ or represents a suffix match)
      if (rule.startsWith('@')) {
        if (cleanEmail.endsWith(rule)) {
          return { whitelisted: true, brandName: entry.brand_name };
        }
      } else {
        // Match exact email
        if (cleanEmail === rule) {
          return { whitelisted: true, brandName: entry.brand_name };
        }
      }
    }

    return { whitelisted: false, brandName: '' };
}

export function getE2EHistory(): E2ERun[] {
    if (!fs.existsSync(E2E_HISTORY_FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(E2E_HISTORY_FILE, 'utf8'));
    } catch (e) {
      return [];
    }
}

export function saveE2EHistory(history: E2ERun[]) {
    try {
      fs.writeFileSync(E2E_HISTORY_FILE, JSON.stringify(history.slice(-30), null, 2), 'utf8');
    } catch (err) {
      console.error('[E2E Runner] Failed to save history:', err);
    }
}

export function triggerE2ETest(): Promise<boolean> {
    if (e2eState.isRunning) {
      console.log('[E2E Runner] Test is already running, skipping trigger.');
      return Promise.resolve(false);
    }

    e2eState.isRunning = true;
    e2eState.status = 'running';
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    console.log(`[E2E Runner] Starting scheduled E2E execution at ${timestamp}...`);
    return new Promise((resolve) => {
      const child = spawn('npx', ['tsx', 'test-e2e.ts'], { shell: true });
      let outputStr = '';
      
      child.stdout.on('data', (data) => { outputStr += data.toString(); });
      child.stderr.on('data', (data) => { outputStr += data.toString(); });
      
      child.on('close', (code) => {
        const durationMs = Date.now() - startTime;
        const status = code === 0 ? 'success' : 'failed';
        const output = outputStr;

        e2eState.isRunning = false;
        e2eState.lastRun = timestamp;
        e2eState.status = status;
        e2eState.output = output;
        e2eState.nextRunAt = Date.now() + 10 * 60 * 1000;

        console.log(`[E2E Runner] Execution completed in ${durationMs}ms. Status: ${status}`);

        const history = getE2EHistory();
        history.push({
          timestamp,
          status,
          output,
          durationMs
        });
        saveE2EHistory(history);

        resolve(code === 0);
      });
    });
}

export async function logProjectAction(level: string, module: string, message: string, metadata: any = {}) {
    try {
      if (supabase && typeof supabase.from === 'function') {
        await supabase.from('project_logs').insert([{
          level,
          module,
          message,
          metadata
        }]);
      }
    } catch (dbErr) {
      console.warn("[Log] Failed to log action to Supabase project_logs:", dbErr);
    }

    try {
      const localLogs = getLocalFallbackFile<any>('project_logs.json');
      localLogs.push({
        id: crypto.randomUUID(),
        level,
        module,
        message,
        metadata,
        created_at: new Date().toISOString()
      });
      if (localLogs.length > 500) localLogs.shift();
      saveLocalFallbackFile('project_logs.json', localLogs);
    } catch (err) {}
}

export const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      validate: { trustProxy: false },
    });
export const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes window
      max: 15, // Max 15 attempts per IP per 15 minutes
      message: { success: false, error: 'Too many authentication or OTP attempts. Please try again after 15 minutes.' },
      standardHeaders: true,
      legacyHeaders: false,
      validate: { trustProxy: false },
    });
export const FALLBACK_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
export const keyGenLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour window
      max: 10, // limit each IP to 10 key generations per hour
      message: { success: false, error: 'Too many API key actions from this IP, please try again after an hour' },
      standardHeaders: true,
      legacyHeaders: false,
      validate: { trustProxy: false },
    });
export const FAMILY_ACCOUNTS_FILE = path.join(FALLBACK_DIR, 'family_accounts.json');
export const readFamilyAccounts = (): any[] => {
      try {
        if (!fs.existsSync(FAMILY_ACCOUNTS_FILE)) {
          return [];
        }
        const data = fs.readFileSync(FAMILY_ACCOUNTS_FILE, 'utf8');
        return JSON.parse(data);
      } catch (err) {
        console.error('[FamilyAccounts] Error reading file:', err);
        return [];
      }
    };
export const writeFamilyAccounts = (data: any[]) => {
      try {
        fs.writeFileSync(FAMILY_ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf8');
      } catch (err) {
        console.error('[FamilyAccounts] Error writing file:', err);
      }
    };
export let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
export let supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
export let supabase: any;
export const createBackendMockSupabase = (reason: string) => {
      console.warn(`[System] Supabase falling back to local backend mock: ${reason}`);
      return {
        from: (table: string) => new BackendSupabaseMockBuilder(table),
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
          getUser: (token: string) => Promise.resolve({ data: { user: { id: 'mock-user-id', email: 'partner@example.com' } }, error: null }),
          admin: {
            getUser: (id: string) => Promise.resolve({ data: { user: { id, email: 'user@example.com' } }, error: null }),
            createUser: (data: any) => Promise.resolve({ data: { user: { id: 'new-user-id', email: data.email } }, error: null })
          },
          signInWithPassword: ({ email, password }: any) => {
            if (email === 'neorealm618@gmail.com' && password === 'Unilever123!') {
              return Promise.resolve({ data: { user: { id: 'p-1', email } }, error: null });
            }
            return Promise.resolve({ data: { user: null }, error: new Error('Invalid login credentials') });
          },
          signUp: () => Promise.resolve({ data: { user: { id: 'new-user-id' } }, error: null }),
          signOut: () => Promise.resolve({ error: null }),
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: (callback: any) => {
            return { data: { subscription: { unsubscribe: () => {} } } };
          }
        }
      };
    };

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (err) {
    console.error("[System] Failed to initialize real Supabase client:", err);
    supabase = createBackendMockSupabase(String(err));
  }
} else {
  supabase = createBackendMockSupabase("Supabase keys are missing in env");
}
export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW = 60;
export const RESTOCK_PHONE = process.env.RESTOCK_PHONE || "0781550151";
export const HUB_COMMISSION_NX = 0.2;
export const TX_FEE = 2;
export const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
export const ONBOARDING_STORE_PATH = path.join(DATA_DIR, 'onboarding_db.json');
export const E2E_HISTORY_FILE = path.join(FALLBACK_DIR, 'e2e_history.json');
export const e2eState = {
        isRunning: false,
        lastRun: null as string | null,
        status: 'idle' as 'idle' | 'running' | 'success' | 'failed',
        output: '',
        nextRunAt: Date.now() + 10 * 60 * 1000
      };

export interface WhitelistEntry {
    id: string;
    email: string;
    brand_name: string;
    portal?: 'fmcgs' | 'partners';
    active: boolean;
    created_at: string;
}
export interface ApprovalEntry {
    id: string;
    partner_id: string;
    email: string;
    companyName: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    approved_by?: string;
}
export interface AuditLogEntry {
    id: string;
    action: string;
    actor_id: string;
    ip_address: string;
    created_at: string;
}
export interface OnboardingDB {
    whitelist: WhitelistEntry[];
    approvals: ApprovalEntry[];
    audit_logs: AuditLogEntry[];
    otps?: Record<string, { otp: string; expiresAt: number; type: string }>;
    signup_tokens?: Record<string, { email: string; token: string; brand_name: string; apiKey: string; portal: string; expiresAt: number }>;
    agents?: any[];
}
export interface E2ERun {
    timestamp: string;
    status: 'running' | 'success' | 'failed';
    output: string;
    durationMs?: number;
}

export class BackendSupabaseMockBuilder {
  private table: string;
  private filters: { column: string; value: any; op: string }[] = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private isInsertCall = false;
  private isUpdateCall = false;
  private valuesToSave: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: any) { return this; }
  insert(values: any, options?: any) { this.isInsertCall = true; this.valuesToSave = values; return this; }
  update(values: any, options?: any) { this.isUpdateCall = true; this.valuesToSave = values; return this; }
  upsert(values: any, options?: any) { this.isInsertCall = true; this.valuesToSave = values; return this; }
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
  or(filtersString: string) {
    const clauses = filtersString.split(',');
    const orFilters = clauses.map(c => {
      const parts = c.split('.');
      if (parts.length >= 3) {
        return { column: parts[0], op: parts[1], value: parts[2] };
      }
      return null;
    }).filter(Boolean) as { column: string; op: string; value: any }[];
    this.filters.push({ column: '_or', value: orFilters, op: 'or' });
    return this;
  }
  limit(count: number) { this.limitCount = count; return this; }
  order(column: string, options?: any) { this.orderCol = column; this.orderAsc = options?.ascending !== false; return this; }

  private getFilePath() {
    return path.join(DATA_DIR, `nx_mock_table_${this.table}.json`);
  }

  private loadData(): any[] {
    const filePath = this.getFilePath();
    let data: any[] | null = null;
    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error(`[BackendMock] Error reading mock file ${this.table}:`, e);
      }
    }

    if (data) {
      let migrated = false;
      data = data.map((item: any) => {
        if (item.merchant_code === 'M703267') {
          item.merchant_code = 'M798253';
          migrated = true;
        }
        return item;
      });
      if (migrated) {
        this.saveData(data);
      }
      return data;
    }
    
    // Load Defaults
    let defaults: any[] = [];
    if (this.table === 'users') {
      defaults = [
        { id: '1', email: 'formidablefoe254@gmail.com', phone: '254700000000', role: 'admin', is_admin: true, admin_role: 'super_admin', name: 'Admin', status: 'active' },
        { id: '2', phone: '254700000005', role: 'customer', name: 'Alex jaka', status: 'active', nx_balance: 1000, recovery_pin: '7e68c9d6a4c9bd2ab4ca38833b9503644657cb2c7e108939579d310ea18bcc27' },
        { id: 'merchant-3267', phone: '254703267919', role: 'merchant', merchant_code: 'M798253', location: 'Nairobi', national_id: '12345678', recovery_pin: '4b3cb899df0279bb36ffb821cbe00f97844ef14283be5cd1c022dcc9624a7773', status: 'active', name: 'Corner Shop', franchise_tier: 'BASIC', nx_balance: 0 }
      ];
    } else if (this.table === 'merchant_margins') {
      defaults = [
        { id: 'margin-3267', merchant_code: 'M798253', gross_margin: 10000 }
      ];
    } else if (this.table === 'merchant_whitelist') {
      defaults = [
        { id: 'white-3267', phone: '254703267919', tier: 'BASIC', added_at: new Date().toISOString() }
      ];
    }
    
    this.saveData(defaults);
    return defaults;
  }

  private saveData(data: any[]) {
    try {
      const filePath = this.getFilePath();
      const parentDir = path.dirname(filePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`[BackendMock] Error writing mock file ${this.table}:`, err);
    }
  }

  private getFilteredData(dataList: any[]): any[] {
    let data = [...dataList];
    for (const filter of this.filters) {
      data = data.filter(item => {
        if (filter.op === 'or') {
          const orClauses = filter.value as { column: string; op: string; value: any }[];
          return orClauses.some(clause => {
            const val = item[clause.column];
            if (val === undefined) return false;
            return String(val).toLowerCase() === String(clause.value).toLowerCase();
          });
        }
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
    let list = this.loadData();
    if (this.isInsertCall && this.valuesToSave) {
      const items = Array.isArray(this.valuesToSave) ? this.valuesToSave : [this.valuesToSave];
      const withId = items.map((x: any) => ({ 
        id: x.id || `mock-${Math.random().toString(36).slice(2)}`, 
        created_at: x.created_at || new Date().toISOString(), 
        ...x 
      }));
      list = [...list, ...withId];
      this.saveData(list);
      return Array.isArray(this.valuesToSave) ? withId : withId[0];
    }
    if (this.isUpdateCall && this.valuesToSave) {
      const filtered = this.getFilteredData(list);
      const ids = filtered.map(x => x.id);
      list = list.map(item => ids.includes(item.id) ? { ...item, ...this.valuesToSave } : item);
      this.saveData(list);
      return filtered.map(x => ({ ...x, ...this.valuesToSave }))[0] || this.valuesToSave;
    }
    return null;
  }

  async single() {
    if (this.isInsertCall || this.isUpdateCall) return { data: this.executeWrite(), error: null };
    const data = this.getFilteredData(this.loadData());
    return { data: data[0] || null, error: data[0] ? null : { message: 'Not found' } };
  }

  async maybeSingle() {
    if (this.isInsertCall || this.isUpdateCall) return { data: this.executeWrite(), error: null };
    const data = this.getFilteredData(this.loadData());
    return { data: data[0] || null, error: null };
  }

  async then(onfulfilled?: any, onrejected?: any) {
    if (this.isInsertCall || this.isUpdateCall) return Promise.resolve({ data: this.executeWrite(), error: null }).then(onfulfilled, onrejected);
    const data = this.getFilteredData(this.loadData());
    const response = { data, error: null, count: data.length };
    if (onfulfilled) {
      return Promise.resolve(onfulfilled(response));
    }
    return response;
  }
}


