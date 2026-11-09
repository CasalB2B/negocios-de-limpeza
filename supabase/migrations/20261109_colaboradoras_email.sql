-- Professional's e-mail in the RH profile (also her app login); filled from existing logins.
alter table public.colaboradoras_rh add column if not exists email text;
update public.colaboradoras_rh r set email = u.email
from public.app_users u
where u.role = 'COLLABORATOR' and u.company_id = r.company_id and lower(trim(u.name)) = lower(trim(r.nome))
  and r.email is null and u.email is not null;
