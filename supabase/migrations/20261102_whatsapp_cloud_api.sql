-- WhatsApp Cloud API (oficial da Meta) com coexistência — substitui a Evolution API.

-- Conexão de cada empresa com a WhatsApp Cloud API. Guarda o token: só o servidor lê (RLS ligado, sem política).
create table if not exists public.whatsapp_connections (
  company_id integer primary key default 1,
  waba_id text,
  phone_number_id text,
  business_id text,
  display_phone text,
  verified_name text,
  access_token text,
  coexistence boolean not null default false,
  status text not null default 'disconnected',
  contacts_sync_requested_at timestamptz,
  history_sync_requested_at timestamptz,
  last_error text,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_connections enable row level security;
revoke all on public.whatsapp_connections from anon, authenticated;

-- Configuração do bot (sem segredos): o painel lê e grava.
create table if not exists public.whatsapp_bot_config (
  company_id integer primary key default 1,
  mode text not null default 'ai' check (mode in ('reminders','menu','ai')),
  enabled boolean not null default true,
  business_name text default 'Negócios de Limpeza',
  business_address text default '',
  business_website text default '',
  business_instagram text default '',
  payment_methods text default 'Pix, cartão de crédito e débito',
  business_phone text default '',
  business_email text default '',
  human_reactivate_hours integer not null default 24,
  notify_human_queue boolean not null default true,
  notify_phone text default '',
  assistant_name text not null default 'Nina',
  tone text not null default 'casual',
  audio_replies boolean not null default false,
  extra_info text default '',
  custom_rules text default '',
  feedback_message text default 'Oi, [Nome]! Como foi a limpeza de hoje? Dá uma nota de 1 a 5 pra gente, sua opinião ajuda muito a nossa equipe.',
  ask_referrals boolean not null default true,
  referral_message text default 'Que bom que gostou! Se tiver um amigo ou familiar que precise de limpeza, pode indicar a gente. É só mandar o contato aqui.',
  after_booking_message text default 'Perfeito! Já tenho tudo que preciso. Vou preparar seu orçamento e em breve a gente envia por aqui. Qualquer dúvida é só chamar!',
  handoff_message text default 'Claro! Já chamo alguém da equipe pra te ajudar. Um instante!',
  menu_greeting text default 'Olá! Bem-vindo(a) à Negócios de Limpeza. Como podemos ajudar?',
  menu_button_label text default 'Ver opções',
  menu_items jsonb not null default '[
    {"id":"orcamento","title":"Pedir orçamento","description":"Limpeza residencial, comercial ou pós-obra","action":"reply","response":"Ótimo! Me conta: é casa, apartamento ou escritório? Quantos quartos e banheiros?"},
    {"id":"agendamento","title":"Meu agendamento","description":"Confirmar, reagendar ou cancelar","action":"human","response":""},
    {"id":"precos","title":"Serviços e preços","description":"O que fazemos e como cobramos","action":"reply","response":"Fazemos limpeza residencial, comercial, pós-obra e passadoria. O valor depende do tamanho do imóvel. Quer um orçamento?"},
    {"id":"atendente","title":"Falar com atendente","description":"Uma pessoa da equipe responde","action":"human","response":""}
  ]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_bot_config enable row level security;
create policy anon_all on public.whatsapp_bot_config for all to anon using (true) with check (true);

insert into public.whatsapp_bot_config (company_id, enabled, tone, human_reactivate_hours, business_phone)
select 1, coalesce(nina_enabled, true), coalesce(nina_tone, 'casual'), coalesce(nina_silence_hours, 24), coalesce(contact_phone, '')
from public.platform_settings where id = 1
on conflict (company_id) do nothing;

-- Registro de mensagens enviadas/recebidas e status de entrega.
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default 1,
  wa_message_id text unique,
  direction text not null check (direction in ('in','out','echo')),
  phone text not null,
  type text,
  body text,
  template_name text,
  status text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_phone_idx on public.whatsapp_messages (company_id, phone, created_at desc);
alter table public.whatsapp_messages enable row level security;
create policy anon_read on public.whatsapp_messages for select to anon using (true);

-- Modelos de mensagem (status de aprovação vindo da Meta).
create table if not exists public.whatsapp_templates (
  company_id integer not null default 1,
  name text not null,
  language text not null default 'pt_BR',
  category text,
  status text,
  meta_id text,
  rejected_reason text,
  updated_at timestamptz not null default now(),
  primary key (company_id, name, language)
);
alter table public.whatsapp_templates enable row level security;
create policy anon_read on public.whatsapp_templates for select to anon using (true);

-- IDs públicos do app da Meta (não são segredos) usados pelo botão Conectar.
alter table public.platform_settings add column if not exists meta_app_id text;
alter table public.platform_settings add column if not exists meta_es_config_id text;

-- O token nunca mais fica em tabela legível pelo navegador.
alter table public.platform_settings drop column if exists whatsapp_token;
alter table public.platform_settings drop column if exists whatsapp_phone_id;

-- Roteiro de atendimento editável (vazio = roteiro padrão do código).
alter table public.whatsapp_bot_config add column if not exists script text;

-- PIN de verificação em duas etapas (só para número novo, sem coexistência). Só o servidor lê.
alter table public.whatsapp_connections add column if not exists two_step_pin text;

-- Liga/desliga a confirmação automática quando um serviço é agendado no painel.
alter table public.whatsapp_bot_config add column if not exists send_booking_confirmation boolean not null default true;

-- Lançamento: só lembretes/confirmações/avisos. O bot (Menu/IA) fica pronto para uso interno e futuro adicional pago.
alter table public.whatsapp_bot_config alter column mode set default 'reminders';
update public.whatsapp_bot_config set mode = 'reminders' where company_id = 1;
update public.platform_settings set follow_up_enabled = false where id = 1;

-- Agendamentos: sai o follow-up da Evolution; entra o lembrete D-1 todo dia às 9h (12h UTC).
select cron.unschedule('whatsapp-followup');
select cron.schedule('service-reminder', '0 12 * * *', $$ select net.http_post(url := 'https://yhdxmutbreihrtlnbcaf.supabase.co/functions/v1/service-reminder', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb); $$);
