/*
  Warnings:

  - Added the required column `liberado_em` to the `autorizacoes_exame` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo` to the `autorizacoes_exame` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."autorizacoes_exame" ADD COLUMN     "liberado_em" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "tipo" TEXT NOT NULL;
