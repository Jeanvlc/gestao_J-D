-- 002: centros de custo. Rodar depois de migration.sql.
-- Cada máquina tem um centro de custo; cada comboio (tanque) atende um ou mais centros.
-- Comboio sem nenhum centro vinculado atende todas as máquinas.

create table va_centros_custo (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique,
  ativo boolean not null default true
);

alter table va_maquinas add column centro_custo_id uuid references va_centros_custo on delete set null;
alter table va_maquinas drop column tipo;

create table va_tanque_centros (
  tanque_id       uuid not null references va_tanques on delete cascade,
  centro_custo_id uuid not null references va_centros_custo on delete cascade,
  primary key (tanque_id, centro_custo_id)
);

alter table va_centros_custo  enable row level security;
alter table va_tanque_centros enable row level security;
revoke all on va_centros_custo, va_tanque_centros from anon;
grant select, insert, update, delete on va_centros_custo, va_tanque_centros to authenticated;

create policy centros_ler on va_centros_custo for select to authenticated
  using ((select va_papel()) is not null);
create policy centros_admin on va_centros_custo for all to authenticated
  using ((select va_is_admin())) with check ((select va_is_admin()));

create policy vinculos_ler on va_tanque_centros for select to authenticated
  using ((select va_papel()) is not null);
create policy vinculos_admin on va_tanque_centros for all to authenticated
  using ((select va_is_admin())) with check ((select va_is_admin()));

-- ponytail: a regra "comboio só abastece máquina do seu centro" é aplicada no app (lista filtrada).
-- Não é bloqueada no banco de propósito: um lançamento feito offline não pode ficar preso na fila
-- se o admin mudar os vínculos antes do envio.
