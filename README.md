# MacContab - Sistema de Gestão Contábil

Sistema completo para gerenciar obrigações, processos e tarefas do seu escritório contábil.

## 🎯 Features

✅ Dashboard com estatísticas em tempo real  
✅ Gestão de obrigações com vencimentos  
✅ Controle de processos com etapas  
✅ Filtros por status, prioridade e tags  
✅ Interface escura e moderna  
✅ Deploy gratuito (Vercel + Supabase)  

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Git
- Conta GitHub
- Conta Supabase (gratuita)
- Conta Vercel (gratuita)

## 🚀 Começar em 10 minutos

### 1️⃣ Configurar Supabase
Siga **EXATAMENTE** o arquivo: `GUIA_SUPABASE_PASSO_A_PASSO.md`

Este guia tem screenshots e instruções passo a passo para:
- Criar conta Supabase
- Gerar banco de dados PostgreSQL
- Obter CONNECTION STRING
- Configurar variáveis de ambiente
- Fazer deploy no Vercel

### 2️⃣ Instalar dependências localmente
```bash
npm install
```

### 3️⃣ Criar tabelas
```bash
npx prisma migrate dev --name init
```

### 4️⃣ Rodar localmente
```bash
npm run dev
```

Abra: http://localhost:3000/dashboard

### 5️⃣ Deploy no Vercel
1. Faça push para GitHub
2. Acesse vercel.com/new
3. Importe seu repositório
4. Adicione variáveis de ambiente
5. Deploy!

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   ├── obrigacoes/        # API REST de obrigações
│   │   └── processos/         # API REST de processos
│   ├── dashboard/             # Página principal
│   └── layout.tsx
├── lib/
│   └── db.ts                  # Conexão Prisma
└── components/                # Componentes React

prisma/
└── schema.prisma              # Schema do banco de dados
```

## 🔌 API Endpoints

### Obrigações
- `GET /api/obrigacoes` - Listar todas
- `POST /api/obrigacoes` - Criar nova
- `PUT /api/obrigacoes` - Atualizar
- `DELETE /api/obrigacoes` - Deletar

### Processos
- `GET /api/processos` - Listar todos
- `POST /api/processos` - Criar novo
- `PUT /api/processos` - Atualizar
- `DELETE /api/processos` - Deletar

## 🛠️ Comandos úteis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar em produção
npm start

# Abrir interface do banco de dados
npm run prisma:studio

# Rodar migrations
npm run prisma:migrate

# Sincronizar schema com banco
npm run prisma:push
```

## 📊 Banco de dados

Tabelas principais:
- `User` - Usuários do sistema
- `Obrigacao` - Obrigações fiscais e administrativas
- `Processo` - Processos contábeis com etapas
- `Etapa` - Etapas dentro de cada processo
- `Tarefa` - Tarefas rápidas

## 🔐 Autenticação

Atualmente, o sistema usa `x-user-id` no header das requisições.

Para implementar autenticação real, recomendo:
- NextAuth.js
- Supabase Auth
- Firebase Auth

## 🎨 Customização

### Cores
Altere em `tailwind.config.ts`

### Fonts
Altere em `src/app/layout.tsx`

### Componentes
Edite em `src/components/`

## 🆘 Troubleshooting

### Erro: "Cannot reach database"
Verifique sua `DATABASE_URL` em `.env.local`

### Erro: "Column does not exist"
Rode: `npx prisma migrate dev`

### Vercel build failed
Verifique se `DATABASE_URL` está nas Environment Variables do Vercel

## 📞 Suporte

Qualquer dúvida, me chame que ajudo!

## 📄 Licença

MIT - Livre para usar e modificar

---

**Importante**: Leia o `GUIA_SUPABASE_PASSO_A_PASSO.md` antes de começar!
