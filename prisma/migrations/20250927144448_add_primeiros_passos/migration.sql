-- CreateEnum
CREATE TYPE "public"."Perfil" AS ENUM ('ADMIN', 'PACIENTE');

-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" "public"."Perfil" NOT NULL DEFAULT 'PACIENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PerfilPaciente" (
    "id" TEXT NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "numero_prontuario" TEXT NOT NULL,
    "telefone_contato" TEXT,
    "endereco" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "PerfilPaciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fluxo_passo" (
    "id" SERIAL NOT NULL,
    "numeroPasso" INTEGER NOT NULL,
    "descricaoAcao" TEXT NOT NULL,
    "quemAtor" TEXT NOT NULL,
    "comoDetalhe" TEXT NOT NULL,
    "proximoPassoId" INTEGER,
    "isDecisao" BOOLEAN NOT NULL DEFAULT false,
    "passoSimId" INTEGER,
    "passoNaoId" INTEGER,

    CONSTRAINT "fluxo_passo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."interacoes_chat" (
    "id" SERIAL NOT NULL,
    "pergunta" TEXT NOT NULL,
    "respostaIA" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacoes_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolProcedimento" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "terminologia" TEXT NOT NULL,
    "correlacao" BOOLEAN,
    "procedimento" TEXT,
    "resolucao_normativa" TEXT,
    "vigencia" TEXT,
    "od" TEXT,
    "amb" TEXT,
    "hco" TEXT,
    "hso" TEXT,
    "pac" TEXT,
    "dut" TEXT,
    "subgrupo" TEXT,
    "grupo" TEXT,
    "capitulo" TEXT,
    "tipo" VARCHAR(20) NOT NULL,

    CONSTRAINT "RolProcedimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilPaciente_numero_prontuario_key" ON "public"."PerfilPaciente"("numero_prontuario");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilPaciente_usuario_id_key" ON "public"."PerfilPaciente"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "fluxo_passo_numeroPasso_key" ON "public"."fluxo_passo"("numeroPasso");

-- AddForeignKey
ALTER TABLE "public"."PerfilPaciente" ADD CONSTRAINT "PerfilPaciente_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
