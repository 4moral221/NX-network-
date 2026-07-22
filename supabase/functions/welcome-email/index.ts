const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    // Support direct invoke or Database Webhook payload shape
    const record = payload.record || payload.type === 'INSERT' ? payload.record : payload
    const email = record?.email || payload?.email
    const name = record?.name || payload?.name || ''
    const role = record?.role || payload?.role || 'subscriber'

    if (!email) {
      throw new Error('Email address is required')
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'welcome@resend.dev'

    const greeting = name ? `Hello ${name},` : 'Hello,'
    const subject = `Welcome to NX Network - Network Updates & Insights`

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
        <div style="margin-bottom: 24px; text-align: left;">
          <h1 style="color: #059669; font-size: 24px; font-weight: 800; margin: 0; tracking: -0.025em;">NX NETWORK</h1>
          <p style="font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.1em; margin-top: 4px;">FMCG Wholesale & Liquidity Engine</p>
        </div>

        <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-top: 0;">You're Subscribed! 🎉</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #374151;">${greeting}</p>
        <p style="font-size: 15px; line-height: 1.6; color: #374151;">
          Thank you for subscribing to NX Network updates. You will be the first to receive real-time announcements on FMCG pool launches, restock discount events, market intelligence, and network expansion milestones.
        </p>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #059669; margin: 24px 0;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #4b5563; letter-spacing: 0.05em;">Subscription Details</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; font-family: monospace; color: #111827;">Email: <strong>${email}</strong></p>
          <p style="margin: 4px 0 0 0; font-size: 14px; font-family: monospace; color: #111827;">Segment: <strong>${role}</strong></p>
        </div>

        <p style="font-size: 14px; line-height: 1.5; color: #4b5563;">
          Got questions or need to connect with our operations team? Reply directly to this email or visit our portal at <a href="https://nx.network" style="color: #059669; text-decoration: none; font-weight: 600;">nx.network</a>.
        </p>

        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          &copy; 2026 NX Network Aggregator. All rights reserved.
        </p>
      </div>
    `

    if (resendApiKey) {
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
      return new Response(JSON.stringify({ success: true, dispatched: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      // Log mode if RESEND_API_KEY is not yet populated
      console.log(`[WELCOME EMAIL SIMULATION] To: ${email}, Subject: ${subject}`);
      return new Response(JSON.stringify({ 
        success: true, 
        dispatched: false, 
        message: 'Welcome email logged (RESEND_API_KEY missing in environment variables)' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
