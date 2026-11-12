-- Access levels for the company's office team and personal shortcuts.
-- permissoes: null = full access (the owner / main administrator); otherwise {"areas": ["agenda", "clientes", ...]}.
-- preferencias: per-person settings such as {"atalhos": ["/admin/calendar", "/admin/clients"]}.
alter table public.app_users
  add column if not exists permissoes jsonb,
  add column if not exists preferencias jsonb;

-- Only a full-access administrator of the same company (or the server) can change someone's access level or role.
create or replace function public.proteger_permissoes() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if (new.permissoes is distinct from old.permissoes) or (new.role is distinct from old.role) then
    -- Server-side code (service key, migrations) is trusted; people using the app are not.
    if current_user not in ('authenticated', 'anon') then
      return new;
    end if;
    if not exists (
      select 1 from public.app_users u
      where u.auth_id = auth.uid() and u.role = 'ADMIN' and u.permissoes is null and u.company_id = old.company_id
    ) then
      raise exception 'Só o administrador com acesso total pode mudar o acesso de alguém.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists proteger_permissoes on public.app_users;
create trigger proteger_permissoes before update on public.app_users
  for each row execute function public.proteger_permissoes();
