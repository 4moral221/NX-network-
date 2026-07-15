import { supabase, requireAuth } from "../core";
import express from "express";

const router = express.Router();
router.post("/api/staff/location", requireAuth, async (req, res) => {
    try {
      const { lat, lng } = req.body;
      const phone = (req as any).user?.phone; // Restrict to authenticated user
      if (!phone || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: "Missing phone, lat, or lng" });
      }

      const { error } = await supabase
        .from('users')
        .update({ 
          latitude: lat, 
          longitude: lng, 
          updated_at: new Date().toISOString() 
        })
        .eq('phone', phone)
        .eq('is_admin', true);

      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      console.error("Staff location update error:", err);
      res.status(500).json({ error: err.message });
    }
  });

export default router;
