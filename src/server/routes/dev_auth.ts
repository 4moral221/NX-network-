import { Router } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { supabase } from "../core";

const router = Router();

interface DevUser {
  id: string;
  email: string;
  password_hash: string;
  verified: boolean;
  magic_token?: string | null;
  magic_token_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface DevSession {
  token: string;
  user_id: string;
  email: string;
  expires_at: number;
}

const DEV_USERS_FILE = path.join(process.cwd(), "data", "dev_users.json");
const DEV_SESSIONS_FILE = path.join(process.cwd(), "data", "dev_sessions.json");

function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadDevUsers(): DevUser[] {
  ensureDataDir();
  if (fs.existsSync(DEV_USERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DEV_USERS_FILE, "utf8"));
    } catch (err) {
      console.error("Error reading dev_users.json:", err);
    }
  }
  return [];
}

function saveDevUsers(users: DevUser[]) {
  ensureDataDir();
  fs.writeFileSync(DEV_USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function loadDevSessions(): DevSession[] {
  ensureDataDir();
  if (fs.existsSync(DEV_SESSIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DEV_SESSIONS_FILE, "utf8"));
    } catch (err) {
      console.error("Error reading dev_sessions.json:", err);
    }
  }
  return [];
}

function saveDevSessions(sessions: DevSession[]) {
  ensureDataDir();
  fs.writeFileSync(DEV_SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf8");
}

async function sendMagicLinkEmail(email: string, magicToken: string, origin: string) {
  const magicLinkUrl = `${origin.replace(/\/$/, '')}/docs?dev_token=${magicToken}`;
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your NX Developer Account</title>
    </head>
    <body style="background-color: #030407; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; color: #f3f4f6;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background: #0a0d14; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 32px 32px 24px 32px; border-b: 1px solid #1f2937;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #00e676; margin-bottom: 8px;">NX Network</div>
            <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: -0.02em;">Developer Account Verification</h1>
            <p style="font-size: 14px; color: #9ca3af; margin: 0; line-height: 1.5;">Verify your email to gain instant access to NX Network Developer APIs, SDKs, and integration documentation.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px;">
            <p style="font-size: 14px; color: #d1d5db; margin: 0 0 24px 0;">Click the magic link button below to complete your developer registration:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${magicLinkUrl}" target="_blank" style="display: inline-block; background-color: #00e676; color: #000000; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(0,230,118,0.3);">
                Verify &amp; Access Developer Docs &rarr;
              </a>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin: 24px 0 8px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 11px; font-family: monospace; color: #00e676; word-break: break-all; margin: 0; background: #030407; padding: 12px; border-radius: 6px; border: 1px solid #1f2937;">${magicLinkUrl}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 32px; background: #030407; border-t: 1px solid #1f2937; text-align: center;">
            <p style="font-size: 11px; color: #4b5563; margin: 0;">This magic link will expire in 24 hours. If you did not request this account, please ignore this email.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  if (resendApiKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFrom,
          to: email,
          subject: 'Verify Your NX Network Developer Account',
          html: htmlBody
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.warn("Resend email response warning:", data);
      }
    } catch (err) {
      console.error("Failed to dispatch Resend email:", err);
    }
  } else {
    console.log(`[DevAuth] RESEND_API_KEY missing. Simulated Magic Link for ${email}: ${magicLinkUrl}`);
  }

  return magicLinkUrl;
}

// 1. Sign Up Endpoint (Email, Password, Confirm Password)
router.post('/api/dev/signup', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Password and Confirm Password do not match' });
    }

    const emailClean = email.trim().toLowerCase();
    const users = loadDevUsers();

    const existingUser = users.find(u => u.email === emailClean);
    const passwordHash = bcrypt.hashSync(password, 10);
    const magicToken = 'dev_ml_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    let user: DevUser;

    if (existingUser) {
      if (existingUser.verified) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists. Please sign in instead.'
        });
      }
      // Re-initialize unverified user
      existingUser.password_hash = passwordHash;
      existingUser.magic_token = magicToken;
      existingUser.magic_token_expires_at = expiresAt;
      existingUser.updated_at = new Date().toISOString();
      user = existingUser;
    } else {
      user = {
        id: 'dev_usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
        email: emailClean,
        password_hash: passwordHash,
        verified: false,
        magic_token: magicToken,
        magic_token_expires_at: expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      users.push(user);
    }

    saveDevUsers(users);

    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const origin = req.headers.origin || `${protocol}://${hostHeader}`;

    const magicLinkUrl = await sendMagicLinkEmail(emailClean, magicToken, origin);

    return res.json({
      success: true,
      message: `Account created successfully! A magic link has been sent to ${emailClean}. Please click the link in your email to verify your account.`,
      email: emailClean,
      simulated_magic_link: magicLinkUrl
    });
  } catch (err: any) {
    console.error('[DevAuth] Signup error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// 2. Verify Magic Link Token Endpoint
router.post('/api/dev/verify-magic-link', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Magic link token is required' });
    }

    const users = loadDevUsers();
    const user = users.find(u => u.magic_token === token);

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired magic link token' });
    }

    if (user.magic_token_expires_at && new Date(user.magic_token_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: 'This magic link token has expired. Please request a new one.' });
    }

    // Mark verified
    user.verified = true;
    user.magic_token = null;
    user.magic_token_expires_at = null;
    user.updated_at = new Date().toISOString();
    saveDevUsers(users);

    // Create active session
    const sessionToken = 'dev_sess_' + crypto.randomBytes(24).toString('hex');
    const sessions = loadDevSessions();
    sessions.push({
      token: sessionToken,
      user_id: user.id,
      email: user.email,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    saveDevSessions(sessions);

    return res.json({
      success: true,
      message: 'Developer account verified successfully!',
      user: {
        id: user.id,
        email: user.email,
        verified: true
      },
      sessionToken
    });
  } catch (err: any) {
    console.error('[DevAuth] Verify magic link error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Verification failed' });
  }
});

// 3. Login Endpoint (Email, Password)
router.post('/api/dev/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const emailClean = email.trim().toLowerCase();
    const users = loadDevUsers();
    const user = users.find(u => u.email === emailClean);

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    if (!user.verified) {
      // Re-send magic link
      const magicToken = 'dev_ml_' + crypto.randomBytes(24).toString('hex');
      user.magic_token = magicToken;
      user.magic_token_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      saveDevUsers(users);

      const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const origin = req.headers.origin || `${protocol}://${hostHeader}`;

      const magicLinkUrl = await sendMagicLinkEmail(emailClean, magicToken, origin);

      return res.status(403).json({
        success: false,
        unverified: true,
        error: 'Your developer account is not verified yet. A magic link has been sent to your email.',
        simulated_magic_link: magicLinkUrl
      });
    }

    // Create session token
    const sessionToken = 'dev_sess_' + crypto.randomBytes(24).toString('hex');
    const sessions = loadDevSessions();
    sessions.push({
      token: sessionToken,
      user_id: user.id,
      email: user.email,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000
    });
    saveDevSessions(sessions);

    return res.json({
      success: true,
      message: 'Sign in successful',
      user: {
        id: user.id,
        email: user.email,
        verified: true
      },
      sessionToken
    });
  } catch (err: any) {
    console.error('[DevAuth] Login error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// 4. Resend Magic Link Endpoint
router.post('/api/dev/resend-magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const emailClean = email.trim().toLowerCase();
    const users = loadDevUsers();
    let user = users.find(u => u.email === emailClean);

    if (!user) {
      return res.status(400).json({ success: false, error: 'No developer account found with this email' });
    }

    const magicToken = 'dev_ml_' + crypto.randomBytes(24).toString('hex');
    user.magic_token = magicToken;
    user.magic_token_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    saveDevUsers(users);

    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const origin = req.headers.origin || `${protocol}://${hostHeader}`;

    const magicLinkUrl = await sendMagicLinkEmail(emailClean, magicToken, origin);

    return res.json({
      success: true,
      message: `A new magic link has been sent to ${emailClean}`,
      simulated_magic_link: magicLinkUrl
    });
  } catch (err: any) {
    console.error('[DevAuth] Resend error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Resend failed' });
  }
});

// 5. Current User Session Check Endpoint
router.get('/api/dev/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const sessions = loadDevSessions();
    const session = sessions.find(s => s.token === token && s.expires_at > Date.now());

    if (!session) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }

    const users = loadDevUsers();
    const user = users.find(u => u.id === session.user_id);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Auth check failed' });
  }
});

export default router;
