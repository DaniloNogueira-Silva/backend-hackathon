-- DropForeignKey
ALTER TABLE "public"."consultas" DROP CONSTRAINT "consultas_medico_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."consultas" DROP CONSTRAINT "consultas_paciente_id_fkey";

-- AlterTable
ALTER TABLE "public"."consultas" ADD COLUMN     "perfilMedicoId" TEXT,
ADD COLUMN     "usuarioId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."consultas" ADD CONSTRAINT "consultas_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "public"."PerfilPaciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consultas" ADD CONSTRAINT "consultas_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "public"."PerfilMedico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consultas" ADD CONSTRAINT "consultas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consultas" ADD CONSTRAINT "consultas_perfilMedicoId_fkey" FOREIGN KEY ("perfilMedicoId") REFERENCES "public"."PerfilMedico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
