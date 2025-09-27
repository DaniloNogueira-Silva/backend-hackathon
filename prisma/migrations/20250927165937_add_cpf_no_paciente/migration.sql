/*
  Warnings:

  - A unique constraint covering the columns `[cpf]` on the table `PerfilPaciente` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cpf` to the `PerfilPaciente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."PerfilPaciente" ADD COLUMN     "cpf" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PerfilPaciente_cpf_key" ON "public"."PerfilPaciente"("cpf");
