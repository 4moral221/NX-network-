/**
 * NX Network - High Performance Upstash Redis & Local Cache Manager
 * Bypasses database roundtrips for USSD session variables and merchant lookups.
 */

// Simple local fallback store with TTLS
interface CacheEntry {
  value: any;
  expiry: number; // timestamp in ms
}

const localCache = new Map<string, CacheEntry>();

// Access env variables in cross-compatible way
const getEnvVar = (key: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || process.env[`VITE_${key}`] || "";
    }
  } catch (e) {}
  return "";
};

const REST_URL = getEnvVar("UPSTASH_REDIS_REST_URL");
const REST_TOKEN = getEnvVar("UPSTASH_REDIS_REST_TOKEN");

// Ensure standard Redis URLs are used, while ignoring Vector search URLs which do not support standard Redis GET/SET commands.
const hasUpstash = !!(REST_URL && REST_TOKEN) && !REST_URL.includes("-search.upstash.io");

if (hasUpstash) {
  console.log(`[Cache Manager] Upstash Redis configured. Active URL: ${REST_URL.slice(0, 15)}...`);
} else if (REST_URL && REST_URL.includes("-search.upstash.io")) {
  console.log(`[Cache Manager] Upstash Vector URL detected instead of Redis. Falling back to high-speed Local In-Memory mode.`);
} else {
  console.log(`[Cache Manager] Upstash Redis not configured. Operating in high-speed Local In-Memory mode.`);
}

export const cache = {
  /**
   * Safe fetch from Upstash REST endpoint
   */
  async executeCommand(command: any[]): Promise<any> {
    if (!hasUpstash) return null;
    
    try {
      const response = await fetch(REST_URL.replace(/\/$/, ""), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${REST_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(command)
      });
      
      if (!response.ok) {
        throw new Error(`Upstash response error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.result;
    } catch (err: any) {
      console.warn(`[Cache Manager] Redis command failed: ${err.message}. Falling back silently.`);
      return null;
    }
  },

  /**
   * Retrieve a value from the cache (Upstash with Local fallback)
   */
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    
    // 1. Try Upstash if configured
    if (hasUpstash) {
      const redisVal = await this.executeCommand(["GET", key]);
      if (redisVal !== null && redisVal !== undefined) {
        try {
          const parsed = JSON.parse(redisVal);
          console.log(`[Cache] GET ${key} -> HIT (Upstash Redis, ${Date.now() - start}ms)`);
          return parsed as T;
        } catch (e) {
          // Plain String
          console.log(`[Cache] GET ${key} -> HIT (Upstash Raw String, ${Date.now() - start}ms)`);
          return redisVal as unknown as T;
        }
      }
    }

    // 2. Local Fallback Cache
    const localVal = localCache.get(key);
    if (localVal) {
      if (localVal.expiry > Date.now()) {
        console.log(`[Cache] GET ${key} -> HIT (Local Memory, 1ms)`);
        return localVal.value as T;
      } else {
        // Expired
        localCache.delete(key);
        console.log(`[Cache] GET ${key} -> EXPIRED (Local Memory)`);
      }
    }

    console.log(`[Cache] GET ${key} -> MISS (${Date.now() - start}ms)`);
    return null;
  },

  /**
   * Set a value in the cache with a specified TTL in seconds (default 10 minutes)
   */
  async set(key: string, value: any, ttlSeconds: number = 600): Promise<boolean> {
    const start = Date.now();
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);

    // 1. Save to Upstash if configured
    let savedToUpstash = false;
    if (hasUpstash) {
      const result = await this.executeCommand(["SET", key, serialized, "EX", ttlSeconds]);
      if (result) {
        savedToUpstash = true;
        console.log(`[Cache] SET ${key} -> OK (Upstash Redis, ${Date.now() - start}ms, TTL: ${ttlSeconds}s)`);
      }
    }

    // 2. Always back up/save to Local Cache to guarantee high speed and reliability
    localCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });

    if (!savedToUpstash) {
      console.log(`[Cache] SET ${key} -> OK (Local Memory only, TTL: ${ttlSeconds}s)`);
    }

    return true;
  },

  /**
   * Delete a key from the cache
   */
  async delete(key: string): Promise<boolean> {
    localCache.delete(key);
    
    if (hasUpstash) {
      await this.executeCommand(["DEL", key]);
      console.log(`[Cache] DEL ${key} -> OK (Upstash + Local)`);
    } else {
      console.log(`[Cache] DEL ${key} -> OK (Local Only)`);
    }
    
    return true;
  },

  /**
   * Clear the entire cache
   */
  async flushAll(): Promise<boolean> {
    localCache.clear();
    
    if (hasUpstash) {
      await this.executeCommand(["FLUSHALL"]);
      console.log(`[Cache] FLUSHALL -> OK (Upstash + Local)`);
    } else {
      console.log(`[Cache] FLUSHALL -> OK (Local Only)`);
    }
    
    return true;
  }
};
