-- 003: trava das tabelas do sistema antigo, motorista preso a um comboio, admin edita lançamentos.
-- Rodar depois de migration_002_centros_custo.sql.

-- Tabelas do sistema antigo (MacContab): dados preservados, acesso público fechado.
-- Só quem usa a conexão direta do banco (ex.: Prisma) continua acessando.
-- Ignore este bloco se o seu banco não tiver essas tabelas.
alter table "User" enable row level security;
alter table "Cliente" enable row level security;
alter table "ModeloObrigacao" enable row level security;
alter table "Obrigacao" enable row level security;
alter table "Processo" enable row level security;
alter table "Etapa" enable row level security;
alter table "Tarefa" enable row level security;
alter table "_prisma_migrations" enable row level security;
alter table "Honorario" enable row level security;
alter table "PagamentoHonorario" enable row level security;
alter table "FechamentoMensal" enable row level security;
alter table "Configuracao" enable row level security;
alter table "LancamentoFinanceiro" enable row level security;

-- Motorista preso a um comboio (opcional; sem comboio, ele escolhe entre os ativos)
alter table va_perfis add column tanque_id uuid references va_tanques on delete set null;

create function va_meu_tanque() returns uuid
language sql stable security definer set search_path = '' as $$
  select tanque_id from public.va_perfis where user_id = (select auth.uid()) and ativo
$$;
revoke execute on function va_meu_tanque() from public, anon;
grant execute on function va_meu_tanque() to authenticated;

-- Admin pode corrigir lançamentos
create policy abast_editar on va_abastecimentos for update to authenticated
  using ((select va_is_admin())) with check ((select va_is_admin()));
create policy mov_editar on va_tanque_movimentos for update to authenticated
  using ((select va_is_admin())) with check ((select va_is_admin()));
