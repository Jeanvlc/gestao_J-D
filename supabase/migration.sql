-- V. A. Ribas — Fase 1 (comboio de diesel)
-- Rodar uma vez no SQL Editor do Supabase. Só cria objetos com prefixo va_.

-- ============ Tabelas ============

create table va_perfis (
  user_id   uuid primary key references auth.users on delete cascade,
  nome      text not null unique,
  papel     text not null check (papel in ('motorista', 'operador', 'admin')),
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

create table va_maquinas (
  id     uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome   text not null,
  tipo   text,
  ativo  boolean not null default true
);

create table va_tanques (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null unique,
  saldo_inicial      numeric(10,2) not null default 0,
  data_saldo_inicial timestamptz not null default now(),
  ativo              boolean not null default true
);

-- id gerado no celular: reenvio com o mesmo id nunca duplica
create table va_abastecimentos (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users,
  tanque_id      uuid not null references va_tanques,
  maquina_id     uuid not null references va_maquinas,
  data_hora      timestamptz not null,
  litros         numeric(10,2) not null check (litros > 0),
  horimetro      numeric(10,1) check (horimetro >= 0),
  km             numeric(10,1) check (km >= 0),
  observacao     text,
  criado_offline boolean not null default false,
  recebido_em    timestamptz not null default now()
);
create index on va_abastecimentos (maquina_id, data_hora);
create index on va_abastecimentos (tanque_id, data_hora);
create index on va_abastecimentos (user_id, data_hora);

create table va_tanque_movimentos (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users,
  tanque_id      uuid not null references va_tanques,
  tipo           text not null check (tipo in ('entrada', 'medicao')),
  litros         numeric(10,2) not null check (litros >= 0),
  nota_fiscal    text,
  data_hora      timestamptz not null,
  criado_offline boolean not null default false,
  recebido_em    timestamptz not null default now(),
  check (tipo = 'entrada' or nota_fiscal is null)
);
create index on va_tanque_movimentos (tanque_id, tipo, data_hora);
create index on va_tanque_movimentos (user_id, data_hora);

-- ============ Funções ============

-- papel do usuário logado, ou null se não tem perfil ativo
create function va_papel() returns text
language sql stable security definer set search_path = '' as $$
  select papel from public.va_perfis where user_id = (select auth.uid()) and ativo
$$;

create function va_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.va_papel() = 'admin', false)
$$;

-- saldo = inicial + entradas − abastecimentos, a partir da data do saldo inicial até p_ate
create function va_saldo_ate(p_tanque uuid, p_ate timestamptz) returns numeric
language sql stable security definer set search_path = '' as $$
  select t.saldo_inicial
    + coalesce((select sum(v.litros) from public.va_tanque_movimentos v
                where v.tanque_id = t.id and v.tipo = 'entrada'
                  and v.data_hora >= t.data_saldo_inicial and v.data_hora <= p_ate), 0)
    - coalesce((select sum(a.litros) from public.va_abastecimentos a
                where a.tanque_id = t.id
                  and a.data_hora >= t.data_saldo_inicial and a.data_hora <= p_ate), 0)
  from public.va_tanques t where t.id = p_tanque
$$;

-- Motorista só lê os próprios registros; saldo e últimas leituras precisam de todos.
-- Estas funções devolvem só os agregados.
create function va_saldos()
returns table (tanque_id uuid, saldo numeric, medicao_litros numeric, medicao_data timestamptz, medicao_diferenca numeric)
language sql stable security definer set search_path = '' as $$
  select t.id,
         public.va_saldo_ate(t.id, 'infinity'),
         m.litros, m.data_hora,
         m.litros - public.va_saldo_ate(t.id, m.data_hora)
  from public.va_tanques t
  left join lateral (
    select v.litros, v.data_hora from public.va_tanque_movimentos v
    where v.tanque_id = t.id and v.tipo = 'medicao'
    order by v.data_hora desc limit 1
  ) m on true
  where t.ativo and public.va_papel() is not null
$$;

create function va_ultimas_leituras()
returns table (maquina_id uuid, horimetro numeric, km numeric)
language sql stable security definer set search_path = '' as $$
  select a.maquina_id, max(a.horimetro), max(a.km)
  from public.va_abastecimentos a
  where public.va_papel() is not null
  group by a.maquina_id
$$;

revoke execute on function va_papel(), va_is_admin(), va_saldo_ate(uuid, timestamptz),
  va_saldos(), va_ultimas_leituras() from public, anon;
revoke execute on function va_saldo_ate(uuid, timestamptz) from authenticated;
grant execute on function va_papel(), va_is_admin(), va_saldos(), va_ultimas_leituras() to authenticated;

-- ============ RLS ============

alter table va_perfis            enable row level security;
alter table va_maquinas          enable row level security;
alter table va_tanques           enable row level security;
alter table va_abastecimentos    enable row level security;
alter table va_tanque_movimentos enable row level security;

revoke all on va_perfis, va_maquinas, va_tanques, va_abastecimentos, va_tanque_movimentos from anon;
grant select, insert, update, delete on va_perfis, va_maquinas, va_tanques, va_abastecimentos, va_tanque_movimentos to authenticated;

-- perfis: cada um lê o seu; admin lê todos. Escrita só pelo servidor (chave secreta).
create policy perfis_ler on va_perfis for select to authenticated
  using (user_id = (select auth.uid()) or (select va_is_admin()));

-- cadastros: qualquer usuário ativo lê; admin altera
create policy maquinas_ler on va_maquinas for select to authenticated
  using ((select va_papel()) is not null);
create policy maquinas_admin on va_maquinas for all to authenticated
  using ((select va_is_admin())) with check ((select va_is_admin()));

create policy tanques_ler on va_tanques for select to authenticated
  using ((select va_papel()) is not null);
create policy tanques_admin on va_tanques for all to authenticated
  using ((select va_is_admin())) with check ((select va_is_admin()));

-- lançamentos: usuário ativo insere só em nome próprio e lê só os seus; admin lê e apaga.
-- Sem política de UPDATE: o app envia com "ON CONFLICT DO NOTHING" (upsert ignoreDuplicates),
-- então reenviar é inofensivo e um registro enviado não muda mais.
create policy abast_inserir on va_abastecimentos for insert to authenticated
  with check (user_id = (select auth.uid()) and (select va_papel()) is not null);
create policy abast_ler on va_abastecimentos for select to authenticated
  using (user_id = (select auth.uid()) or (select va_is_admin()));
create policy abast_apagar on va_abastecimentos for delete to authenticated
  using ((select va_is_admin()));

create policy mov_inserir on va_tanque_movimentos for insert to authenticated
  with check (user_id = (select auth.uid()) and (select va_papel()) is not null);
create policy mov_ler on va_tanque_movimentos for select to authenticated
  using (user_id = (select auth.uid()) or (select va_is_admin()));
create policy mov_apagar on va_tanque_movimentos for delete to authenticated
  using ((select va_is_admin()));

-- ============ Dados iniciais ============

-- ajuste nome, saldo inicial e data no painel (Máquinas e tanques)
insert into va_tanques (nome) values ('Comboio');
