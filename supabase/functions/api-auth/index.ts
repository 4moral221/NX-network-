import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-required-scope',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = req.headers.get('x-api-key')
    const requiredScope = req.headers.get('x-required-scope')

    if (!apiKey) return new Response(
      JSON.stringify({ error: 'Missing x-api-key header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const data = new TextEncoder().encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')

    // Single source of truth — fmcg_partners only, partners table removed
    const { data: keyRecord, error } = await supabase
      .from('api_keys')
      .select('id, partner_id, scope, partner_type, expires_at, revoked')
      .eq('key_hash', keyHash)
      .eq('revoked', false)
      .single()

    if (error || !keyRecord) return new Response(
      JSON.stringify({ error: 'Invalid or revoked API key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    if (keyRecord.expires_at && new Date() > new Date(keyRecord.expires_at)) return new Response(
      JSON.stringify({ error: 'API key expired' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    const { data: partner } = await supabase
      .from('fmcg_partners')
      .select('id, name, active, partner_type')
      .eq('id', keyRecord.partner_id)
      .single()

    if (!partner?.active) return new Response(
      JSON.stringify({ error: 'Partner account suspended or not found' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    if (requiredScope) {
      const scopes: string[] = keyRecord.scope || []
      if (!scopes.includes(requiredScope)) return new Response(
        JSON.stringify({ error: `Insufficient scope. Required: ${requiredScope}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({
      success: true,
      partner_type: keyRecord.partner_type,
      scope: keyRecord.scope,
      partner: { id: partner.id, name: partner.name, partner_type: partner.partner_type }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
