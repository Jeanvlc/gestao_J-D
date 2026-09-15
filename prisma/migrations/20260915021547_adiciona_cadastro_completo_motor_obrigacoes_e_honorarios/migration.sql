-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "atividadePrincipal" TEXT,
ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "dataAbertura" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "inscricaoEstadual" TEXT,
ADD COLUMN     "inscricaoMunicipal" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "nomeFantasia" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "possuiFuncionarios" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "possuiIcms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "possuiRetencoes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "razaoSocial" TEXT,
ADD COLUMN     "responsavel" TEXT,
ADD COLUMN     "situacaoCadastral" TEXT,
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "tipoPessoa" TEXT NOT NULL DEFAULT 'juridica';

-- AlterTable
ALTER TABLE "ModeloObrigacao" ADD COLUMN     "estado" TEXT,
ADD COLUMN     "requerFuncionarios" BOOLEAN,
ADD COLUMN     "requerIcms" BOOLEAN,
ADD COLUMN     "requerRetencoes" BOOLEAN;

-- CreateTable
CREATE TABLE "Honorario" (
    "id" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "clienteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Honorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoHonorario" (
    "id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "dataPagamento" TIMESTAMP(3),
    "observacoes" TEXT,
    "honorarioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagamentoHonorario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Honorario_userId_idx" ON "Honorario"("userId");

-- CreateIndex
CREATE INDEX "Honorario_clienteId_idx" ON "Honorario"("clienteId");

-- CreateIndex
CREATE INDEX "PagamentoHonorario_userId_idx" ON "PagamentoHonorario"("userId");

-- CreateIndex
CREATE INDEX "PagamentoHonorario_vencimento_idx" ON "PagamentoHonorario"("vencimento");

-- CreateIndex
CREATE INDEX "PagamentoHonorario_status_idx" ON "PagamentoHonorario"("status");

-- CreateIndex
CREATE INDEX "PagamentoHonorario_clienteId_idx" ON "PagamentoHonorario"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoHonorario_honorarioId_competencia_key" ON "PagamentoHonorario"("honorarioId", "competencia");

-- AddForeignKey
ALTER TABLE "Honorario" ADD CONSTRAINT "Honorario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honorario" ADD CONSTRAINT "Honorario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoHonorario" ADD CONSTRAINT "PagamentoHonorario_honorarioId_fkey" FOREIGN KEY ("honorarioId") REFERENCES "Honorario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoHonorario" ADD CONSTRAINT "PagamentoHonorario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoHonorario" ADD CONSTRAINT "PagamentoHonorario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

