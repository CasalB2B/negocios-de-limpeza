-- Financeiro (modelo Mobills): contas bancárias, cartões de crédito, categorias e lançamentos.
-- Tudo por empresa (company_id) e visível só para o administrador da empresa.
-- Entradas automáticas: pagamento confirmado pela InfinitePay (tabela transactions) e
-- pagamento/adiantamento de colaboradora registrado no RH (tabela collab_payments).

create table if not exists fin_contas (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default coalesce(minha_empresa(), 1) references empresas(id),
  nome text not null,
  tipo text not null default 'BANCO' check (tipo in ('BANCO','CARTEIRA','INFINITEPAY','INVESTIMENTO','OUTRO')),
  banco text,
  cor text not null default '#7c3aed',
  saldo_inicial numeric(12,2) not null default 0,
  padrao boolean not null default false,
  arquivada boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists fin_cartoes (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default coalesce(minha_empresa(), 1) references empresas(id),
  nome text not null,
  bandeira text,
  cor text not null default '#0f766e',
  limite numeric(12,2) not null default 0,
  dia_fechamento integer not null check (dia_fechamento between 1 and 31),
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  conta_pagamento_id uuid references fin_contas(id) on delete set null,
  arquivado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists fin_categorias (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default coalesce(minha_empresa(), 1) references empresas(id),
  nome text not null,
  tipo text not null check (tipo in ('RECEITA','DESPESA')),
  cor text not null default '#64748b',
  sistema text,  -- categorias usadas pelas entradas automáticas: 'SERVICOS', 'EQUIPE'
  created_at timestamptz not null default now(),
  unique (company_id, tipo, nome)
);

-- tipo: RECEITA, DESPESA, TRANSFERENCIA (conta → conta_destino) e PAGAMENTO_FATURA (conta → cartão).
-- Despesa no cartão: cartao_id preenchido, conta_id vazio, fatura_mes = 1º dia do mês de vencimento.
create table if not exists fin_lancamentos (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default coalesce(minha_empresa(), 1) references empresas(id),
  tipo text not null check (tipo in ('RECEITA','DESPESA','TRANSFERENCIA','PAGAMENTO_FATURA')),
  descricao text not null,
  valor numeric(12,2) not null check (valor > 0),
  data date not null,
  pago boolean not null default false,
  conta_id uuid references fin_contas(id) on delete cascade,
  conta_destino_id uuid references fin_contas(id) on delete cascade,
  cartao_id uuid references fin_cartoes(id) on delete cascade,
  fatura_mes date,
  categoria_id uuid references fin_categorias(id) on delete set null,
  grupo_id uuid,            -- parcelas de uma compra ou repetições de uma conta fixa
  parcela_num integer,
  parcela_total integer,
  origem text not null default 'MANUAL' check (origem in ('MANUAL','INFINITEPAY','SERVICO','COLABORADORA')),
  referencia text,          -- id de origem (transação InfinitePay, serviço, pagamento de colaboradora)
  observacao text,
  created_at timestamptz not null default now()
);
create unique index if not exists fin_lancamentos_referencia on fin_lancamentos (company_id, origem, referencia) where referencia is not null;
create index if not exists fin_lancamentos_data on fin_lancamentos (company_id, data);
create index if not exists fin_lancamentos_fatura on fin_lancamentos (cartao_id, fatura_mes);

alter table fin_contas enable row level security;
alter table fin_cartoes enable row level security;
alter table fin_categorias enable row level security;
alter table fin_lancamentos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fin_contas','fin_cartoes','fin_categorias','fin_lancamentos'] loop
    execute format('drop policy if exists admin_empresa on %I', t);
    execute format($p$create policy admin_empresa on %I for all to authenticated
      using (company_id = minha_empresa() and meu_papel() in ('ADMIN','FINANCEIRO'))
      with check (company_id = minha_empresa() and meu_papel() in ('ADMIN','FINANCEIRO'))$p$, t);
  end loop;
end $$;

-- Categorias e conta padrão de uma empresa (idempotente). Chamada pelo app na primeira abertura.
create or replace function fin_preparar_empresa(p_empresa integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_empresa is null then return; end if;
  insert into fin_categorias (company_id, nome, tipo, cor, sistema) values
    (p_empresa, 'Serviços de limpeza', 'RECEITA', '#0d9488', 'SERVICOS'),
    (p_empresa, 'Outras receitas', 'RECEITA', '#65a30d', null),
    (p_empresa, 'Equipe (diárias e salários)', 'DESPESA', '#7c3aed', 'EQUIPE'),
    (p_empresa, 'Produtos e materiais', 'DESPESA', '#0ea5e9', null),
    (p_empresa, 'Transporte', 'DESPESA', '#f59e0b', null),
    (p_empresa, 'Anúncios e marketing', 'DESPESA', '#ec4899', null),
    (p_empresa, 'Plataformas e assinaturas', 'DESPESA', '#ef4444', null),
    (p_empresa, 'Telefonia e internet', 'DESPESA', '#14b8a6', null),
    (p_empresa, 'Impostos e taxas', 'DESPESA', '#78716c', null),
    (p_empresa, 'Equipamentos', 'DESPESA', '#6366f1', null),
    (p_empresa, 'Cursos e capacitação', 'DESPESA', '#a855f7', null),
    (p_empresa, 'Eventos e confraternização', 'DESPESA', '#f97316', null),
    (p_empresa, 'Outras despesas', 'DESPESA', '#94a3b8', null)
  on conflict (company_id, tipo, nome) do nothing;
  if not exists (select 1 from fin_contas where company_id = p_empresa and tipo = 'INFINITEPAY') then
    insert into fin_contas (company_id, nome, tipo, banco, cor, padrao)
    values (p_empresa, 'InfinitePay', 'INFINITEPAY', 'infinitepay', '#16a34a',
            not exists (select 1 from fin_contas where company_id = p_empresa and padrao));
  end if;
end $$;

create or replace function fin_minha_empresa_preparar()
returns void language plpgsql security definer set search_path = public as $$
begin
  if meu_papel() in ('ADMIN','FINANCEIRO') then perform fin_preparar_empresa(minha_empresa()); end if;
end $$;
grant execute on function fin_minha_empresa_preparar() to authenticated;
revoke execute on function fin_preparar_empresa(integer) from public, anon, authenticated;

-- Pagamento confirmado pela InfinitePay → receita paga na conta InfinitePay da empresa.
create or replace function fin_receita_infinitepay()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conta uuid; v_cat uuid;
begin
  if new.type <> 'INCOME' or coalesce(new.status, '') <> 'PAID' or coalesce(new.amount, 0) <= 0 then return new; end if;
  perform fin_preparar_empresa(new.company_id);
  select id into v_conta from fin_contas where company_id = new.company_id and tipo = 'INFINITEPAY' and not arquivada order by created_at limit 1;
  select id into v_cat from fin_categorias where company_id = new.company_id and sistema = 'SERVICOS' limit 1;
  insert into fin_lancamentos (company_id, tipo, descricao, valor, data, pago, conta_id, categoria_id, origem, referencia, observacao)
  values (new.company_id, 'RECEITA',
          trim(coalesce(new.entity, 'Cliente') || ' — ' || coalesce(new.service_type, 'serviço')),
          new.amount, (now() at time zone 'America/Sao_Paulo')::date, true, v_conta, v_cat, 'INFINITEPAY', new.id, new.method)
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists fin_receita_infinitepay on transactions;
create trigger fin_receita_infinitepay after insert on transactions for each row execute function fin_receita_infinitepay();

-- Pagamento ou adiantamento de colaboradora (RH) → despesa paga na conta padrão.
create or replace function fin_despesa_colaboradora()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conta uuid; v_cat uuid; v_nome text;
begin
  if coalesce(new.valor, 0) <= 0 then return new; end if;
  perform fin_preparar_empresa(new.company_id);
  select id into v_conta from fin_contas where company_id = new.company_id and not arquivada order by padrao desc, created_at limit 1;
  select id into v_cat from fin_categorias where company_id = new.company_id and sistema = 'EQUIPE' limit 1;
  select nome into v_nome from colaboradoras_rh where id = new.collab_id;
  insert into fin_lancamentos (company_id, tipo, descricao, valor, data, pago, conta_id, categoria_id, origem, referencia, observacao)
  values (new.company_id, 'DESPESA',
          (case when new.tipo = 'ADIANTAMENTO' then 'Adiantamento — ' else 'Pagamento — ' end) || coalesce(v_nome, 'colaboradora')
            || coalesce(' (' || new.mes_referencia || ')', ''),
          new.valor, coalesce(new.data, current_date), true, v_conta, v_cat, 'COLABORADORA', new.id::text, new.observacao)
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists fin_despesa_colaboradora on collab_payments;
create trigger fin_despesa_colaboradora after insert on collab_payments for each row execute function fin_despesa_colaboradora();

-- Pagamento de colaboradora apagado no RH → some também do financeiro.
create or replace function fin_despesa_colaboradora_apagada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from fin_lancamentos where company_id = old.company_id and origem = 'COLABORADORA' and referencia = old.id::text;
  return old;
end $$;
drop trigger if exists fin_despesa_colaboradora_apagada on collab_payments;
create trigger fin_despesa_colaboradora_apagada after delete on collab_payments for each row execute function fin_despesa_colaboradora_apagada();

select fin_preparar_empresa(id) from empresas;

-- Telas do Financeiro atualizam sozinhas quando entra um lançamento automático.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='fin_lancamentos') then
    alter publication supabase_realtime add table fin_lancamentos;
  end if;
end $$;

-- Lançamentos trazidos de planilha / Mobills (referencia 'imp:<lote>:<chave da linha>' permite desfazer e evitar repetidos).
alter table fin_lancamentos drop constraint if exists fin_lancamentos_origem_check;
alter table fin_lancamentos add constraint fin_lancamentos_origem_check check (origem in ('MANUAL','INFINITEPAY','SERVICO','COLABORADORA','IMPORTACAO'));
