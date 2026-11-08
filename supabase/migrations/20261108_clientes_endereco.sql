-- Client addresses get notes (gate, key, reference); clients may have no e-mail; no silent default password.
alter table public.addresses add column if not exists notes text;
alter table public.app_users alter column email drop not null;
alter table public.app_users alter column password drop default;
update public.app_users set password = null where company_id = 2 and role = 'CLIENT' and auth_id is null and password = '123456';

-- Client registration data (invoice and birthday messages): country code, CPF/CNPJ, birthday, sex, blocked, description.
alter table public.app_users
  add column if not exists ddi text default '55',
  add column if not exists documento text,
  add column if not exists tipo_documento text,
  add column if not exists nascimento date,
  add column if not exists sexo text,
  add column if not exists bloqueado boolean not null default false,
  add column if not exists descricao text;
