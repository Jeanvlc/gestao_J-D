# 📋 MAPEAMENTO COMPLETO DE ARQUIVOS

## 🎯 Onde copiar cada arquivo

### Root do projeto (raiz)
```
seu-projeto/
├── package.json                    ← Copiar aqui
├── tsconfig.json                   ← Copiar aqui
├── tailwind.config.ts              ← Copiar aqui
├── postcss.config.js               ← Copiar aqui
├── next.config.js                  ← Copiar aqui
├── vercel.json                     ← Copiar aqui
├── .env.local                      ← Copiar aqui (EDITAR!)
├── .gitignore                      ← Copiar aqui
├── README.md                       ← Copiar aqui
└── GUIA_SUPABASE_PASSO_A_PASSO.md ← Copiar aqui
```

### Pasta prisma/
```
seu-projeto/prisma/
└── schema.prisma                   ← schema.prisma vai aqui
```

### Pasta src/lib/
```
seu-projeto/src/lib/
└── db.ts                           ← lib-db.ts vai aqui (RENOMEAR!)
```

### Pasta src/app/
```
seu-projeto/src/app/
├── layout.tsx                      ← app-layout.tsx vai aqui (RENOMEAR!)
└── globals.css                     ← globals.css vai aqui
```

### Pasta src/app/api/obrigacoes/
```
seu-projeto/src/app/api/obrigacoes/
└── route.ts                        ← app-api-obrigacoes.ts vai aqui (RENOMEAR!)
```

### Pasta src/app/api/processos/
```
seu-projeto/src/app/api/processos/
└── route.ts                        ← app-api-processos.ts vai aqui (RENOMEAR!)
```

### Pasta src/app/dashboard/
```
seu-projeto/src/app/dashboard/
└── page.tsx                        ← dashboard-page.tsx vai aqui (RENOMEAR!)
```

---

## 📋 Checklist de arquivos

Arquivos que você deve ter recebido:
- [x] schema.prisma
- [x] package.json
- [x] .env.local
- [x] lib-db.ts
- [x] app-api-obrigacoes.ts
- [x] app-api-processos.ts
- [x] dashboard-page.tsx
- [x] tailwind.config.ts
- [x] globals.css
- [x] app-layout.tsx
- [x] next.config.js
- [x] postcss.config.js
- [x] vercel.json
- [x] .gitignore
- [x] tsconfig.json
- [x] README.md
- [x] GUIA_SUPABASE_PASSO_A_PASSO.md
- [x] MAPEAMENTO_ARQUIVOS.md

**Total: 18 arquivos**

---

## ⚠️ IMPORTANTE: Renomeações necessárias

Alguns arquivos têm prefixos para não conflitar. Você PRECISA renomear:

| Arquivo Original      | Novo Nome   | Pasta               |
|----------------------|-------------|---------------------|
| `lib-db.ts`          | `db.ts`     | `src/lib/`          |
| `app-layout.tsx`     | `layout.tsx`| `src/app/`          |
| `app-api-obrigacoes.ts` | `route.ts` | `src/app/api/obrigacoes/` |
| `app-api-processos.ts`  | `route.ts` | `src/app/api/processos/`  |
| `dashboard-page.tsx` | `page.tsx`  | `src/app/dashboard/`|
| `globals.css`        | `globals.css` | `src/app/`        |

---

## 🎬 Passo a passo rápido

### 1. Criar estrutura de pastas
```bash
mkdir -p seu-projeto/{prisma,src/{app/{api/{obrigacoes,processos},dashboard},lib}}
cd seu-projeto
```

### 2. Copiar arquivos de raiz
Copie para a raiz (`seu-projeto/`):
- package.json
- tsconfig.json
- tailwind.config.ts
- postcss.config.js
- next.config.js
- vercel.json
- .env.local
- .gitignore
- README.md
- GUIA_SUPABASE_PASSO_A_PASSO.md

### 3. Copiar arquivos organizados
```
schema.prisma → prisma/schema.prisma
lib-db.ts → src/lib/db.ts (RENOMEAR)
app-layout.tsx → src/app/layout.tsx (RENOMEAR)
globals.css → src/app/globals.css
app-api-obrigacoes.ts → src/app/api/obrigacoes/route.ts (RENOMEAR)
app-api-processos.ts → src/app/api/processos/route.ts (RENOMEAR)
dashboard-page.tsx → src/app/dashboard/page.tsx (RENOMEAR)
```

### 4. Editar `.env.local`
Abra o arquivo `.env.local` e substitua:
```
DATABASE_URL="sua_connection_string_do_supabase_aqui"
```

### 5. Instalar e testar
```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

---

## 🔄 Estrutura final esperada

```
seu-projeto/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── obrigacoes/
│   │   │   │   └── route.ts
│   │   │   └── processos/
│   │   │       └── route.ts
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   └── lib/
│       └── db.ts
├── .env.local
├── .gitignore
├── README.md
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
├── GUIA_SUPABASE_PASSO_A_PASSO.md
└── MAPEAMENTO_ARQUIVOS.md
```

---

## ✅ Quando tudo está no lugar

Se você seguiu corretamente:
1. `npm install` não gera erro
2. `npx prisma migrate dev` cria as tabelas
3. `npm run dev` abre em `http://localhost:3000/dashboard`
4. Dashboard carrega sem erros de banco de dados

Se qualquer coisa não funcionar, verifique:
- ✅ Nomes dos arquivos estão corretos?
- ✅ Pastas criadas estão no lugar?
- ✅ `.env.local` tem a CONNECTION STRING certa?
- ✅ Supabase foi criado e banco foi gerado?

Me chama que ajudo! 🚀
