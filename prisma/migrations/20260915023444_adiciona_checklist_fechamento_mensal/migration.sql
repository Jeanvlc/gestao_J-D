-- CreateTable
CREATE TABLE "FechamentoMensal" (
    "id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "itens" JSONB NOT NULL,
    "justificativa" TEXT,
    "autorizadoPor" TEXT,
    "fechadoEm" TIMESTAMP(3),
    "clienteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FechamentoMensal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FechamentoMensal_userId_idx" ON "FechamentoMensal"("userId");

-- CreateIndex
CREATE INDEX "FechamentoMensal_competencia_idx" ON "FechamentoMensal"("competencia");

-- CreateIndex
CREATE INDEX "FechamentoMensal_status_idx" ON "FechamentoMensal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FechamentoMensal_clienteId_competencia_key" ON "FechamentoMensal"("clienteId", "competencia");

-- AddForeignKey
ALTER TABLE "FechamentoMensal" ADD CONSTRAINT "FechamentoMensal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FechamentoMensal" ADD CONSTRAINT "FechamentoMensal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

