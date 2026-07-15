import { requireAdmin } from "../core";
import express from "express";
import { cache } from "../../lib/cache";

const router = express.Router();
router.get("/api/redis/test", requireAdmin, async (req, res) => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.VITE_UPSTASH_REDIS_REST_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.VITE_UPSTASH_REDIS_REST_TOKEN || "";
  const configured = !!(url && token);

  const start = Date.now();
  let mode = configured ? "Upstash Redis" : "Local In-Memory";
  let latencyMs = 0;

  try {
    if (!configured) {
      // Local Memory check
      await cache.set("nx_redis_test_ping", "fallback-ok", 10);
      const val = await cache.get("nx_redis_test_ping");
      latencyMs = Date.now() - start;
      
      res.json({
        configured: false,
        mode,
        status: val === "fallback-ok" ? "connected" : "error",
        latencyMs,
        details: "Operating in high-speed Local In-Memory fallback mode. Set standard env parameters (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) to connect to Upstash Redis cloud cluster."
      });
    } else {
      // Ping redis
      const pingRes = await cache.executeCommand(["PING"]);
      
      // Write / Read / Del cycle
      const tempKey = `nx_redis_test:${Math.random().toString(36).substring(7)}`;
      const tempVal = `test-payload-${Date.now()}`;
      
      const setStart = Date.now();
      await cache.set(tempKey, tempVal, 60);
      const setTime = Date.now() - setStart;

      const getStart = Date.now();
      const readVal = await cache.get(tempKey);
      const getTime = Date.now() - getStart;

      const delStart = Date.now();
      await cache.delete(tempKey);
      const delTime = Date.now() - delStart;

      latencyMs = Date.now() - start;

      res.json({
        configured: true,
        mode,
        status: readVal === tempVal ? "connected" : "degraded",
        ping: pingRes || "PONG",
        latencyMs,
        roundtrip: {
          ping: pingRes || "PONG",
          setMs: setTime,
          getMs: getTime,
          delMs: delTime
        },
        url: url.slice(0, Math.min(25, url.length)) + "...",
        message: readVal === tempVal ? "Redis cache cluster is fully online and responsive." : "Redis ping successful, but write/read checks failed."
      });
    }
  } catch (err: any) {
    res.status(500).json({
      configured,
      mode,
      status: "disconnected",
      error: err.message,
      message: `Failed to connect or negotiate cache commands: ${err.message}`
    });
  }
});
router.post("/api/redis/set", requireAdmin, async (req, res) => {
  const { key, value, ttl } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }
  try {
    const ttlSeconds = parseInt(ttl) || 300;
    const success = await cache.set(key, value || "", ttlSeconds);
    res.json({ success, message: `Successfully cached key '${key}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/api/redis/get", requireAdmin, async (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }
  try {
    const value = await cache.get<any>(key);
    res.json({ key, value, exists: value !== null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/api/redis/flush", requireAdmin, async (req, res) => {
  try {
    const success = await cache.flushAll();
    res.json({ success, message: "Cleared all values from local & cloud redis caches successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
