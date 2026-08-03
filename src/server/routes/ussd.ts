import { supabase } from "../core";
import express from "express";
import { handleUssdRequest } from "../../services/ussd/index";

const router = express.Router();
router.post("/api/ussd", async (req, res) => {
    try {
      const { sessionId, phoneNumber, text, ussdMode, mode } = req.body;
      const isLive = ussdMode === 'edge' || mode === 'edge';

      if (isLive) {
        console.log(`[Proxy] Forwarding USSD call for: ${phoneNumber}`);
        const baseSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://balrpczytusvzzquzqob.supabase.co';
        const url = `${baseSupabaseUrl.replace(/\/$/, '')}/functions/v1/nx-ussd`;
        
        const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        if (serviceKey) {
          headers['Authorization'] = `Bearer ${serviceKey}`;
        }

        const params = new URLSearchParams();
        if (sessionId) params.set("sessionId", sessionId);
        if (phoneNumber) params.set("phoneNumber", phoneNumber);
        params.set("serviceCode", "*384*6180#");
        if (text !== undefined) params.set("text", text);

        console.log(`[Proxy] Forwarding to: ${url}`);
        const edgeRes = await fetch(url, {
          method: 'POST',
          headers,
          body: params.toString()
        });

        if (!edgeRes.ok) {
          const statusText = await edgeRes.text();
          throw new Error(`Edge function returned HTTP ${edgeRes.ok ? 200 : edgeRes.status}: ${statusText}`);
        }

        const responseText = await edgeRes.text();
        res.set('Content-Type', 'text/plain');
        return res.send(responseText);
      }

      // Local mode fallback
      const params = new URLSearchParams();
      if (sessionId) params.set("sessionId", sessionId);
      if (phoneNumber) params.set("phoneNumber", phoneNumber);
      if (text !== undefined) params.set("text", text);

      // handleUssdRequest expects a Request object, but we can call it with the params directly if we refactor or just mock it carefully
      const mockReq = new Request(req.protocol + '://' + req.get('host') + "/api/ussd", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });

      const proxyRes = await handleUssdRequest(mockReq);
      const responseText = await proxyRes.text();
      res.set('Content-Type', 'text/plain');
      res.send(responseText);
    } catch (err: any) {
      console.error("USSD Error:", err);
      res.status(500).send("END Connection to network failed:\n" + err.message);
    }
  });

export default router;
