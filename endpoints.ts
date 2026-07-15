app.post('/api/fmcg/revoke-key', requirePartner, async (req, res) => {
  try {
    const { key_id } = req.body;
    if (!key_id) {
      return res.status(400).json({ success: false, error: 'Key ID required' });
    }

    let dbError = null;
    try {
      const deleteResult = await supabase.from('api_keys').delete().eq('id', key_id);
      if (deleteResult && deleteResult.error) {
        dbError = deleteResult.error;
      }
    } catch (e: any) {
      dbError = e;
      console.warn("DB api_keys delete timed out or failed, resorting to local fallback:", e.message || e);
    }

    try {
      const localKeys = getLocalFallbackFile<any>('api_keys.json');
      const filtered = localKeys.filter((k: any) => k.id !== key_id);
      saveLocalFallbackFile('api_keys.json', filtered);
    } catch (e) {
      console.error("Local api_keys.json revoke error:", e);
    }

    res.json({ success: true, message: 'Key revoked successfully' });
  } catch (err: any) {
    console.error("Revoke API key error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/fmcg/api-keys', requirePartner, async (req, res) => {
  try {
    const { brand_name } = req.query;
    if (!brand_name) return res.status(400).json({ success: false, error: 'Brand name required' });

    const cleanBrand = String(brand_name).trim().toLowerCase();
    let pRec: any = null;

    try {
      const partnersResult = await supabase.from('partners').select('id, company_name');
      const partnersList = partnersResult?.data || null;
      if (partnersList && partnersList.length > 0) {
        pRec = partnersList.find((p: any) => p.company_name?.trim().toLowerCase() === cleanBrand) ||
               partnersList.find((p: any) => p.company_name?.toLowerCase().includes(cleanBrand)) ||
               partnersList.find((p: any) => cleanBrand.includes(p.company_name?.toLowerCase() || ''));
      }
    } catch (e: any) {
      console.warn("[api-keys] Supabase partners fetch timed out or failed:", e.message || e);
    }

    if (!pRec) {
      const localPartners = getLocalFallbackFile<any>('partners.json');
      pRec = localPartners.find((p: any) => p.company_name?.trim().toLowerCase() === cleanBrand) ||
             localPartners.find((p: any) => p.company_name?.toLowerCase().includes(cleanBrand)) ||
             localPartners.find((p: any) => cleanBrand.includes(p.company_name?.toLowerCase() || ''));
    }

    if (!pRec) {
      // Return empty array instead of failing, allowing user to generate key which will create a partner profile
      return res.json({ success: true, keys: [] });
    }

    let keys: any[] = [];
    try {
      const keysResult = await supabase.from('api_keys').select('*').eq('partner_id', pRec.id).order('created_at', { ascending: false });
      const error = keysResult?.error;
      if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation "api_keys" does not exist'))) {
        throw new Error('FALLBACK');
      }
      if (error) throw error;
      keys = keysResult?.data || [];
    } catch (dbErr: any) {
      console.warn("DB api_keys fetch failed or returned error, falling back:", dbErr.message || dbErr);
    }

    // Always merge with local fallback keys to ensure complete coverage (e.g. if partner creation failed/fell back)
    try {
      const localKeys = getLocalFallbackFile<any>('api_keys.json');
      const filteredLocal = localKeys.filter((k: any) => k.partner_id === pRec.id);
      for (const lk of filteredLocal) {
        if (!keys.some(k => k.id === lk.id)) {
          keys.push(lk);
        }
      }
      keys.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (localErr: any) {
      console.error("Local api_keys fetch error:", localErr.message);
    }

    res.json({ success: true, keys: keys || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/fmcg/generate-key', requirePartner, keyGenLimiter, async (req, res) => {
  try {
    const { brand_name, brand_id, company_name } = req.body;
    let finalBrandName = brand_name || company_name;

    // Resolve brand name from brand_id if it's missing but ID is available
    if (!finalBrandName && brand_id) {
       console.log(`[generate-key] Brand name is missing. Trying to resolve from brand_id: ${brand_id}`);
       try {
         const { data: pCheck } = await supabase.from('partners').select('company_name').eq('id', brand_id).maybeSingle();
         if (pCheck?.company_name) finalBrandName = pCheck.company_name;
       } catch (e) {}
       
       if (!finalBrandName) {
         try {
           const { data: pCheck } = await supabase.from('fmcg_partners').select('name').eq('id', brand_id).maybeSingle();
           if (pCheck?.name) finalBrandName = pCheck.name;
         } catch (e) {}
       }
       
       if (!finalBrandName) {
          const localPartners = getLocalFallbackFile<any>('partners.json');
          const lp = localPartners.find((p: any) => p.id === brand_id);
          if (lp?.company_name) finalBrandName = lp.company_name;
          else if (lp?.name) finalBrandName = lp.name;
       }
    }

    if (!finalBrandName) {
       return res.status(400).json({ success: false, error: 'Brand name matches could not be resolved from inputs.' });
    }
