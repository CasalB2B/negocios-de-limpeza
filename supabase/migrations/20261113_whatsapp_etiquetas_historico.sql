-- Our own labels on each WhatsApp contact + the company's label list; history messages (coexistence
-- sync, status = 'history') do not create leads nor unread conversations. Applied via the Supabase MCP
-- on 2026-11-13 ("whatsapp_etiquetas_historico"); the two trigger functions are the same as in the database.
alter table public.whatsapp_contatos add column if not exists etiquetas text[] not null default '{}';
create table if not exists public.whatsapp_etiquetas (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default coalesce(minha_empresa(), 1),
  nome text not null, cor text not null default 'gray', ordem integer not null default 0,
  unique (company_id, nome)
);
alter table public.whatsapp_etiquetas enable row level security;
drop policy if exists "equipe_empresa" on public.whatsapp_etiquetas;
create policy "equipe_empresa" on public.whatsapp_etiquetas for all
  using (company_id = minha_empresa() and sou_equipe()) with check (company_id = minha_empresa() and sou_equipe());
