-- Client addresses get notes (gate, key, reference); clients may have no e-mail; no silent default password.
alter table public.addresses add column if not exists notes text;
alter table public.app_users alter column email drop not null;
alter table public.app_users alter column password drop default;
update public.app_users set password = null where company_id = 2 and role = 'CLIENT' and auth_id is null and password = '123456';
