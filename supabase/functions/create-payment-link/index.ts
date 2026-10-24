import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { service_id } = await req.json()
    if (!service_id) {
      return new Response(JSON.stringify({ error: 'service_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: service, error: svcErr } = await supabase
      .from('services')
      .select('id, price, type, client_name, date')
      .eq('id', service_id)
      .single()

    if (svcErr || !service) {
      return new Response(JSON.stringify({ error: 'Serviço não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!service.price || service.price <= 0) {
      return new Response(JSON.stringify({ error: 'Serviço sem valor definido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings, error: settingsErr } = await supabase
      .from('platform_settings')
      .select('infinitepay_key')
      .eq('id', 1)
      .single()

    if (settingsErr || !settings?.infinitepay_key) {
      return new Response(JSON.stringify({ error: 'InfinityPay não configurado. Adicione a API Key em Configurações > Integrações.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const amount = Math.round(service.price * 100)
    const description = `${service.type} — ${service.client_name}${service.date ? ` (${service.date})` : ''}`

    const ipRes = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': settings.infinitepay_key,
      },
      body: JSON.stringify({
        amount,
        description,
        payment_methods: ['pix', 'credit_card'],
        expires_in: 172800,
        metadata: { service_id },
      }),
    })

    if (!ipRes.ok) {
      const errBody = await ipRes.text()
      return new Response(JSON.stringify({ error: `Erro InfinityPay: ${errBody}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { checkout_url, link_id } = await ipRes.json()

    await supabase
      .from('services')
      .update({
        payment_link_final: checkout_url,
        payment_link_signal: link_id,
      })
      .eq('id', service_id)

    return new Response(JSON.stringify({ checkout_url, link_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
