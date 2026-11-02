// Desativada em 02/11/2026: a Evolution API (não oficial) foi substituída pela API oficial da Meta.
// Use as funções whatsapp-send, whatsapp-admin e whatsapp-webhook.
Deno.serve(() => new Response(JSON.stringify({ ok: false, error: 'Evolution desativada. Use a API oficial (whatsapp-send).' }), {
  status: 410,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
}));
