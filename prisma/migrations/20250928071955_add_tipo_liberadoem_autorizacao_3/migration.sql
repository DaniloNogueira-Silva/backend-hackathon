/*
  Warnings:

  - The values [ADMIN] on the enum `Perfil` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `usuarioId` on the `autorizacoes_exame` table. All the data in the column will be lost.
  - You are about to drop the column `usuarioId` on the `consultas` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Perfil_new" AS ENUM ('PACIENTE', 'MEDICO');
ALTER TABLE "public"."usuarios" ALTER COLUMN "perfil" DROP DEFAULT;
ALTER TABLE "public"."usuarios" ALTER COLUMN "perfil" TYPE "public"."Perfil_new" USING ("perfil"::text::"public"."Perfil_new");
ALTER TYPE "public"."Perfil" RENAME TO "Perfil_old";
ALTER TYPE "public"."Perfil_new" RENAME TO "Perfil";
DROP TYPE "public"."Perfil_old";
ALTER TABLE "public"."usuarios" ALTER COLUMN "perfil" SET DEFAULT 'PACIENTE';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."autorizacoes_exame" DROP CONSTRAINT "autorizacoes_exame_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."consultas" DROP CONSTRAINT "consultas_usuarioId_fkey";

-- AlterTable
ALTER TABLE "public"."autorizacoes_exame" DROP COLUMN "usuarioId",
ADD COLUMN     "protocolo" TEXT;

-- AlterTable
ALTER TABLE "public"."consultas" DROP COLUMN "usuarioId";
