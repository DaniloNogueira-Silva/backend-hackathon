// src/chat/agendamento-chat.service.ts (VERSÃO CORRIGIDA E ROBUSTA)

import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    GoogleGenerativeAI,
    ChatSession,
    FunctionResponsePart,
    EnhancedGenerateContentResponse,
} from '@google/generative-ai';
import { MedicosService } from '../medicos/medicos.service';
import { ConsultasService } from '../consultas/consultas.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { consultaTool, buscaMedicoTool, horarioMedicoTool } from './utils';
import { extractFunctionCall, extractText } from './utils';
import { addDays, format, parseISO, subHours } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
import { ptBR } from 'date-fns/locale';
import { DiaDisponivel } from './interface/dia.disponivel.interface';

@Injectable()
export class AgendamentoChatService {
    private ai: GoogleGenerativeAI;
    private readonly modelName = 'gemini-1.5-flash';
    private chatSessions: Map<string, ChatSession> = new Map();

    private readonly agendamentoTools = {
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
        private readonly prisma: PrismaService,
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY não configurada no ambiente.');
        }
        this.ai = new GoogleGenerativeAI(apiKey);
    }

    private async getOrCreateChatSession(
        sessionId: string,
    ): Promise<ChatSession> {
        if (this.chatSessions.has(sessionId)) {
            return this.chatSessions.get(sessionId)!;
        }

        // --- PONTO CRÍTICO 1: PROMPT DE SISTEMA MELHORADO ---
        const systemInstruction = `
      Você é um assistente virtual especialista em AGENDAMENTO DE CONSULTAS MÉDICAS.
      Sua única tarefa é guiar o usuário pelo fluxo de agendamento de forma natural e precisa, mantendo o contexto da conversa.

      O fluxo OBRIGATÓRIO é:
      1.  Solicite e confirme o CPF do usuário. Guarde essa informação para o final.
      2.  Pergunte e confirme a especialidade médica ou nome do médico.
      3.  Use a função 'findByNomeOuEspecialidade' para listar os médicos.
      4.  Após o usuário escolher um médico, use 'getHorariosMedico' com o CRM do médico escolhido para mostrar a agenda.
      5.  Peça ao usuário para escolher um dia e horário.
      6.  Para finalizar, chame 'marcarConsulta' com o CRM, a data/hora, e O CPF do usuário informado no início.

      REGRAS FUNDAMENTAIS:
      - NÃO PULE ETAPAS.
      - NUNCA invente dados.
      - AO CHAMAR 'marcarConsulta', É OBRIGATÓRIO USAR O CPF INFORMADO NO PASSO 1.
      - Converta a data/hora para o formato ISO 8601 antes de chamar as funções.
    `;

        const chat = this.ai
            .getGenerativeModel({ model: this.modelName })
            .startChat({
                systemInstruction: {
                    role: 'system',
                    parts: [{ text: systemInstruction }],
                },
                tools: [this.agendamentoTools as any],
            });

        this.chatSessions.set(sessionId, chat);
        return chat;
    }

    async processarAgendamento(dto: ChatRequestDto): Promise<{ resposta: string }> {
        const chatSession = await this.getOrCreateChatSession(dto.sessionId);

        const result = await chatSession.sendMessage(dto.pergunta);
        let response: EnhancedGenerateContentResponse = result.response;

        // --- PONTO CRÍTICO 2: LOOP DE CONVERSA PARA MANTER O ESTADO ---
        // Este loop garante que a resposta da função seja enviada de volta para a IA.
        while (true) {
            const functionCall = extractFunctionCall(response);
            if (!functionCall) {
                break;
            }

            console.log(`[AgendamentoChatService] Função detectada: ${functionCall.name}`, functionCall.args);
            const toolResult = await this.executeFunctionCall(functionCall);

            const followUpResult = await chatSession.sendMessage([
                {
                    functionResponse: {
                        name: functionCall.name,
                        response: toolResult,
                    },
                } as FunctionResponsePart,
            ]);

            // Atualize a variável de resposta com a nova resposta da IA
            response = followUpResult.response;
        }
        const respostaFinal = extractText(response);

        await this.prisma.interacao.create({
            data: { pergunta: dto.pergunta, respostaIA: respostaFinal },
        });

        return { resposta: respostaFinal };
    }

    private async executeFunctionCall(functionCall: any): Promise<any> {
        const { name, args } = functionCall;

        switch (name) {
            case 'findByNomeOuEspecialidade': {
                const medicos = await this.medicosService.findByNomeOuEspecialidade(args.termo);
                if (!medicos || medicos.length === 0) {
                    return { error: `Nenhum médico encontrado para "${args.termo}".` };
                }
                // Retorna o objeto puro. A IA vai formatá-lo para o usuário.
                return { medicos };
            }

            case 'getHorariosMedico': {
                // O termo aqui pode ser o nome ou o CRM. A IA deve usar o CRM preferencialmente.
                const crm = args.termo;
                const medico = await this.medicosService.findByCRM(crm);
                if (!medico) {
                    return { error: `Não encontrei o médico com CRM ${crm}. Tente novamente.` };
                }
                return this.getHorariosPorCRM(crm);
            }

            case 'marcarConsulta': {
                const { crm, dataHoraInicio, termo } = args; // 'termo' DEVE ser o CPF
                if (!termo) {
                    return { error: "O CPF do paciente não foi informado. Não é possível agendar." };
                }
                const paciente = await this.usuarioService.findByDocumento(termo);
                const medico = await this.medicosService.findByCRM(crm);

                if (!paciente) return { error: `CPF "${termo}" não encontrado.` };
                if (!medico) return { error: `Médico com CRM "${crm}" não encontrado.` };

                const pacienteId = paciente.perfilPaciente?.id!;
                const medicoId = medico.perfilMedico?.id!;
                const dataComSubtracao = subHours(new Date(dataHoraInicio), 3);

                const consulta = await this.consultasService.create({
                    dataHoraInicio: dataComSubtracao.toISOString(),
                    pacienteId,
                    medicoId,
                });

                return { success: true, medico: medico.nome, data: dataHoraInicio, consultaId: consulta.id };
            }

            default:
                return { error: `Função desconhecida: ${name}` };
        }
    }

    // A função getHorariosPorCRM permanece a mesma
    private async getHorariosPorCRM(crm: string) {
        const medico = await this.medicosService.findByCRM(crm);
        if (!medico || !medico.perfilMedico) {
            throw new NotFoundException(`Médico com CRM ${crm} não encontrado.`);
        }

        const userId = medico.perfilMedico.id;
        const consultas = await this.consultasService.findAll(userId);
        const bookedStarts = (consultas ?? []).map((c: any) => c.dataHoraInicio.toISOString());

        const calendario = this.listarDisponiveis(bookedStarts);

        return {
            medico: {
                nome: medico.nome,
                crm: medico.perfilMedico.crm,
                especialidade: medico.perfilMedico.especialidade,
            },
            calendario,
        };
    }

    // A função listarDisponiveis permanece a mesma
    public listarDisponiveis(horariosIndisponiveis: string[] = []): DiaDisponivel[] {
        // ...código original sem alterações...
        const indisponiveisSet = new Set<string>();

        horariosIndisponiveis.forEach((dataIso) => {
            try {
                const dataObj = parseISO(dataIso);
                const chave = format(dataObj, 'yyyy-MM-dd HH:00');
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
                const chaveVerificacao = format(dataAtual, `yyyy-MM-dd ${horarioFormatado}`);

                if (!indisponiveisSet.has(chaveVerificacao)) {
                    horariosDoDia.push(horarioFormatado);
                }
            }

            if (horariosDoDia.length > 0) {
                agendaSeteDias.push({
                    data: format(dataAtual, 'yyyy-MM-dd'),
                    diaSemana: format(dataAtual, 'EEEE', { locale: ptBR }),
                    horarios: horariosDoDia,
                });
            }
        }
        return agendaSeteDias;
    }
}