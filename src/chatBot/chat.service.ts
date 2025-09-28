import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { MedicosService } from '../medicos/medicos.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { FluxoPasso } from '@prisma/client';

import {
  extractText,
  extractFunctionCall,
  buscaMedicoTool,
  horarioMedicoTool,
  montarCalendarioDisponivel,
  montarCalendarioDisponivelPorConsultas,
  consultaTool,
} from './utils';
import { ConsultasService } from 'src/consultas/consultas.service';
import { DiaDisponivel } from './interface/dia.disponivel.interface';
import { ptBR } from 'date-fns/locale';
import { addDays, format, parseISO, subHours } from 'date-fns';
import { console } from 'inspector';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Injectable()
export class ChatService {
  private ai: GoogleGenerativeAI;
  private readonly modelName = 'gemini-2.5-flash';
  private chatSessions: Map<string, ChatSession> = new Map();

  private readonly medicoTools = {
    functionDeclarations: [
      ...buscaMedicoTool.functionDeclarations,
      ...horarioMedicoTool.functionDeclarations,
      ...consultaTool.functionDeclarations,
    ],
  };

  constructor(
    private configService: ConfigService,
    private readonly medicosService: MedicosService,
    private readonly consultasService: ConsultasService,
    private readonly usuarioService: UsuariosService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada no ambiente.');
    }
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  private formatContextToPrompt(passos: FluxoPasso[]): string {
    let contexto = 'Fluxo de Processo Detalhado:\n\n';

    const passosOrdenados = passos.sort(
      (a, b) => a.numeroPasso - b.numeroPasso,
    );

    for (const passo of passosOrdenados) {
      contexto += `PASSO ${passo.numeroPasso}: ${passo.descricaoAcao}
- QUEM: ${passo.quemAtor}
- DETALHE: ${passo.comoDetalhe}
`;

      if (passo.isDecisao) {
        contexto += `- DECISÃO: Sim -> Passo ${passo.passoSimId} | Não -> Passo ${passo.passoNaoId}\n`;
      } else if (passo.proximoPassoId) {
        contexto += `- PRÓXIMO: Passo ${passo.proximoPassoId}\n`;
      } else {
        contexto += `- PRÓXIMO: FIM DO PROCESSO\n`;
      }
      contexto += '\n';
    }

    return contexto.trim();
  }

  public async generateSessionName(pergunta: string): Promise<string> {
    try {
      const prompt = `Gere um nome para esta conversa, que seja conciso (máximo 5 palavras) e baseado na seguinte pergunta: "${pergunta}". O nome deve ser em português e relevante ao assunto.`;

      const response = await this.ai
        .getGenerativeModel({ model: 'gemini-2.5-flash' }) // Pode-se usar o mesmo modelo ou um mais leve
        .generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

      let nomeGerado = response.response
        .text()
        .trim()
        .replace(/^['"]|['"]$/g, '');

      // Trunca para garantir um tamanho máximo
      const palavras = nomeGerado.split(/\s+/);
      if (palavras.length > 5) {
        nomeGerado = palavras.slice(0, 5).join(' ');
      }

      return (
        nomeGerado.charAt(0).toUpperCase() + nomeGerado.slice(1).toLowerCase()
      );
    } catch (error) {
      console.error('Erro ao gerar nome da sessão:', error);
      return 'Nova Conversa';
    }
  }

  private async getOrCreateChatSession(
    sessionId: string,
    contexto: string,
  ): Promise<ChatSession> {
    if (this.chatSessions.has(sessionId)) {
      return this.chatSessions.get(sessionId)!;
    }

    const systemInstruction = `
Você é um especialista em descrever fluxos de trabalho e processos E também um assistente capaz de buscar informações de agendamento.
Sua tarefa é responder a todas as perguntas do usuário.
1. Para perguntas sobre **fluxos de trabalho**, responda **APENAS** baseada no CONTEXTO ESTRUTURADO a seguir.
2. Para perguntas sobre **agendamento/busca de médico**, utilize a função \`findByNomeOuEspecialidade\` para consultar o banco de dados.
Sua resposta deve ser amigável, concisa e levar em conta o histórico da conversa.
Sempre será o beneficiário quem faz as perguntas.
Não fale o número do passo.

REGRAS DE CLASSIFICAÇÃO DE FLUXO:
- Se a pergunta for CLARA sobre um único processo (ex: "Quero 2ª via"), responda diretamente usando APENAS os passos daquele processo.
- Se a pergunta for AMBÍGUA ou genérica de fluxo, você DEVE pedir esclarecimento (ex: liste as opções de fluxos relevantes).
REGRAS IMPORTANTES DO AGENDAMENTO:
- Se o usuário informar apenas mês/dia e hora (ex.: "29-09 às 11"), ASSUMA o ano atual (${new Date().getFullYear()}).
- Sempre converta a data/hora para formato ISO 8601 antes de responder ou chamar funções.
- Sempre que o usuário quiser marcar uma consulta, peça o cpf dele antes.


--- CONTEXTO ESTRUTURADO DO FLUXO ---
${contexto}
--- FIM DO CONTEXTO ---
`;

    const chat = this.ai
      .getGenerativeModel({ model: this.modelName })
      .startChat({
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }],
        },
        tools: [this.medicoTools as any],
      });

    this.chatSessions.set(sessionId, chat);
    return chat;
  }

  async getCalendarioDisponivelPorNomeOuEspecialidade(termo: string) {
    const medicos = await this.medicosService.findByNomeOuEspecialidade(termo);
    if (!medicos || medicos.length === 0) {
      return { mensagem: `Nenhum médico encontrado para "${termo}".` };
    }

    const resultados: any[] = [];

    for (const medico of medicos) {
      const crm = medico.perfilMedico?.crm;
      if (!crm) continue;

      const medicoDetalhe = await this.medicosService.findByCRM(crm);
      const userId = medicoDetalhe?.perfilMedico?.id;
      if (!userId) continue;

      const consultas = await this.consultasService.findAll(userId);
      const bookedStarts: (Date | string)[] = (consultas ?? []).map(
        (c: any) => c.data_hora_inicio ?? c.dataHoraInicio,
      );

      const calendario = montarCalendarioDisponivel(bookedStarts, 30, 10, 8);

      resultados.push({
        medico: {
          id: medico.id,
          nome: medico.nome,
          crm: medico.perfilMedico?.crm,
          especialidade: medico.perfilMedico?.especialidade,
        },
        calendario,
      });
    }

    return { resultados };
  }

  async getHorariosPorCRM(crm: string) {
    const medico = await this.medicosService.findByCRM(crm);
    if (!medico) {
      return { mensagem: `Nenhum médico encontrado com CRM ${crm}.` };
    }

    const userId = medico.perfilMedico?.id;
    if (!userId)
      throw new NotFoundException(
        'Não foi possível identificar o usuário do médico.',
      );

    const consultas = await this.consultasService.findAll(userId);
    const bookedStarts: (Date | string)[] = (consultas ?? []).map(
      (c: any) => c.data_hora_inicio ?? c.dataHoraInicio,
    );

    const calendario = montarCalendarioDisponivel(bookedStarts, 30, 10, 8);

    return {
      medico: {
        nome: medico.nome,
        crm: medico.perfilMedico?.crm,
        especialidade: medico.perfilMedico?.especialidade,
      },
      calendario,
    };
  }

  public listarDisponiveis(
    horariosIndisponiveis: string[] = [],
  ): DiaDisponivel[] {
    const indisponiveisSet = new Set<string>();

    horariosIndisponiveis.forEach((dataIso) => {
      try {
        const dataObj = parseISO(dataIso);

        const ano = dataObj.getUTCFullYear();
        const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
        const dia = String(dataObj.getUTCDate()).padStart(2, '0');
        const hora = String(dataObj.getUTCHours()).padStart(2, '0');
        const chave = `${ano}-${mes}-${dia} ${hora}:00`;

        indisponiveisSet.add(chave);
      } catch (error) {
        console.error(`Data inválida recebida: ${dataIso}`);
      }
    });

    const hoje = new Date();
    const agendaSeteDias: DiaDisponivel[] = [];

    for (let i = 0; i < 7; i++) {
      const dataAtual = addDays(hoje, i);
      const horariosDoDia: string[] = [];

      for (let hora = 8; hora <= 13; hora++) {
        const horarioFormatado = `${String(hora).padStart(2, '0')}:00`;

        // --- PASSO 2: VERIFICAÇÃO ---
        // Cria a mesma chave para o horário que estamos gerando agora.
        const chaveVerificacao = format(
          dataAtual,
          `yyyy-MM-dd ${horarioFormatado}`,
        );

        // Adiciona o horário à lista apenas se ele NÃO estiver no Set de indisponíveis.
        if (!indisponiveisSet.has(chaveVerificacao)) {
          horariosDoDia.push(horarioFormatado);
        }
      }

      // Adiciona o dia à agenda somente se ele ainda tiver horários disponíveis.
      // (Opcional, mas evita retornar dias completamente lotados).
      if (horariosDoDia.length > 0) {
        agendaSeteDias.push({
          data: format(dataAtual, 'yyyy-MM-dd'),
          diaSemana: format(dataAtual, 'EEEE', { locale: ptBR }),
          horarios: horariosDoDia,
        });
      }
    }
    console.log('agendaSeteDias', agendaSeteDias);

    return agendaSeteDias;
  }

  async generateResponse(dto: ChatRequestDto): Promise<{ resposta: string }> {
    const todosPassos = await this.prisma.fluxoPasso.findMany({});

    if (todosPassos.length === 0) {
      throw new NotFoundException('Nenhum passo de fluxo encontrado.');
    }

    const contextoFormatado = this.formatContextToPrompt(todosPassos);
    const chatSession = await this.getOrCreateChatSession(
      dto.sessionId,
      contextoFormatado,
    );

    let initialResponse: any;
    try {
      initialResponse = await chatSession.sendMessage(dto.pergunta);
    } catch (error) {
      console.error('Erro na chamada Gemini:', error);
      throw new Error('Falha na comunicação com a IA.');
    }

    const functionCall = extractFunctionCall(initialResponse);
    let respostaIA = '';
    console.log('functionCall', functionCall);

    if (functionCall && functionCall.name === 'findByNomeOuEspecialidade') {
      const termo = functionCall.args.termo as string;

      const medicos =
        await this.medicosService.findByNomeOuEspecialidade(termo);

      if (!medicos || medicos.length === 0) {
        respostaIA = `Nenhum médico encontrado para "${termo}".`;
      } else {
        const lista = medicos
          .map((m: any) => `${m.nome} (CRM: ${m.perfilMedico.crm})`)
          .join(', ');
        respostaIA = `Temos os seguintes médicos disponíveis para ${termo}: ${lista}.`;
      }
    } else if (functionCall && functionCall.name === 'getHorariosMedico') {
      const termo = functionCall.args.termo as string;

      let medico = await this.medicosService.findByCRM(termo);

      if (!medico) {
        const medicos =
          await this.medicosService.findByNomeOuEspecialidade(termo);
        medico = medicos && medicos.length > 0 ? medicos[0] : null;
      }

      if (!medico) {
        respostaIA = `Não encontrei nenhum médico com "${termo}".`;
      } else {
        const userId = medico.perfilMedico?.id!;
        const consultas = await this.consultasService.findAll(userId);
        console.log('consultas', consultas);

        const bookedStarts = (consultas ?? []).map((c: any) =>
          c.dataHoraInicio.toISOString(),
        );
        console.log('bookedStarts', bookedStarts);

        const calendario = this.listarDisponiveis(bookedStarts);
        respostaIA = JSON.stringify(
          {
            medico: {
              nome: medico.nome,
              crm: medico.perfilMedico?.crm,
              especialidade: medico.perfilMedico?.especialidade,
            },
            calendario,
          },
          null,
          2,
        );
      }
    } else if (functionCall && functionCall.name === 'marcarConsulta') {
      const { crm, dataHoraInicio } = functionCall.args;
      const termo = functionCall.args.termo as string;

      const paciente = await this.usuarioService.findByDocumento(termo);
      const pacienteId = paciente?.perfilPaciente?.id!;
      const medico = await this.medicosService.findByCRM(crm);

      if (!medico) {
        respostaIA = `Não encontrei médico com CRM ${crm}.`;
      } else {
        const medicoId = medico.perfilMedico?.id;
        if (!medicoId) {
          respostaIA = `Não consegui identificar o médico com CRM ${crm}.`;
        } else {
          const dataOriginal = new Date(dataHoraInicio);

          const dataComSubtracao = subHours(dataOriginal, 3);

          const consulta = await this.consultasService.create({
            dataHoraInicio: dataComSubtracao.toISOString(),
            pacienteId,
            medicoId,
          });

          respostaIA = `Consulta marcada com sucesso com Dr(a). ${medico.nome}, CRM ${crm}, para ${dataHoraInicio}.`;
        }
      }
    } else {
      respostaIA = extractText(initialResponse);
    }

    await this.prisma.interacao.create({
      data: { pergunta: dto.pergunta, respostaIA },
    });

    return { resposta: respostaIA };
  }
}
