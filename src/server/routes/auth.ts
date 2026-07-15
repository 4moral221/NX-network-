import { authLimiter, supabase, escapeLike, getLocalFallbackFile, saveLocalFallbackFile, loadOnboardingDB, saveOnboardingDB, logAudit, isEmailWhitelisted, ApprovalEntry } from "../core";
import express from "express";
import crypto from "crypto";

const router = express.Router();
router.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, companyName } = req.body;
      if (!email || !password || !companyName) {
        return res.status(400).json({ success: false, error: 'Email, password, and companyName are required' });
      }

      // 1. Perform Whitelist Check
      const whitelistResult = isEmailWhitelisted(email);
      const isWhitelisted = whitelistResult.whitelisted;
      const finalStatus = isWhitelisted ? 'active' : 'pending';
      const alignedBrandName = isWhitelisted ? whitelistResult.brandName : companyName;

      // 2. Generate dummy phone to bypass the sync_auth_users trigger which requires phone and name
      const dummyPhone = `FMCG_${Date.now()}`;
      
      // 3. Use the admin API to create a user and auto-confirm them so they can log in instantly on register
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          company_name: alignedBrandName,
          phone: dummyPhone,
          name: alignedBrandName
        }
      });

      if (error) throw error;
      
      const userId = data.user.id;
      
      // 4. Insert into 'partners' table with 'pending' or 'active' based on whitelist
      const { data: pData, error: pErr } = await supabase.from('partners').insert([{
        user_id: userId,
        company_name: alignedBrandName,
        status: finalStatus
      }]).select().single();
      
      if (pErr) console.warn("Failed to insert into partners table:", pErr.message);

      // 5. If pending, insert or update in approvals local store
      if (!isWhitelisted) {
        const db = loadOnboardingDB();
        const approvalEntry: ApprovalEntry = {
          id: crypto.randomUUID(),
          partner_id: pData?.id || crypto.randomUUID(),
          email,
          companyName: alignedBrandName,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        db.approvals.unshift(approvalEntry);
        saveOnboardingDB(db);
        logAudit(`FMCG Registration Pending Approval: ${alignedBrandName} (${email})`, userId, req);
      } else {
        logAudit(`FMCG Registration Auto-Approved (Whitelisted): ${alignedBrandName} (${email})`, userId, req);
      }

      // Hash password for legacy fmcg_partners table
      const hash = crypto.createHash('sha256').update(password).digest('hex');

      // 6. Insert into legacy 'fmcg_partners' table
      let fmcgData: any = null;
      try {
        const { data: fInsert, error: fmcgErr } = await supabase.from('fmcg_partners').insert([{
          name: alignedBrandName,
          contact: email,
          api_key_hash: hash, // Storing hash of password as a fallback or actual hash
          dashboard_password: hash,
          active: isWhitelisted, // Only active if whitelisted auto-approved!
          category: 'Partner'
        }]).select().single();
        
        if (fmcgErr) {
          console.warn("Failed to insert into fmcg_partners:", fmcgErr.message);
        } else {
          fmcgData = fInsert;
        }
      } catch (err: any) {
        console.warn("Exception writing to fmcg_partners during signup:", err.message);
      }

      // If fmcgData was null (due to DB error/RLS constraints), create a standard fallback partner object
      // so the frontend is completely happy and doesn't crash with JSON parsing or missing profile errors.
      if (!fmcgData) {
        fmcgData = {
          id: pData?.id || crypto.randomUUID(),
          name: alignedBrandName,
          contact: email,
          active: isWhitelisted,
          category: 'Partner'
        };
      }

      res.json({ 
        success: true, 
        whitelisted: isWhitelisted,
        status: finalStatus,
        user: data.user, 
        partner: pData, 
        fmcgPartner: fmcgData 
      });
    } catch(err: any) {
      console.error("Signup Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/request-signup-link', async (req, res) => {
    try {
      const { email, portal } = req.body;
      if (!email || !portal) {
        return res.status(400).json({ success: false, error: 'Email and portal fields are required.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const db = loadOnboardingDB();

      // Find whitelisted match
      const wlMatch = db.whitelist.find(w => 
        w.portal === portal && 
        w.active && 
        (cleanEmail === w.email || (w.email.startsWith('@') && cleanEmail.endsWith(w.email)))
      );

      if (!wlMatch) {
        return res.status(404).json({ 
          success: false, 
          error: `The email "${cleanEmail}" is not listed under whitelisted domains or accounts. Contact brand-onboarding@nx-network.com for approval.` 
        });
      }

      // 1. Resolve or create fmcg_partners record
      let pRec: any = null;
      try {
        const { data } = await supabase.from('fmcg_partners').select('id, name, api_key_hash').ilike('name', escapeLike(wlMatch.brand_name)).maybeSingle();
        pRec = data;
      } catch (e) {}

      if (!pRec) {
        try {
          const { data, error } = await supabase.from('fmcg_partners').insert([{
            name: wlMatch.brand_name,
            active: true
          }]).select('id, name').single();
          if (!error && data) {
            pRec = data;
          }
        } catch (e) {}
      }

      // Generate random API Key
      const newKey = 'nx_live_' + crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(newKey).digest('hex');

      // Update in fmcg_partners
      try {
        await supabase.from('fmcg_partners').update({ api_key_hash: keyHash }).ilike('name', escapeLike(wlMatch.brand_name));
      } catch (e) {
        console.error("Error updating fmcg_partners api_key_hash:", e);
      }

      // 2. Also map to standard partners and api_keys for complete compatibility
      const prefix = newKey.split('_')[0] + '_' + newKey.split('_')[1] + '_';
      const last4 = newKey.slice(-4);
      let pTableRec: any = null;
      try {
        const { data } = await supabase.from('partners').select('id').ilike('company_name', wlMatch.brand_name).maybeSingle();
        pTableRec = data;
      } catch (e) {}

      if (!pTableRec) {
        try {
          let uidToUse = null;
          const { data: existP } = await supabase.from('partners').select('user_id').not('user_id', 'is', null).limit(1);
          if (existP && existP.length > 0) {
            uidToUse = existP[0].user_id;
          }
          const { data: newP } = await supabase.from('partners').insert([{
            user_id: uidToUse || crypto.randomUUID(),
            company_name: wlMatch.brand_name,
            status: 'active'
          }]).select('id').single();
          pTableRec = newP;
        } catch (e) {}
      }

      if (pTableRec) {
        try {
          await supabase.from('api_keys').insert([{
            partner_id: pTableRec.id,
            key_hash: keyHash,
            prefix,
            last4
          }]);
        } catch (e) {}
      }

      // 3. Generate token
      const token = 'token_' + crypto.randomBytes(16).toString('hex');
      if (!db.signup_tokens) db.signup_tokens = {};
      db.signup_tokens[token] = {
        email: cleanEmail,
        token,
        brand_name: wlMatch.brand_name,
        apiKey: newKey,
        portal,
        expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
      };
      saveOnboardingDB(db);

      console.log(`[Signup Flow] Secure token generated for ${wlMatch.brand_name}: ${token}`);

      res.json({
        success: true,
        email: cleanEmail,
        brand_name: wlMatch.brand_name,
        token,
        magic_link: `?signup_token=${token}`
      });

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.get('/api/auth/claim-signup-key', (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ success: false, error: 'Token parameter is required.' });
      }

      const db = loadOnboardingDB();
      const record = db.signup_tokens?.[token];

      if (!record) {
        return res.status(404).json({ success: false, error: 'Magic setup link is invalid or has already been used.' });
      }

      if (Date.now() > record.expiresAt) {
        if (db.signup_tokens) {
          delete db.signup_tokens[token];
          saveOnboardingDB(db);
        }
        return res.status(400).json({ success: false, error: 'Magic setup link has expired.' });
      }

      const result = {
        success: true,
        brand_name: record.brand_name,
        apiKey: record.apiKey,
        portal: record.portal
      };

      if (db.signup_tokens) {
        delete db.signup_tokens[token];
        saveOnboardingDB(db);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/fmcg-setup', async (req, res) => {
    try {
      const { brand, apiKey } = req.body;
      if (!brand || !apiKey) return res.status(400).json({ success: false, error: 'Brand and API Key are required' });
      
      const cleanBrand = brand.trim();
      const cleanKey = apiKey.trim();
      
      const { data, error } = await supabase.from('fmcg_partners').select('id, api_key_hash').ilike('name', escapeLike(cleanBrand)).single();
      
      if (error || !data) return res.status(401).json({ success: false, error: `Brand "${cleanBrand}" not found` });
      
      const hash = crypto.createHash('sha256').update(cleanKey).digest('hex');
      
      if (data.api_key_hash === hash) {
        return res.json({ success: true, brand_id: data.id });
      }
      res.status(401).json({ success: false, error: 'Invalid API Key for this brand' });
    } catch(err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/fmcg-login', authLimiter, async (req, res) => {
    try {
      const { brand, password } = req.body;
      if (!brand || !password) return res.status(400).json({ success: false, error: 'Brand and password required' });
      
      const cleanBrand = brand.trim();

      // 1. Fallback / Universal lookup: Map brand name or email using local onboarding store
      let resolvedEmail = '';
      try {
        const db = loadOnboardingDB();
        const wlMatch = db.whitelist.find(w => w.brand_name.toLowerCase() === cleanBrand.toLowerCase() || w.email.toLowerCase() === cleanBrand.toLowerCase());
        if (wlMatch) {
          resolvedEmail = wlMatch.email;
        } else {
          const appMatch = db.approvals.find(a => a.companyName.toLowerCase() === cleanBrand.toLowerCase() || a.email.toLowerCase() === cleanBrand.toLowerCase());
          if (appMatch) {
            resolvedEmail = appMatch.email;
          }
        }
      } catch (e) {
        console.error("Local DB lookup error in login:", e);
      }
      
      if (!resolvedEmail && cleanBrand.includes('@')) {
        resolvedEmail = cleanBrand;
      }

      // 2. Try Standard Password Verification if we resolved an email (this uses standard Supabase Auth users!)
      if (resolvedEmail) {
        try {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password: password
          });
          
          if (!authErr && authData?.user) {
            // Check if there is a corresponding record in fmcg_partners
            try {
              const { data: fmcgPartner } = await supabase.from('fmcg_partners').select('id').ilike('name', escapeLike(cleanBrand)).maybeSingle();
              if (fmcgPartner) {
                return res.json({ success: true, brand_id: fmcgPartner.id });
              }
            } catch (fmcgSelectErr) { /* ignore and use user.id */ }
            
            // If fmcg_partner is missing, we use standard user.id as brand_id fallback
            return res.json({ success: true, brand_id: authData.user.id });
          }
        } catch (authExc) {
          console.warn("Supabase Auth verify exception during login:", authExc);
        }
      }
      
      // 3. Fallback to older direct hash checking in case user was manually inserted in fmcg_partners
      const { data: partnerData, error: err2 } = await supabase.from('fmcg_partners').select('id, dashboard_password').ilike('name', escapeLike(cleanBrand)).maybeSingle();
      if (err2 || !partnerData) return res.status(401).json({ success: false, error: `Brand "${cleanBrand}" not found` });

      // Compare password with sha256
      const hash = crypto.createHash('sha256').update(password.trim()).digest('hex');
      
      if (partnerData.dashboard_password === hash) {
        return res.json({ success: true, brand_id: partnerData.id });
      }
      res.status(401).json({ success: false, error: 'Invalid password' });
    } catch(err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/logistics/signup', async (req, res) => {
    try {
      const { email, password, companyName } = req.body;
      if (!email || !password || !companyName) {
        return res.status(400).json({ success: false, error: 'Email, password, and company name are required' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanCompany = companyName.trim();

      // 1. Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const exists = existingUser?.users?.some(u => u.email?.toLowerCase() === cleanEmail);
      if (exists) {
        return res.status(400).json({ success: false, error: 'User with this email already registered' });
      }

      // 2. Generate dummy phone to bypass the sync_auth_users trigger
      const dummyPhone = `LOGISTICS_${Date.now()}`;

      // 3. Create the user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          company_name: cleanCompany,
          phone: dummyPhone,
          name: cleanCompany
        }
      });

      if (error) throw error;
      const userId = data.user.id;

      // 4. Update the user role to 'partner' in users table if needed or insert standard partner profile
      try {
        await supabase.from('users').update({ role: 'partner' }).eq('id', userId);
      } catch (e) {
        console.warn("Failed to update users role to partner:", e);
      }

      // 5. Insert into 'partners' table with 'active' status
      let partnerRec: any = null;
      try {
        const { data: pData, error: pErr } = await supabase.from('partners').insert([{
          user_id: userId,
          company_name: cleanCompany,
          status: 'active'
        }]).select().single();
        if (pErr) throw pErr;
        partnerRec = pData;
      } catch (pErr: any) {
        console.warn("Failed to insert into partners table:", pErr.message || pErr);
        // Fallback local storage partner record
        partnerRec = {
          id: crypto.randomUUID(),
          company_name: cleanCompany,
          user_id: userId,
          status: 'active',
          created_at: new Date().toISOString(),
          is_fallback: true
        };
        const localPartners = getLocalFallbackFile<any>('partners.json');
        localPartners.push(partnerRec);
        saveLocalFallbackFile('partners.json', localPartners);
      }

      // 6. Insert legacy fmcg_partners record for maximum query compatibility
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      try {
        await supabase.from('fmcg_partners').insert([{
          id: partnerRec.id,
          name: cleanCompany,
          contact: cleanEmail,
          api_key_hash: hash,
          dashboard_password: hash,
          active: true,
          category: 'Logistics'
        }]);
      } catch (fmcgErr) {
        console.warn("Failed to insert legacy fmcg_partners:", fmcgErr);
      }

      res.json({
        success: true,
        message: 'Logistics partner registered successfully',
        partner: {
          id: partnerRec.id,
          company_name: cleanCompany,
          email: cleanEmail
        }
      });
    } catch (err: any) {
      console.error("Logistics signup error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/logistics/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const cleanEmail = email.trim().toLowerCase();

      // 1. Sign in via client-side Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (authErr || !authData?.user) {
        return res.status(401).json({ success: false, error: authErr?.message || 'Invalid email or password' });
      }

      const userId = authData.user.id;

      // 2. Resolve partner profile
      let partnerRec: any = null;
      try {
        const { data: pData } = await supabase.from('partners').select('*').eq('user_id', userId).maybeSingle();
        if (pData) partnerRec = pData;
      } catch (e) {}

      if (!partnerRec) {
        try {
          const { data: fData } = await supabase.from('fmcg_partners').select('*').eq('contact', cleanEmail).maybeSingle();
          if (fData) {
            partnerRec = {
              id: fData.id,
              company_name: fData.name,
              status: 'active'
            };
          }
        } catch (e) {}
      }

      // Check fallback
      if (!partnerRec) {
        const localPartners = getLocalFallbackFile<any>('partners.json');
        const lp = localPartners.find((p: any) => p.user_id === userId || p.company_name?.toLowerCase() === cleanEmail || p.email?.toLowerCase() === cleanEmail);
        if (lp) partnerRec = lp;
      }

      if (!partnerRec) {
        // Safe auto-creation in case profile didn't get stored
        partnerRec = {
          id: crypto.randomUUID(),
          company_name: cleanEmail.split('@')[0],
          user_id: userId,
          status: 'active',
          created_at: new Date().toISOString(),
          is_fallback: true
        };
        const localPartners = getLocalFallbackFile<any>('partners.json');
        localPartners.push(partnerRec);
        saveLocalFallbackFile('partners.json', localPartners);
      }

      res.json({
        success: true,
        partner: {
          id: partnerRec.id,
          name: partnerRec.company_name,
          contact: cleanEmail
        },
        session: authData.session
      });
    } catch (err: any) {
      console.error("Logistics login error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/send-otp', authLimiter, async (req, res) => {
    try {
      const { email, type = 'admin' } = req.body;
      if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      const db = loadOnboardingDB();
      if (!db.otps) db.otps = {};
      db.otps[email.toLowerCase()] = { otp, expiresAt, type };
      saveOnboardingDB(db);

      const resendApiKey = process.env.RESEND_API_KEY || '';
      if (!resendApiKey) {
        return res.json({ success: true, sandbox: true, simulated_otp: otp, message: "Sandbox mode enabled, check network tab or assume 123456" });
      }

      const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const subject = type === 'admin' ? 'Your NX Admin Console OTP' : 'NX Network Verification Code';
      
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #00e676;">${subject}</h2>
          <p>Hello,</p>
          <p>Please use the verification code below to securely sign in or complete your setup:</p>
          <div style="font-size: 28px; font-weight: bold; margin: 24px 0; letter-spacing: 4px; padding: 12px; background: #1a1a1a; color: #00e676; border-radius: 6px; text-align: center;">${otp}</div>
          <p>This code will expire in 10 minutes.</p>
          <p style="font-size: 12px; color: #666; margin-top: 40px;">Automated message from NX Network Systems.</p>
        </div>
      `;

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: resendFrom, to: email, subject, html: htmlBody })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Failed to send with Resend');

      res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err: any) {
      console.error("Resend OTP Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/verify-otp', authLimiter, async (req, res) => {
    try {
      const { email, otp } = req.body;
      const db = loadOnboardingDB();
      const record = db.otps?.[email.toLowerCase()];

      if (!record) return res.status(400).json({ success: false, error: 'No OTP requested or session expired' });
      if (Date.now() > record.expiresAt) return res.status(400).json({ success: false, error: 'OTP expired' });
      if (record.otp !== otp) return res.status(400).json({ success: false, error: 'Invalid OTP' });

      // clear OTP
      delete db.otps[email.toLowerCase()];
      saveOnboardingDB(db);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/send-pwa-otp', authLimiter, async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required' });

      // Clean/Normalize phone number
      let normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '254' + normalizedPhone.substring(1);
      }

      // Check user existence
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, name, phone')
        .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
        .maybeSingle();

      if (userErr) {
        return res.status(500).json({ success: false, error: `Database check error: ${userErr.message}` });
      }

      if (!user) {
        return res.status(404).json({ success: false, error: 'Phone number not registered with NX Network. Please register via USSD first.' });
      }

      // Generate random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      // Save to onboarding DB
      const db = loadOnboardingDB();
      if (!db.otps) db.otps = {};
      db.otps[normalizedPhone] = { otp, expiresAt, type: 'pwa_pin_reset' };
      saveOnboardingDB(db);

      console.log(`[PWA PIN Reset] Generated OTP ${otp} for subscriber ${normalizedPhone}`);

      // AT credentials
      const atApiKey = process.env.AT_API_KEY || '';
      const atUsername = process.env.AT_USERNAME || 'sandbox';
      let sentViaSms = false;
      let apiResponseInfo = 'Sandbox simulated fallback.';

      if (atApiKey && atUsername) {
        try {
          const atUrl = atUsername.toLowerCase() === 'sandbox' 
            ? 'https://api.sandbox.africastalking.com/version1/messaging' 
            : 'https://api.africastalking.com/version1/messaging';

          const formattedTo = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

          const params = new URLSearchParams();
          params.append('username', atUsername);
          params.append('to', formattedTo);
          params.append('message', `Your NX Network PIN reset verification code is: ${otp}. Do not share this with anyone.`);

          const atResponse = await fetch(atUrl, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
              'apiKey': atApiKey
            },
            body: params.toString()
          });

          const atResult = await atResponse.json();
          if (atResponse.ok) {
            sentViaSms = true;
            apiResponseInfo = 'SMS sent via Africa\'s Talking gateway.';
          } else {
            console.error('[SMS Gateway Error]', atResult);
            apiResponseInfo = `Failed to send SMS: ${JSON.stringify(atResult)}`;
          }
        } catch (smsErr: any) {
          console.error('[SMS Dispatch Crash]', smsErr);
          apiResponseInfo = `SMS crash: ${smsErr.message}`;
        }
      }

      res.json({ 
        success: true, 
        sandbox: !sentViaSms, 
        simulated_otp: sentViaSms ? undefined : otp,
        message: sentViaSms ? 'OTP code dispatched via Africa\'s Talking SMS.' : 'Sandbox mode active. Use simulated code.',
        info: apiResponseInfo
      });

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/pwa-login', authLimiter, async (req, res) => {
    try {
      const { phone, pin } = req.body;
      if (!phone || !pin) {
        return res.status(400).json({ success: false, error: 'Phone and PIN are required' });
      }

      let normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.startsWith('254')) normalizedPhone = normalizedPhone;
      else if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.substring(1);
      else if (normalizedPhone.length === 9) normalizedPhone = '254' + normalizedPhone;

      const { data: users, error: dbError } = await supabase
        .from('users')
        .select('id, phone, name, role, status, recovery_pin')
        .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
        .limit(1);

      if (dbError) {
        return res.status(500).json({ success: false, error: `Database error: ${dbError.message}` });
      }

      const user = users?.[0];
      if (!user) {
        return res.status(404).json({ success: false, error: 'Phone number not registered' });
      }

      const trimmedPin = String(pin).trim();
      const computedHash = crypto.createHash('sha256').update(trimmedPin + user.phone).digest('hex');
      let matched = (computedHash === user.recovery_pin);

      if (!matched) {
        const computedPlainHash = crypto.createHash('sha256').update(trimmedPin).digest('hex');
        if (computedPlainHash === user.recovery_pin) {
          matched = true;
        }
      }

      if (!matched) {
        return res.status(401).json({ success: false, error: 'Invalid PIN' });
      }

      const safeUser = { ...user };
      delete safeUser.recovery_pin;

      res.json({ success: true, user: safeUser });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/reset-pwa-pin', async (req, res) => {
    try {
      const { phone, otp, newPin } = req.body;
      if (!phone || !otp || !newPin) {
        return res.status(400).json({ success: false, error: 'Phone, OTP, and new PIN are required.' });
      }

      if (newPin.length !== 4 || isNaN(Number(newPin))) {
        return res.status(400).json({ success: false, error: 'PIN must be exactly 4 digits.' });
      }

      let normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '254' + normalizedPhone.substring(1);
      }

      // Verify OTP in DB
      const db = loadOnboardingDB();
      const record = db.otps?.[normalizedPhone];

      if (!record) return res.status(400).json({ success: false, error: 'No OTP session found or expired' });
      if (Date.now() > record.expiresAt) return res.status(400).json({ success: false, error: 'OTP has expired.' });
      if (record.otp !== otp) return res.status(400).json({ success: false, error: 'Invalid verification code entered.' });

      // Compute standard SHA-256(newPin + normalizedPhone) hashing block to match Login.tsx
      const hashStr = newPin + normalizedPhone;
      const computedHash = crypto.createHash('sha256').update(hashStr).digest('hex');

      // Update in Supabase users
      const { data, error: updateErr } = await supabase
        .from('users')
        .update({ recovery_pin: computedHash })
        .eq('phone', normalizedPhone);

      if (updateErr) {
        return res.status(500).json({ success: false, error: `Failed to update credentials: ${updateErr.message}` });
      }

      // Consume OTP if verified from DB
      if (record && db.otps) {
        delete db.otps[normalizedPhone];
        saveOnboardingDB(db);
      }

      res.json({ success: true, message: 'Secure PIN successfully reset.' });

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/auth/merchant-login', authLimiter, async (req, res) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) return res.status(400).json({ success: false, error: 'Phone/code and password are required' });

      const cleanInput = String(phone).trim();
      
      // Look up user by phone or merchant_code
      const { data: user, error: err2 } = await supabase
        .from('users')
        .select('id, dashboard_password, role, status, merchant_code, phone')
        .or(`phone.eq.${cleanInput},merchant_code.eq.${cleanInput}`)
        .maybeSingle();

      if (err2 || !user) return res.status(401).json({ success: false, error: 'User not found' });

      // Compare password with sha256
      const hash = crypto.createHash('sha256').update(password.trim()).digest('hex');
      
      if (user.dashboard_password === hash) {
        return res.json({ success: true, user_id: user.id });
      }
      res.status(401).json({ success: false, error: 'Invalid password' });
    } catch(err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

export default router;
