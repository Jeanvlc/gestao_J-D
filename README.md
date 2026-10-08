# V. A. Ribas — App de campo

PWA para celular, feito para funcionar **sem internet**. Fase 1: abastecimento do comboio de diesel.
Next.js 14 + Supabase + IndexedDB (Dexie). Deploy na Vercel.

## Como funciona o offline

- Todo lançamento é gravado primeiro no aparelho (IndexedDB) com um id (UUID) gerado no celular.
- O envio acontece ao abrir o app, quando a conexão volta, quando o app volta do segundo plano e no botão **Enviar agora**.
  Se falhar, o app tenta de novo sozinho (5 s, 10 s, 20 s… até 5 min). Não usa Background Sync.
- O envio é `INSERT … ON CONFLICT (id) DO NOTHING`: reenviar nunca duplica, e só sai da fila o que o servidor confirmou.
- Máquinas, tanques, últimas leituras e saldos são baixados e ficam guardados no aparelho.
- **O primeiro login de cada aparelho precisa de internet.** Depois disso o app abre sem sinal.

## 1. Banco (Supabase)

O banco já recebeu as migrations. Para outro projeto, rode no SQL Editor, nesta ordem:
`supabase/migration.sql` e depois `supabase/migration_002_centros_custo.sql`.

Em **Authentication → Sign In / Providers**:
- desligue **Allow new users to sign up** (os usuários são criados pelo painel);
- deixe **Leaked password protection** desligado: PINs de 6 dígitos seriam recusados.

## 2. Primeiro usuário admin

1. Supabase → **Authentication → Users → Add user → Create new user**
   - e-mail: o nome em minúsculas, sem acento, com pontos no lugar dos espaços, + `@va-ribas.local`
     (ex.: "Jean Victor" → `jean.victor@va-ribas.local`)
   - senha: o PIN de 6 dígitos
   - marque **Auto Confirm User**
2. SQL Editor:
   ```sql
   insert into va_perfis (user_id, nome, papel)
   select id, 'Jean Victor', 'admin' from auth.users where email = 'jean.victor@va-ribas.local';
   ```
3. Entre no app com nome **Jean Victor** e o PIN. Os demais usuários são criados em **Painel → Usuários**.

## 3. Vercel

1. Envie o repositório para o GitHub → vercel.com → **Add New → Project** → importe o repositório (Next.js é detectado sozinho).
2. **Settings → Environment Variables**:

   | Variável | Onde pegar |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (publishable) |
   | `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys (secret). **Nunca expor.** |
   | `CRON_SECRET` | qualquer texto aleatório longo (ex.: `openssl rand -hex 24`) |

3. Deploy. O cron diário (`vercel.json`, 11:00 UTC) chama `/api/cron/keepalive` e faz uma consulta leve,
   para o plano gratuito do Supabase não pausar por inatividade.

## 4. Primeiro uso

1. Painel → **Centros de custo**: cadastre os centros e marque quais cada comboio atende.
   Comboio sem nenhum centro marcado vê todas as máquinas.
2. Painel → **Máquinas e comboios**: ajuste o "Comboio" (saldo inicial e data) e cadastre as máquinas
   (prefixo, nome e centro de custo).
3. No celular, abra o endereço da Vercel, faça login e instale o app:
   - Android/Chrome: menu ⋮ → **Instalar app**
   - iPhone/Safari: Compartilhar → **Adicionar à Tela de Início**
4. Com internet, toque em **Enviar** uma vez para baixar os cadastros.

## Backup

O plano gratuito não tem backup automático: use **Painel → Backup completo** (todas as tabelas em um .xlsx) com frequência.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:3000 (service worker só funciona em `npm run build && npm start`)
npm test         # cálculo de saldo, L/h, km/L, validações e sincronização idempotente
```

Variáveis locais em `.env` (mesmos nomes da tabela acima).

## Fase 2 (produção dos operadores)

A fila e o envio são genéricos por tabela (`src/lib/db.ts` → `Tabela`). Para a Fase 2: criar `va_producoes`
com o mesmo padrão (id UUID do celular, RLS de insert/select próprio), acrescentar o nome em `Tabela`
e uma aba nova em `src/app/page.tsx`.

## Estrutura

```
supabase/migration.sql      tabelas, funções, RLS
public/sw.js                service worker (cache do app)
src/lib/db.ts               banco local (fila + cadastros)
src/lib/sync.ts             envio/baixa, tentativas automáticas
src/lib/calc.ts             saldo, L/h, km/L, validações
src/lib/format.ts           datas e números pt-BR, fuso de SP
src/app/page.tsx, telas.tsx app do campo (Abastecer, Tanque, Histórico)
src/app/admin/              painel (saldos, consumo, lista, Excel, cadastros, usuários)
src/app/api/                criação de usuários (chave secreta) e cron
tests/                      vitest
```
