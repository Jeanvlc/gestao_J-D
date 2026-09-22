-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "clienteDesde" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ModeloObrigacao" ADD COLUMN     "proximoModeloId" TEXT;

-- AlterTable
ALTER TABLE "Tarefa" ADD COLUMN     "clienteId" TEXT,
ADD COLUMN     "etapaChave" TEXT,
ADD COLUMN     "grupoSocietarioId" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'padrao';

-- CreateIndex
CREATE INDEX "Tarefa_clienteId_idx" ON "Tarefa"("clienteId");

-- CreateIndex
CREATE INDEX "Tarefa_grupoSocietarioId_idx" ON "Tarefa"("grupoSocietarioId");

-- AddForeignKey
ALTER TABLE "ModeloObrigacao" ADD CONSTRAINT "ModeloObrigacao_proximoModeloId_fkey" FOREIGN KEY ("proximoModeloId") REFERENCES "ModeloObrigacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
