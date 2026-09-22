-- AlterTable
ALTER TABLE "ModeloObrigacao" ADD COLUMN     "diaEnvioCliente" INTEGER;

-- AlterTable
ALTER TABLE "Obrigacao" ADD COLUMN     "dataEnvioCliente" TIMESTAMP(3);
