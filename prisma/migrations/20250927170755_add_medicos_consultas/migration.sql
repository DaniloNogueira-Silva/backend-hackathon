-- CreateEnum
CREATE TYPE "public"."StatusConsulta" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "public"."Perfil" ADD VALUE 'MEDICO';

-- CreateTable
CREATE TABLE "public"."PerfilMedico" (
    "id" TEXT NOT NULL,
    "crm" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "PerfilMedico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consultas" (
    "id" TEXT NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "status" "public"."StatusConsulta" NOT NULL DEFAULT 'AGENDADA',
    "anotacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "medico_id" TEXT NOT NULL,

    CONSTRAINT "consultas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PerfilMedico_crm_key" ON "public"."PerfilMedico"("crm");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilMedico_usuario_id_key" ON "public"."PerfilMedico"("usuario_id");

-- AddForeignKey
ALTER TABLE "public"."PerfilMedico" ADD CONSTRAINT "PerfilMedico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consultas" ADD CONSTRAINT "consultas_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consultas" ADD CONSTRAINT "consultas_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
