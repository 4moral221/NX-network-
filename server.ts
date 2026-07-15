import "dotenv/config";
import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { handleUssdRequest } from "./src/services/ussd/index";
import { matchProduct } from "./src/services/skuMatcher";
import { cache } from "./src/lib/cache";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { apiLimiter, FALLBACK_DIR } from "./src/server/core";
import adminRouter from "./src/server/routes/admin";
import authRouter from "./src/server/routes/auth";
import familyAccountsRouter from "./src/server/routes/family_accounts";
import fmcgRouter from "./src/server/routes/fmcg";
import geminiRouter from "./src/server/routes/gemini";
import logisticsRouter from "./src/server/routes/logistics";
import miscRouter from "./src/server/routes/misc";
import onboardingRouter from "./src/server/routes/onboarding";
import redisRouter from "./src/server/routes/redis";
import staffRouter from "./src/server/routes/staff";
import ussdRouter from "./src/server/routes/ussd";

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use('/api/', apiLimiter);

// Middleware for parsing form data (used by Africa's Talking)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(adminRouter);
app.use(authRouter);
app.use(familyAccountsRouter);
app.use(fmcgRouter);
app.use(geminiRouter);
app.use(logisticsRouter);
app.use(miscRouter);
app.use(onboardingRouter);
app.use(redisRouter);
app.use(staffRouter);
app.use(ussdRouter);
// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Global Error Handler for API routes
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API Error]', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      path: req.path
    });
  });

// Vite middleware setup (using async IIFE to avoid top-level await)
(async () => {
  if (process.env.VERCEL) {
    console.log("[System] Running in Vercel Serverless environment. Bypassing Vite and Static server middleware.");
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[System] Initializing Vite middleware (SPA mode)...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[System] Initializing Production static server...");
    // Production Mode: Static Files + Catch-all for SPA
    let distPath = path.join(process.cwd(), 'dist');
    // If we're building for a specific target like 'admin', the files might be in dist/admin
    const target = process.env.VITE_APP_TARGET;
    if (target && fs.existsSync(path.join(distPath, target))) {
      distPath = path.join(distPath, target);
      console.log(`[Production] Target detected: ${target}. Using dist path: ${distPath}`);
    }
    const indexPath = path.join(distPath, 'index.html');
    
    // Serve static files (assets, etc.)
    app.use(express.static(distPath));
    
    // Greedy catch-all for React Router paths
    app.get('*', (req, res) => {
      // Don't catch API routes, source files, or file-like paths that fell through
      if (
        req.path.startsWith('/api') || 
        req.path.startsWith('/ussd') ||
        req.path.includes('.')
      ) {
        return res.status(404).send("Not found");
      }
      
      console.log(`[Production] Serving index.html for route: ${req.path}`);
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`[Production] CRITICAL: index.html not found at ${indexPath}`);
        res.status(500).send("Primary entry point missing. Please rebuild.");
      }
    });

  }

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
})();

export default app;

