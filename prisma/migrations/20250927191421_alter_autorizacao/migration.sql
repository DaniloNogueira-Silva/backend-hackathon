-- CreateEnum
CREATE TYPE "public"."StatusAutorizacao" AS ENUM ('PENDENTE', 'APROVADA', 'NEGADA');

-- CreateTable
CREATE TABLE "public"."autorizacoes_exame" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "exame" TEXT NOT NULL,
    "status" "public"."StatusAutorizacao" NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "medico_id" TEXT NOT NULL,
    "consulta_id" TEXT,
    "usuarioId" TEXT,
    "perfilPacienteId" TEXT,
    "perfilMedicoId" TEXT,

    CONSTRAINT "autorizacoes_exame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "autorizacoes_exame_codigo_key" ON "public"."autorizacoes_exame"("codigo");

-- AddForeignKey
ALTER TABLE "public"."autorizacoes_exame" ADD CONSTRAINT "autorizacoes_exame_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "public"."PerfilPaciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."autorizacoes_exame" ADD CONSTRAINT "autorizacoes_exame_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "public"."PerfilMedico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."autorizacoes_exame" ADD CONSTRAINT "autorizacoes_exame_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "public"."consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."autorizacoes_exame" ADD CONSTRAINT "autorizacoes_exame_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."autorizacoes_exame" ADD CONSTRAINT "autorizacoes_exame_perfilPacienteId_fkey" FOREIGN KEY ("perfilPacienteId") REFERENCES "public"."PerfilPaciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."autorizacoes_exame" ADD CONSTRAINT "autorizacoes_exame_perfilMedicoId_fkey" FOREIGN KEY ("perfilMedicoId") REFERENCES "public"."PerfilMedico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
