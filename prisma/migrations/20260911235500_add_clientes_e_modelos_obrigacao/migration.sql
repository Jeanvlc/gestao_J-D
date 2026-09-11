-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpjCpf" TEXT,
    "regimeTributario" TEXT NOT NULL,
    "cidade" TEXT,
    "estado" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeloObrigacao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tags" TEXT[],
    "diaVencimento" INTEGER NOT NULL,
    "periodicidade" TEXT NOT NULL DEFAULT 'mensal',
    "prioridade" TEXT NOT NULL DEFAULT 'normal',
    "regimeTributario" TEXT,
    "cidade" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeloObrigacao_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Obrigacao" ADD COLUMN     "clienteId" TEXT,
ADD COLUMN     "modeloId" TEXT,
ADD COLUMN     "competencia" TEXT;

-- CreateIndex
CREATE INDEX "Cliente_userId_idx" ON "Cliente"("userId");

-- CreateIndex
CREATE INDEX "Cliente_regimeTributario_idx" ON "Cliente"("regimeTributario");

-- CreateIndex
CREATE INDEX "ModeloObrigacao_userId_idx" ON "ModeloObrigacao"("userId");

-- CreateIndex
CREATE INDEX "ModeloObrigacao_regimeTributario_idx" ON "ModeloObrigacao"("regimeTributario");

-- CreateIndex
CREATE INDEX "Obrigacao_clienteId_idx" ON "Obrigacao"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Obrigacao_modeloId_clienteId_competencia_key" ON "Obrigacao"("modeloId", "clienteId", "competencia");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeloObrigacao" ADD CONSTRAINT "ModeloObrigacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obrigacao" ADD CONSTRAINT "Obrigacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obrigacao" ADD CONSTRAINT "Obrigacao_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "ModeloObrigacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
