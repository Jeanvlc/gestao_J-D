-- 004: Fase 2 — produção dos operadores (hectares por serviço) e paradas.
-- Rodar depois da 003. Mesmo padrão do abastecimento: id gerado no celular, reenvio nunca duplica.

create table va_servicos (id uuid primary key default gen_random_uuid(), nome text not null unique, ativo boolean not null default true);
create table va_locais (
  id uuid primary key default gen_random_uuid(), nome text not null unique, ativo boolean not null default true,
  centro_custo_id uuid references va_centros_custo on delete set null
);
create table va_motivos_parada (id uuid primary key default gen_random_uuid(), nome text not null unique, ativo boolean not null default true);

create table va_producoes (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users,
  data_hora      timestamptz not null,
  maquina_id     uuid not null references va_maquinas,
  servico_id     uuid not null references va_servicos,
  local_id       uuid not null references va_locais,
  hectares       numeric(10,2) not null check (hectares > 0),
  observacao     text,
  criado_offline boolean not null default false,
  recebido_em    timestamptz not null default now()
);
create index on va_producoes (data_hora);
create index on va_producoes (user_id, data_hora);
create index on va_producoes (maquina_id, data_hora);

create table va_paradas (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users,
  data_hora      timestamptz not null,
  maquina_id     uuid not null references va_maquinas,
  motivo_id      uuid not null references va_motivos_parada,
  minutos        integer not null check (minutos > 0 and minutos <= 1440),
  observacao     text,
  criado_offline boolean not null default false,
  recebido_em    timestamptz not null default now()
);
create index on va_paradas (data_hora);
create index on va_paradas (user_id, data_hora);

alter table va_servicos enable row level security;
alter table va_locais enable row level security;
alter table va_motivos_parada enable row level security;
alter table va_producoes enable row level security;
alter table va_paradas enable row level security;
revoke all on va_servicos, va_locais, va_motivos_parada, va_producoes, va_paradas from anon;
grant select, insert, update, delete on va_servicos, va_locais, va_motivos_parada, va_producoes, va_paradas to authenticated;

-- cadastros: usuário ativo lê, admin altera
create policy servicos_ler on va_servicos for select to authenticated using ((select va_papel()) is not null);
create policy servicos_admin on va_servicos for all to authenticated using ((select va_is_admin())) with check ((select va_is_admin()));
create policy locais_ler on va_locais for select to authenticated using ((select va_papel()) is not null);
create policy locais_admin on va_locais for all to authenticated using ((select va_is_admin())) with check ((select va_is_admin()));
create policy motivos_ler on va_motivos_parada for select to authenticated using ((select va_papel()) is not null);
create policy motivos_admin on va_motivos_parada for all to authenticated using ((select va_is_admin())) with check ((select va_is_admin()));

-- lançamentos: insere só em nome próprio; lê os próprios (admin lê tudo); só admin edita/apaga
create policy prod_inserir on va_producoes for insert to authenticated with check (user_id = (select auth.uid()) and (select va_papel()) is not null);
create policy prod_ler on va_producoes for select to authenticated using (user_id = (select auth.uid()) or (select va_is_admin()));
create policy prod_editar on va_producoes for update to authenticated using ((select va_is_admin())) with check ((select va_is_admin()));
create policy prod_apagar on va_producoes for delete to authenticated using ((select va_is_admin()));
create policy par_inserir on va_paradas for insert to authenticated with check (user_id = (select auth.uid()) and (select va_papel()) is not null);
create policy par_ler on va_paradas for select to authenticated using (user_id = (select auth.uid()) or (select va_is_admin()));
create policy par_editar on va_paradas for update to authenticated using ((select va_is_admin())) with check ((select va_is_admin()));
create policy par_apagar on va_paradas for delete to authenticated using ((select va_is_admin()));

-- sugestões iniciais (ajuste no painel)
insert into va_servicos (nome) values ('Subsolagem'), ('Gradagem'), ('Aração'), ('Roçada'), ('Coveamento'), ('Plantio'), ('Adubação');
insert into va_motivos_parada (nome) values ('Chuva'), ('Quebra / manutenção'), ('Aguardando peça'), ('Abastecimento'), ('Sem serviço'), ('Outro');
