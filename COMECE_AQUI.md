# 🚀 COMECE AQUI - RESUMO RÁPIDO

## ⏱️ Tempo total: ~30 minutos

### ✅ Você vai receber 18 arquivos

---

## PASSO 1: Supabase (10 minutos)

1. Acesse: https://supabase.com
2. Clique: **"Sign In"** → **"Continue with GitHub"**
3. Clique: **"+ New project"**
4. Preencha:
   - **Name**: `maccontab-db`
   - **Database Password**: Gere senha forte (salve!)
   - **Region**: `East US (N. Virginia)`
5. Clique: **"Create new project"** (espera 2-3 min)
6. Menu esquerdo: **"Settings"** → **"Database"**
7. Aba: **"Prisma"**
8. **COPIE** a connection string inteira

---

## PASSO 2: Seu computador (5 minutos)

```bash
# 1. Criar pasta
mkdir maccontab-sistema
cd maccontab-sistema

# 2. Inicializar Git
git init

# 3. Copiar TODOS os 18 arquivos para aqui
# (você vai receber via download/arquivo)

# 4. Editar .env.local
# Abra o arquivo, encontre DATABASE_URL
# Substitua por aquela string que copiou do Supabase
# Exemplo:
# DATABASE_URL="postgresql://postgres:senha_forte@db.seu-projeto.supabase.co:5432/postgres"

# 5. Criar pastas (se não fez download com estrutura)
mkdir -p prisma src/{app/{api/{obrigacoes,processos},dashboard},lib}

# 6. Mover arquivos (renomear se necessário - ver MAPEAMENTO_ARQUIVOS.md)

# 7. Instalar
npm install

# 8. Criar tabelas
npx prisma migrate dev --name init
# Quando pedir, digite: init

# 9. Testar
npm run dev
# Abra: http://localhost:3000/dashboard
```

---

## PASSO 3: GitHub (5 minutos)

```bash
# Já dentro da pasta do projeto

# 1. Criar repositório no GitHub (vá em github.com)
# Nome: maccontab-sistema
# Deixe Public

# 2. De volta ao terminal:
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU-USUARIO/maccontab-sistema.git
git branch -M main
git push -u origin main

# (Pode pedir GitHub token - gere em github.com/settings/tokens)
```

---

## PASSO 4: Vercel (10 minutos)

1. Acesse: https://vercel.com/new
2. Clique: **"Import Git Repository"**
3. Procure: **"maccontab-sistema"**
4. Clique: **"Import"**
5. **Importante:** Adicione Environment Variable:
   - **Name**: `DATABASE_URL`
   - **Value**: (Cole aquela string do Supabase)
6. Clique: **"Add"**
7. Clique: **"Deploy"**
8. Espera 2-3 minutos

Pronto! Seu site está online! 🎉

---

## 📱 Resultado final

Você terá:
- ✅ **Seu site**: `https://maccontab-sistema.vercel.app`
- ✅ **Banco Supabase**: `https://supabase.com/dashboard`
- ✅ **GitHub**: `https://github.com/seu-usuario/maccontab-sistema`

---

## 📚 Arquivos de referência

Após começar:
1. **GUIA_SUPABASE_PASSO_A_PASSO.md** - Instruções detalhadas com screenshots
2. **MAPEAMENTO_ARQUIVOS.md** - Onde colocar cada arquivo
3. **README.md** - Documentação completa do sistema

---

## 🆘 Se algo der errado

### Erro: "Cannot reach database"
- Verifique `DATABASE_URL` em `.env.local`
- Copie novamente do Supabase (Settings → Database → Prisma)

### Erro: "Cannot find module"
- Rode: `npm install`
- Verifique estrutura de pastas em MAPEAMENTO_ARQUIVOS.md

### Vercel: "Build failed"
- Vá em Vercel → seu projeto → Settings → Environment Variables
- Adicione `DATABASE_URL` novamente
- Faça `git push` novamente

---

## 💡 Próximos passos

Depois que tudo funciona:
1. Adicionar autenticação
2. Criar mais processos e obrigações
3. Customizar design
4. Integrar com Organizze
5. Adicionar notificações

**Me chama que ajudo com qualquer parte!** 🚀

---

## ✅ Checklist final

- [ ] Criei conta Supabase
- [ ] Criei projeto Supabase
- [ ] Copiei CONNECTION STRING
- [ ] Copiei os 18 arquivos
- [ ] Editei `.env.local`
- [ ] Rodei `npm install`
- [ ] Rodei `npx prisma migrate dev --name init`
- [ ] Testei `npm run dev`
- [ ] Criei repositório GitHub
- [ ] Fiz `git push`
- [ ] Fiz deploy Vercel
- [ ] Site está online! 🎉
