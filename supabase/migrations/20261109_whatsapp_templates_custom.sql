-- Templates created by the company in the panel (besides the ones the system uses).
alter table public.whatsapp_templates add column if not exists body text, add column if not exists custom boolean not null default false;
