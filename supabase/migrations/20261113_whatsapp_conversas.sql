-- "Conversas" (WhatsApp Web inside the system): one row per contact, filled by a trigger on every message.
-- Applied through the Supabase MCP on 2026-11-13; see the migration "whatsapp_conversas".
create table if not exists public.whatsapp_contatos (
  company_id integer not null, phone text not null, nome text, atendente_id text, atendente_nome text,
  status text not null default 'aberta' check (status in ('aberta', 'resolvida')),
  lida_em timestamptz, ultima_msg text, ultima_direcao text, ultima_em timestamptz, ultima_entrada_em timestamptz,
  primary key (company_id, phone)
);
create index if not exists whatsapp_contatos_recentes on public.whatsapp_contatos (company_id, ultima_em desc);
alter table public.whatsapp_contatos enable row level security;
drop policy if exists "equipe_empresa" on public.whatsapp_contatos;
create policy "equipe_empresa" on public.whatsapp_contatos for all
  using (company_id = minha_empresa() and sou_equipe()) with check (company_id = minha_empresa() and sou_equipe());

create or replace function public.whatsapp_contato_da_mensagem() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into whatsapp_contatos as c (company_id, phone, ultima_msg, ultima_direcao, ultima_em, ultima_entrada_em, status)
  values (coalesce(new.company_id, 1), new.phone, left(coalesce(new.body, ''), 200), new.direction, coalesce(new.created_at, now()),
          case when new.direction = 'in' then coalesce(new.created_at, now()) end, 'aberta')
  on conflict (company_id, phone) do update set
    ultima_msg = excluded.ultima_msg, ultima_direcao = excluded.ultima_direcao, ultima_em = excluded.ultima_em,
    ultima_entrada_em = coalesce(excluded.ultima_entrada_em, c.ultima_entrada_em),
    status = case when new.direction = 'in' then 'aberta' else c.status end;
  return new;
end $$;
drop trigger if exists whatsapp_contato_da_mensagem on public.whatsapp_messages;
create trigger whatsapp_contato_da_mensagem after insert on public.whatsapp_messages
  for each row execute function public.whatsapp_contato_da_mensagem();

do $$ begin
  begin alter publication supabase_realtime add table public.whatsapp_messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.whatsapp_contatos; exception when duplicate_object then null; end;
end $$;
