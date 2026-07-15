import { requireAuth } from "../core";
import express from "express";
import * as fs from "fs";
import * as path from "path";
import { matchProduct } from "../../services/skuMatcher";

const router = express.Router();
router.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok"
  });
});
router.post('/api/match', requireAuth, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: "Query is required" });

      const result = await matchProduct(query);
      res.json(result);
    } catch (err: any) {
      console.error("Match Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/predict_restock', requireAuth, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      const lines = text.split('\n').filter((l: string) => l.trim());
      const predictions = await Promise.all(lines.map(async (line: string) => {
        const [query, qtyStr] = line.split('*');
        const qty = parseInt(qtyStr?.trim() || '1', 10);
        const matchResult = await matchProduct(query.trim());
        const bestMatch = (matchResult as any).bestMatch;

        return {
          sku: bestMatch?.sku || 'UNCERTAIN',
          name: bestMatch?.name || query.trim(),
          quantity: qty,
          score: bestMatch?.score || 0,
          fuzzy: bestMatch ? bestMatch.score < 0.9 : true,
          raw: line
        };
      }));

      res.json({ success: true, items: predictions });
    } catch (err: any) {
      console.error("Prediction Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
export default router;
