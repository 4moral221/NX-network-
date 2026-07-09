
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, partnerName, apiKey, action } = await req.json()

    if (!email || !apiKey) {
      throw new Error('Email and API Key are required')
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const subject = action === 'rotate' 
      ? `[ACTION] New API Access Key for ${partnerName}`
      : `Welcome to NX Network - Your API Credentials`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #f59e0b;">NX Network Partner Access</h2>
        <p>Hello <strong>${partnerName}</strong>,</p>
        <p>Your API access credentials for the NX Network are ready. This key allows you to integrate your supply chain data with our merchant network.</p>
        
        <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
          <p style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #71717a; letter-spacing: 1px;">Your API Key</p>
          <code style="display: block; font-size: 18px; font-family: monospace; word-break: break-all; color: #0f172a;">${apiKey}</code>
        </div>

        <p style="color: #ef4444; font-weight: bold;">CRITICAL SECURITY: This is a "show-once" key. We do not store this key in plaintext. Please store it securely (e.g., in a secret manager or encrypted vault).</p>
        
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="font-size: 12px; color: #71717a;">If you did not expect this email, please contact security@nx.network immediately.</p>
        <p style="font-size: 12px; color: #71717a;">&copy; 2026 NX Network Aggregator.</p>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: `NX Network <${fromEmail}>`,
        to: [email],
        subject,
        html,
      })
    })

    const result = await response.json()

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
