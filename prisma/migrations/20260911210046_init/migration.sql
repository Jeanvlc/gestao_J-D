-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obrigacao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "periodicidade" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "prioridade" TEXT NOT NULL DEFAULT 'normal',
    "cliente" TEXT,
    "tags" TEXT[],
    "linkDocumento" TEXT,
    "dataAtendimento" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obrigacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "descricaoDetalhada" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "responsavel" TEXT,
    "frequencia" TEXT,
    "tempoMedio" TEXT,
    "documentacao" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etapa" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "dataConclisao" TIMESTAMP(3),
    "notas" TEXT,
    "processoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataVencimento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "prioridade" TEXT NOT NULL DEFAULT 'normal',
    "categoria" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Obrigacao_userId_idx" ON "Obrigacao"("userId");

-- CreateIndex
CREATE INDEX "Obrigacao_vencimento_idx" ON "Obrigacao"("vencimento");

-- CreateIndex
CREATE INDEX "Obrigacao_status_idx" ON "Obrigacao"("status");

-- CreateIndex
CREATE INDEX "Processo_userId_idx" ON "Processo"("userId");

-- CreateIndex
CREATE INDEX "Processo_status_idx" ON "Processo"("status");

-- CreateIndex
CREATE INDEX "Etapa_processoId_idx" ON "Etapa"("processoId");

-- CreateIndex
CREATE INDEX "Tarefa_userId_idx" ON "Tarefa"("userId");

-- CreateIndex
CREATE INDEX "Tarefa_status_idx" ON "Tarefa"("status");

-- AddForeignKey
ALTER TABLE "Obrigacao" ADD CONSTRAINT "Obrigacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Etapa" ADD CONSTRAINT "Etapa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
