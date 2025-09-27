/*
  Warnings:

  - You are about to drop the column `data_hora` on the `consultas` table. All the data in the column will be lost.
  - Added the required column `data_hora_fim` to the `consultas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data_hora_inicio` to the `consultas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."consultas" DROP COLUMN "data_hora",
ADD COLUMN     "data_hora_fim" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "data_hora_inicio" TIMESTAMP(3) NOT NULL;
