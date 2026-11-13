-- Platform support (applied via the Supabase MCP on 2026-11-13: suporte_plataforma, suporte_push_na_hora, empresas_dono_le).
-- sou_dono_plataforma(); dono_plataforma can't be changed from the app; suporte_config (WhatsApp/e-mail/hours/chat on);
-- suporte_chamados (canal chat|chamado, status aberto → em_andamento → desenvolvedor → aguardando_cliente → resolvido);
-- suporte_mensagens with a trigger that updates the ticket and queues a phone notification to the other side
-- (company author ↔ platform owner), sent right away through the push function; realtime on both tables.
-- See the database for the exact function bodies (suporte_apos_mensagem, suporte_enviar_push, proteger_permissoes).
create or replace function public.sou_dono_plataforma() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select dono_plataforma from app_users where auth_id = auth.uid() limit 1), false)
$$;
create table if not exists public.suporte_config (
  id integer primary key default 1 check (id = 1), whatsapp text, email text,
  horario text default 'Segunda a sexta, das 8h às 18h', chat_ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);
create table if not exists public.suporte_chamados (
  id uuid primary key default gen_random_uuid(), numero serial,
  company_id integer not null default coalesce(minha_empresa(), 1),
  canal text not null default 'chamado' check (canal in ('chat', 'chamado')),
  autor_auth_id uuid not null default auth.uid(), autor_nome text, autor_email text, assunto text not null,
  categoria text not null default 'duvida' check (categoria in ('duvida', 'erro', 'sugestao', 'financeiro', 'outro')),
  status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'desenvolvedor', 'aguardando_cliente', 'resolvido')),
  lido_suporte_em timestamptz, lido_cliente_em timestamptz, ultima_msg text, ultima_do_suporte boolean,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table if not exists public.suporte_mensagens (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.suporte_chamados(id) on delete cascade,
  autor_auth_id uuid not null default auth.uid(), autor_nome text, do_suporte boolean not null default false,
  texto text not null default '', anexo text, anexo_nome text, criado_em timestamptz not null default now()
);
drop policy if exists "dono_le" on public.empresas;
create policy "dono_le" on public.empresas for select using (sou_dono_plataforma());
