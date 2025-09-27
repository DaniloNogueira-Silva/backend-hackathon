import { PrismaClient } from '@prisma/client';

// Inicializa o cliente Prisma
const prisma = new PrismaClient();

// Dados do seu primeiro fluxo (Fluxo de Atualização de Dados)
const fluxoAtualizacaoDados = [
  // Passo 1: Início
  {
    numeroPasso: 1,
    descricaoAcao: 'Fornecer as informações necessárias',
    quemAtor: 'Beneficiário',
    comoDetalhe: 'CPF, dados a serem atualizados (dados pessoais ou endereço)',
    isDecisao: false,
    proximoPassoId: 2,
    passoSimId: null,
    passoNaoId: null,
  },
  // Passo 2: Enviar Doc
  {
    numeroPasso: 2,
    descricaoAcao: 'Enviar documentação comprobatória',
    quemAtor: 'Beneficiário',
    comoDetalhe: 'Anexar',
    isDecisao: false,
    proximoPassoId: 3,
    passoSimId: null,
    passoNaoId: null,
  },
  // Passo 3: Decisão
  {
    numeroPasso: 3,
    descricaoAcao: 'Verificar Informações',
    quemAtor: 'Atendimento',
    comoDetalhe: 'Conferir documentos',
    isDecisao: true,
    proximoPassoId: null,
    passoSimId: 4, // SIM -> Realizar atualização
    passoNaoId: 5, // NÃO -> Informar beneficiário
  },
  // Passo 4: Fim SIM
  {
    numeroPasso: 4,
    descricaoAcao: 'Realizar atualização',
    quemAtor: 'Atendimento',
    comoDetalhe: 'Via CRM',
    isDecisao: false,
    proximoPassoId: null,
    passoSimId: null,
    passoNaoId: null,
  },
  // Passo 5: Fim NÃO
  {
    numeroPasso: 5,
    descricaoAcao: 'Informar beneficiário',
    quemAtor: 'Atendimento',
    comoDetalhe: 'Via whatsapp',
    isDecisao: false,
    proximoPassoId: null,
    passoSimId: null,
    passoNaoId: null,
  },
];

async function main() {
  console.log(`Iniciando o seeding...`);

  // Deleta dados existentes para evitar duplicidade (opcional)
  await prisma.fluxoPasso.deleteMany();
  console.log(`Registros FluxoPasso existentes deletados.`);
  
  // Insere os dados do novo fluxo
  for (const passoData of fluxoAtualizacaoDados) {
    const passo = await prisma.fluxoPasso.create({
      data: passoData,
    });
    console.log(`Criado passo com ID: ${passo.id} - ${passo.descricaoAcao}`);
  }

  console.log(`Seeding concluído.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });