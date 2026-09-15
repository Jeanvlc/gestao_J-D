-- DropIndex
DROP INDEX "ModeloObrigacao_regimeTributario_idx";

-- AlterTable
ALTER TABLE "ModeloObrigacao" DROP COLUMN "regimeTributario",
ADD COLUMN     "regimesTributarios" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Tarefa" ADD COLUMN     "checklist" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LancamentoFinanceiro" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "competencia" TEXT NOT NULL,
    "origem" TEXT,
    "pagamentoHonorarioId" TEXT,
    "clienteId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LancamentoFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Configuracao_userId_chave_key" ON "Configuracao"("userId", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "LancamentoFinanceiro_pagamentoHonorarioId_key" ON "LancamentoFinanceiro"("pagamentoHonorarioId");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_userId_idx" ON "LancamentoFinanceiro"("userId");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_competencia_idx" ON "LancamentoFinanceiro"("competencia");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_tipo_idx" ON "LancamentoFinanceiro"("tipo");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_clienteId_idx" ON "LancamentoFinanceiro"("clienteId");

-- AddForeignKey
ALTER TABLE "Configuracao" ADD CONSTRAINT "Configuracao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

