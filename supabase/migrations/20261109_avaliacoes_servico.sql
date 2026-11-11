-- Client reviews tied to the cleaning (service) and the client.
alter table public.avaliacoes_clientes
  add column if not exists service_id text,
  add column if not exists client_id text;
create index if not exists avaliacoes_clientes_service_idx on public.avaliacoes_clientes (service_id);
create index if not exists avaliacoes_clientes_client_idx on public.avaliacoes_clientes (client_id);
