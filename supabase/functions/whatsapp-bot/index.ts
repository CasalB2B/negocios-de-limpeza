// Desativada em 02/11/2026: o bot agora roda no whatsapp-webhook (API oficial da Meta).
Deno.serve(() => new Response('Evolution desativada. Webhook oficial: whatsapp-webhook.', { status: 410 }));
