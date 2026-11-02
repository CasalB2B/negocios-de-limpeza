-- Função "revisor" (ex.: análise do app pela Meta): entra pelo login de administrador,
-- mas só enxerga a tela do WhatsApp e não carrega dados internos.
alter table public.app_users drop constraint app_users_role_check;
alter table public.app_users add constraint app_users_role_check check (role = any (array['CLIENT','COLLABORATOR','ADMIN','REVIEWER']));
