# 🚀 GUIA COMPLETO - SUPABASE + VERCEL

## ⚡ PASSO 1: Criar conta e projeto no Supabase

### 1.1 Acessar Supabase
1. Abra: https://supabase.com
2. Clique em **"Sign In"** (canto superior direito)
3. Escolha: **"Continue with GitHub"** (mais fácil)
   - Autorize o Supabase
4. Você vai ser redirecionado ao dashboard

### 1.2 Criar novo projeto
1. No dashboard, clique em **"+ New project"**
2. Preencha:
   - **Name**: `maccontab-db` (ou qualquer nome)
   - **Database Password**: Gere uma senha forte (salve em lugar seguro!)
   - **Region**: Deixe `East US (N. Virginia)` ou escolha mais próximo
3. Clique **"Create new project"**
4. ⏳ Aguarde 2-3 minutos enquanto Supabase cria tudo

### 1.3 Copiar CONNECTION STRING
1. Quando terminar, você vai ver a página do projeto
2. No menu esquerdo, clique em **"Settings"**
3. Clique em **"Database"**
4. Procure por **"Connection string"**
5. Mude para a aba **"Prisma"**
6. **COPIE TUDO** (vai parecer assim):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.seu-projeto.supabase.co:5432/postgres
   ```
7. Troque `[YOUR-PASSWORD]` pela senha que você criou em 1.2

---

## ⚡ PASSO 2: Setup local no seu computador

### 2.1 Criar pasta do projeto
```bash
# No terminal, em uma pasta que você escolher
mkdir meu-projeto
cd meu-projeto
```

### 2.2 Copiar os arquivos que você recebeu
Você recebeu estes arquivos:
- `schema.prisma` → Colar em `./prisma/schema.prisma`
- `package.json` → Colar na raiz
- `.env.local` → Colar na raiz
- `lib-db.ts` → Colar em `./src/lib/db.ts`
- `app-api-obrigacoes.ts` → Colar em `./src/app/api/obrigacoes/route.ts`
- `app-api-processos.ts` → Colar em `./src/app/api/processos/route.ts`
- `dashboard-page.tsx` → Colar em `./src/app/dashboard/page.tsx`

**Estrutura final:**
```
meu-projeto/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── obrigacoes/
│   │   │   │   └── route.ts
│   │   │   └── processos/
│   │   │       └── route.ts
│   │   └── dashboard/
│   │       └── page.tsx
│   └── lib/
│       └── db.ts
├── package.json
└── .env.local
```

### 2.3 Editar `.env.local`
1. Abra o arquivo `.env.local`
2. Substitua esta linha:
   ```
   DATABASE_URL="postgresql://postgres:sua_senha_aqui@sua-instancia.supabase.co:5432/postgres"
   ```
3. Cole a connection string que você copiou em 1.3:
   ```
   DATABASE_URL="postgresql://postgres:senha_forte@db.maccontab.supabase.co:5432/postgres"
   ```

### 2.4 Instalar dependências
```bash
npm install
```

### 2.5 Criar tabelas no Supabase
```bash
# Isso vai criar todas as tabelas no seu banco de dados
npx prisma migrate dev --name init
```

**O terminal vai perguntar:**
```
✔ Enter a name for this migration … init
```

Apenas aperte ENTER ou escreva `init`

✅ Pronto! As tabelas foram criadas no Supabase

### 2.6 Testar localmente
```bash
npm run dev
```

Abra: http://localhost:3000/dashboard

---

## ⚡ PASSO 3: Deploy no Vercel

### 3.1 Subir para GitHub
1. Abra seu GitHub: https://github.com
2. Crie um novo repositório:
   - Nome: `maccontab-sistema`
   - Descrição: "Sistema de gestão contábil"
   - Deixe como **Public** ou **Private** (você escolhe)
   - Clique: **Create repository**

### 3.2 Fazer push do código
```bash
# No terminal, dentro da pasta do projeto
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/maccontab-sistema.git
git branch -M main
git push -u origin main
```

**Vai pedir seu GitHub token**, se pedir:
1. Vá em: https://github.com/settings/tokens
2. Clique: **Generate new token (classic)**
3. Marque: `repo` (todos os boxes dentro dele)
4. Clique: **Generate token**
5. **COPIE O TOKEN** e cole no terminal quando pedir

### 3.3 Fazer deploy na Vercel
1. Abra: https://vercel.com/new
2. Clique: **Import Git Repository**
3. Procure e selecione: **maccontab-sistema**
4. Clique: **Import**

### 3.4 Configurar variáveis de ambiente
1. Em **Environment Variables**, adicione:
   - **Name**: `DATABASE_URL`
   - **Value**: Cola a CONNECTION STRING do Supabase (aquela que você copiou em 1.3)
   - Clique: **Add**

2. Clique: **Deploy**

⏳ Aguarde 2-3 minutos enquanto Vercel faz o deploy...

### 3.5 Rodar migrations no Vercel (importante!)
```bash
# No seu computador, no terminal:
vercel env pull
npx prisma migrate deploy
```

✅ **PRONTO!** Seu sistema está online!

---

## ✅ CHECKLIST FINAL

- [ ] Criei conta no Supabase
- [ ] Criei projeto no Supabase
- [ ] Copiei CONNECTION STRING do Supabase
- [ ] Editei `.env.local` com a conexão
- [ ] Rodei `npm install`
- [ ] Rodei `npx prisma migrate dev --name init`
- [ ] Testei localmente em `http://localhost:3000/dashboard`
- [ ] Criei repositório no GitHub
- [ ] Fiz push do código (`git push`)
- [ ] Fiz deploy no Vercel
- [ ] Rodei `npx prisma migrate deploy` via Vercel
- [ ] Acessei meu site em `seu-projeto.vercel.app`

---

## 🔗 Seus links importantes

Após tudo pronto, você terá:

1. **Dashboard do Supabase**: https://supabase.com/dashboard
2. **Seu banco de dados**: https://supabase.com/dashboard/project/seu-projeto
3. **Dashboard Vercel**: https://vercel.com/dashboard
4. **Seu site**: `https://maccontab-sistema.vercel.app` (ou outro nome que você escolheu)

---

## 🆘 ERROS COMUNS

### ❌ "Error: column does not exist"
**Causa**: Schema não foi sincronizado
**Solução**: 
```bash
npx prisma migrate dev --name fix
```

### ❌ "Cannot reach database server"
**Causa**: CONNECTION STRING errada
**Solução**:
1. Copie novamente do Supabase (Settings → Database → Prisma)
2. Edite `.env.local`
3. Salve o arquivo
4. Rode `npm run dev` novamente

### ❌ "Vercel: Build failed"
**Causa**: Variáveis de ambiente não configuradas no Vercel
**Solução**:
1. Vá em Vercel → seu projeto → Settings → Environment Variables
2. Adicione `DATABASE_URL` novamente
3. Faça novo push: `git push`
4. Vercel vai refazer o deploy automaticamente

---

## 📞 Próximos passos

Depois que tudo está funcionando:
1. ✅ Criar autenticação de usuário
2. ✅ Adicionar mais funcionalidades
3. ✅ Customizar o design
4. ✅ Integrar com Organizze ou outro sistema

Só me chamar que você ajudo com cada parte!
