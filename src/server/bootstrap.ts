import express from "express";
import fs from "fs";
import path from "path";

/**
 * Bootstraps the Express application by configuring Vite middleware in development
 * or serving production build static assets and managing port bindings.
 */
export async function bootstrap(app: express.Express) {
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
}
