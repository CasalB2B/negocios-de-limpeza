-- A message from a number that is not a client nor someone of the team, and has no open quote,
-- becomes a "Novo contato" card in Atendimento → Orçamentos (with the WhatsApp profile name).
create or replace function public.whatsapp_lead_da_mensagem() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  empresa integer := coalesce(new.company_id, 1);
  fim text := right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 8);
  nome_perfil text;
begin
  if new.direction <> 'in' or length(fim) < 8 then return new; end if;
  if exists (select 1 from app_users u where coalesce(u.company_id, 1) = empresa
             and right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 8) = fim) then return new; end if;
  if exists (select 1 from quotes q where coalesce(q.company_id, 1) = empresa
             and right(regexp_replace(coalesce(q.whatsapp, ''), '\D', '', 'g'), 8) = fim
             and coalesce(q.status, 'NEW') not in ('LOST', 'CONVERTED')) then return new; end if;
  select nome into nome_perfil from whatsapp_contatos where company_id = empresa and phone = new.phone;
  insert into quotes (company_id, name, whatsapp, status, source, chat_summary, last_contacted_at)
  values (empresa, coalesce(nullif(nome_perfil, ''), 'Contato do WhatsApp'), new.phone, 'NEW', 'whatsapp',
          'Primeira mensagem: ' || left(coalesce(new.body, ''), 500), now());
  return new;
end $$;
drop trigger if exists whatsapp_lead_da_mensagem on public.whatsapp_messages;
create trigger whatsapp_lead_da_mensagem after insert on public.whatsapp_messages
  for each row execute function public.whatsapp_lead_da_mensagem();
