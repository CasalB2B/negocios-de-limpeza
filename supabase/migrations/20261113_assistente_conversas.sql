-- AI assistant: each person's past conversations and the answers they bookmarked.
create table if not exists public.assistente_conversas (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null default auth.uid(),
  company_id integer not null default coalesce(minha_empresa(), 1),
  titulo text not null default 'Conversa',
  mensagens jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists assistente_conversas_dono on public.assistente_conversas (auth_id, atualizado_em desc);
alter table public.assistente_conversas enable row level security;
drop policy if exists "minhas_conversas" on public.assistente_conversas;
create policy "minhas_conversas" on public.assistente_conversas for all
  using (auth_id = auth.uid()) with check (auth_id = auth.uid());

create table if not exists public.assistente_salvos (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null default auth.uid(),
  company_id integer not null default coalesce(minha_empresa(), 1),
  pergunta text,
  resposta text not null,
  criado_em timestamptz not null default now()
);
create index if not exists assistente_salvos_dono on public.assistente_salvos (auth_id, criado_em desc);
alter table public.assistente_salvos enable row level security;
drop policy if exists "meus_salvos" on public.assistente_salvos;
create policy "meus_salvos" on public.assistente_salvos for all
  using (auth_id = auth.uid()) with check (auth_id = auth.uid());
