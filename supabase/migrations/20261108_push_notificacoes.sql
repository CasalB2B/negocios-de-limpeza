-- Push notifications (Firebase Cloud Messaging) for the phone app.
-- push_dispositivos: one row per phone (FCM token), linked to the logged-in profile.
-- push_fila: queue of notifications; the `push` edge function sends them (service role only).
-- Triggers on services enqueue the events; the `push` function also builds the timed ones (eve, morning...).

create table if not exists public.push_dispositivos (
  token text primary key,
  usuario_id text not null,
  company_id integer not null,
  papel text not null,
  colab_ids text[] not null default '{}',
  plataforma text not null default 'android',
  atualizado_em timestamptz not null default now()
);
create index if not exists push_dispositivos_empresa on public.push_dispositivos (company_id, papel);
create index if not exists push_dispositivos_colab on public.push_dispositivos using gin (colab_ids);
alter table public.push_dispositivos enable row level security;
drop policy if exists push_dispositivos_meus on public.push_dispositivos;
create policy push_dispositivos_meus on public.push_dispositivos for select to authenticated using (usuario_id = meu_perfil_id());

create table if not exists public.push_fila (
  id bigserial primary key,
  company_id integer not null,
  destino text not null check (destino in ('admin', 'colab', 'usuario')),
  colab_ids text[] not null default '{}',
  usuario_id text,
  titulo text not null,
  corpo text not null,
  rota text,
  chave text unique,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  resultado text
);
create index if not exists push_fila_pendentes on public.push_fila (id) where enviado_em is null;
alter table public.push_fila enable row level security;

-- Registers the caller's phone. Recipients are computed here, never trusted from the app:
-- a collaborator is linked to her profile id and to her RH record (same name, same company),
-- because services point to either one.
create or replace function public.registrar_dispositivo(p_token text, p_plataforma text default 'android')
returns void language plpgsql security definer set search_path = public as $$
declare
  u public.app_users%rowtype;
  ids text[];
begin
  select * into u from public.app_users where auth_id = auth.uid() limit 1;
  if u.id is null or coalesce(p_token, '') = '' then return; end if;
  ids := array[u.id::text];
  if u.role = 'COLLABORATOR' then
    ids := ids || coalesce((select array_agg(r.id::text) from public.colaboradoras_rh r
                            where r.company_id = u.company_id and lower(trim(r.nome)) = lower(trim(u.name))), '{}');
  end if;
  insert into public.push_dispositivos (token, usuario_id, company_id, papel, colab_ids, plataforma, atualizado_em)
  values (p_token, u.id::text, coalesce(u.company_id, 1), u.role, ids, coalesce(p_plataforma, 'android'), now())
  on conflict (token) do update set usuario_id = excluded.usuario_id, company_id = excluded.company_id, papel = excluded.papel,
    colab_ids = excluded.colab_ids, plataforma = excluded.plataforma, atualizado_em = now();
end $$;

create or replace function public.remover_dispositivo(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_dispositivos where token = p_token and usuario_id = meu_perfil_id();
$$;

revoke all on function public.registrar_dispositivo(text, text) from public, anon;
revoke all on function public.remover_dispositivo(text) from public, anon;
grant execute on function public.registrar_dispositivo(text, text) to authenticated;
grant execute on function public.remover_dispositivo(text) to authenticated;

-- "qui, 14/11 às 08:00" from the services date (DD/MM/YYYY or YYYY-MM-DD) and time.
create or replace function public.push_quando(p_data text, p_hora text)
returns text language plpgsql immutable as $$
declare d date;
begin
  begin
    if p_data ~ '^\d{2}/\d{2}/\d{4}$' then d := to_date(p_data, 'DD/MM/YYYY');
    elsif p_data ~ '^\d{4}-\d{2}-\d{2}' then d := left(p_data, 10)::date;
    end if;
  exception when others then d := null;
  end;
  if d is null then return coalesce(p_data, '') || coalesce(' às ' || nullif(p_hora, ''), ''); end if;
  return (array['dom','seg','ter','qua','qui','sex','sáb'])[extract(dow from d)::int + 1] || ', ' || to_char(d, 'DD/MM')
    || coalesce(' às ' || nullif(p_hora, ''), '');
end $$;

create or replace function public.push_ids_servico(p_ids jsonb, p_id text)
returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select jsonb_array_elements_text(case when jsonb_typeof(p_ids) = 'array' then p_ids else '[]'::jsonb end) as x
    union select nullif(p_id, '')
  ) t where x is not null and x <> '';
$$;

-- Service events → queue. Never blocks saving a service: any error only raises a warning.
create or replace function public.push_servico_evento()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ids text[]; old_ids text[]; novos text[]; removidos text[]; ficaram text[];
  quando text; cliente text; cancelado boolean; era_cancelado boolean; pago_agora boolean;
  enfileirou boolean := false;
  valor numeric;
begin
  begin
    ids := push_ids_servico(new.collaborator_ids, new.collaborator_id);
    quando := push_quando(new.date, new.time);
    cliente := coalesce(nullif(new.client_name, ''), 'cliente');
    cancelado := upper(coalesce(new.status, '')) in ('CANCELED', 'CANCELLED', 'CANCELADO');

    if tg_op = 'INSERT' then
      if array_length(ids, 1) > 0 and not cancelado and upper(coalesce(new.status, '')) <> 'COMPLETED' then
        insert into push_fila (company_id, destino, colab_ids, titulo, corpo, rota)
        values (coalesce(new.company_id, 1), 'colab', ids, 'Nova faxina na sua agenda', quando || ' · ' || cliente, '/collab/agenda');
        enfileirou := true;
      end if;
    else
      old_ids := push_ids_servico(old.collaborator_ids, old.collaborator_id);
      era_cancelado := upper(coalesce(old.status, '')) in ('CANCELED', 'CANCELLED', 'CANCELADO');
      novos := array(select unnest(ids) except select unnest(old_ids));
      removidos := array(select unnest(old_ids) except select unnest(ids));
      ficaram := array(select unnest(ids) intersect select unnest(old_ids));

      -- Collaborators
      if cancelado and not era_cancelado then
        if array_length(old_ids || ids, 1) > 0 then
          insert into push_fila (company_id, destino, colab_ids, titulo, corpo, rota)
          values (coalesce(new.company_id, 1), 'colab', old_ids || ids, 'Faxina cancelada', quando || ' · ' || cliente, '/collab/agenda');
          enfileirou := true;
        end if;
      elsif not cancelado then
        if array_length(novos, 1) > 0 then
          insert into push_fila (company_id, destino, colab_ids, titulo, corpo, rota)
          values (coalesce(new.company_id, 1), 'colab', novos, 'Nova faxina na sua agenda', quando || ' · ' || cliente, '/collab/agenda');
          enfileirou := true;
        end if;
        if array_length(removidos, 1) > 0 then
          insert into push_fila (company_id, destino, colab_ids, titulo, corpo, rota)
          values (coalesce(new.company_id, 1), 'colab', removidos, 'Faxina retirada da sua agenda', quando || ' · ' || cliente, '/collab/agenda');
          enfileirou := true;
        end if;
        if array_length(ficaram, 1) > 0 and (new.date is distinct from old.date or new.time is distinct from old.time
            or new.address is distinct from old.address) then
          insert into push_fila (company_id, destino, colab_ids, titulo, corpo, rota)
          values (coalesce(new.company_id, 1), 'colab', ficaram, 'Faxina alterada',
                  'Agora: ' || quando || ' · ' || cliente, '/collab/agenda');
          enfileirou := true;
        end if;
      end if;

      -- Admins: payments
      pago_agora := upper(coalesce(new.payment_status, '')) is distinct from upper(coalesce(old.payment_status, ''));
      if pago_agora and upper(coalesce(new.payment_status, '')) = 'SIGNAL_PAID' then
        valor := coalesce(new.signal_amount, 0);
        insert into push_fila (company_id, destino, titulo, corpo, rota)
        values (coalesce(new.company_id, 1), 'admin', '💰 Sinal recebido',
                cliente || ' pagou o sinal' || case when valor > 0 then ' de R$ ' || replace(to_char(valor, 'FM999G990D00'), '.', ',') else '' end
                || '. Faxina de ' || quando || ' confirmada.', '/admin/os');
        enfileirou := true;
      elsif pago_agora and upper(coalesce(new.payment_status, '')) in ('FULL_PAID', 'PAID', 'PAGO') then
        valor := coalesce(new.payment_paid_amount, new.price, 0);
        insert into push_fila (company_id, destino, titulo, corpo, rota)
        values (coalesce(new.company_id, 1), 'admin', '💰 Pagamento recebido',
                cliente || ' pagou' || case when valor > 0 then ' R$ ' || replace(to_char(valor, 'FM999G990D00'), '.', ',') else '' end
                || ' · faxina de ' || quando || '.', '/admin/os');
        enfileirou := true;
      end if;

      -- Admins: client confirmed (when it is not the payment that confirmed it)
      if not pago_agora and upper(coalesce(new.status, '')) = 'CONFIRMED' and upper(coalesce(old.status, '')) is distinct from 'CONFIRMED' then
        insert into push_fila (company_id, destino, titulo, corpo, rota)
        values (coalesce(new.company_id, 1), 'admin', '✅ Cliente confirmou', cliente || ' confirmou a faxina de ' || quando || '.', '/admin/os');
        enfileirou := true;
      end if;

      -- Admins: check-in and completion
      if new.checked_in_at is not null and old.checked_in_at is null then
        insert into push_fila (company_id, destino, titulo, corpo, rota)
        values (coalesce(new.company_id, 1), 'admin', '📍 Check-in feito',
                coalesce(nullif(new.collaborator_name, ''), 'A colaboradora') || ' chegou na faxina de ' || cliente || '.', '/admin/os');
        enfileirou := true;
      end if;
      if upper(coalesce(new.status, '')) = 'COMPLETED' and upper(coalesce(old.status, '')) is distinct from 'COMPLETED' then
        insert into push_fila (company_id, destino, titulo, corpo, rota)
        values (coalesce(new.company_id, 1), 'admin', '✨ Faxina concluída',
                coalesce(nullif(new.collaborator_name, ''), 'A equipe') || ' concluiu a faxina de ' || cliente || '.', '/admin/os');
        enfileirou := true;
      end if;
    end if;

    if enfileirou then
      perform net.http_post(url := 'https://yhdxmutbreihrtlnbcaf.supabase.co/functions/v1/push',
                            headers := '{"Content-Type": "application/json"}'::jsonb, body := '{"acao":"processar"}'::jsonb);
    end if;
  exception when others then
    raise warning 'push_servico_evento: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists push_servico_evento on public.services;
create trigger push_servico_evento after insert or update on public.services
  for each row execute function public.push_servico_evento();

-- Timed notifications (eve, morning, pending confirmations, weekly summary, late check-in, photos)
-- and a safety net for anything left in the queue.
select cron.unschedule('push-agendados') where exists (select 1 from cron.job where jobname = 'push-agendados');
select cron.schedule('push-agendados', '*/15 * * * *',
  $c$ select net.http_post(url := 'https://yhdxmutbreihrtlnbcaf.supabase.co/functions/v1/push',
       headers := '{"Content-Type": "application/json"}'::jsonb, body := '{"acao":"agendados"}'::jsonb); $c$);
