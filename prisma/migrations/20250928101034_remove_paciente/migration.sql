/*
  Warnings:

  - You are about to drop the column `paciente_id` on the `autorizacoes_exame` table. All the data in the column will be lost.
  - You are about to drop the column `perfilPacienteId` on the `autorizacoes_exame` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."autorizacoes_exame" DROP CONSTRAINT "autorizacoes_exame_paciente_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."autorizacoes_exame" DROP CONSTRAINT "autorizacoes_exame_perfilPacienteId_fkey";

-- AlterTable
ALTER TABLE "public"."autorizacoes_exame" DROP COLUMN "paciente_id",
DROP COLUMN "perfilPacienteId";
