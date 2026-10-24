import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { service_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: service } = await supabase
      .from('services')
      .select('id, client_name, client_phone, type, date, collaborator_name')
      .eq('id', service_id)
      .single()

    if (!service) throw new Error('Serviço não encontrado')
    if (!service.client_phone) throw new Error('Cliente sem telefone cadastrado')

    const { data: settings } = await supabase
      .from('platform_settings')
      .select('whatsapp_token, whatsapp_phone_id')
      .eq('id', 1)
      .single()

    const phone = service.client_phone.replace(/\D/g, '')
    const intlPhone = phone.startsWith('55') ? phone : `55${phone}`

    const msg = `Olá ${service.client_name}! ✅\n\nSeu serviço de ${service.type} foi concluído com sucesso!\n\nObrigada pela confiança 💜\n— Equipe Negócios de Limpeza`

    if (!settings?.whatsapp_token || !settings?.whatsapp_phone_id) {
      const waUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`
      return new Response(JSON.stringify({
        sent: false,
        reason: 'whatsapp_not_configured',
        wa_fallback_url: waUrl,
        message: msg,
      }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const apiRes = await fetch(
      `https://graph.facebook.com/v19.0/${settings.whatsapp_phone_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.whatsapp_token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: intlPhone,
          type: 'text',
          text: { body: msg },
        }),
      }
    )

    const result = await apiRes.json()

    return new Response(JSON.stringify({ sent: true, result }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
