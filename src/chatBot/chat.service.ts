// src/chatBot/chat.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { MedicosService } from '../medicos/medicos.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { FluxoPasso } from '@prisma/client';

// Utils centralizados (helpers + tool)
import { extractText, extractFunctionCall, buscaMedicoTool } from './utils';

@Injectable()
export class ChatService {
  private ai: GoogleGenerativeAI;
  private readonly modelName = 'gemini-2.5-flash';
  private chatSessions: Map<string, ChatSession> = new Map();

  // Mantemos a tool como propriedade pra reutilizar
  private readonly medicoTool = buscaMedicoTool;

  constructor(
    private configService: ConfigService,
    private readonly medicosService: MedicosService,
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
        // Passa a tool; se seu TS for exigente, pode fazer "as any"
        tools: [this.medicoTool as any],
      });

    this.chatSessions.set(sessionId, chat);
    return chat;
  }

  async generateResponse(dto: ChatRequestDto): Promise<{ resposta: string }> {
    const todosPassos = await this.prisma.fluxoPasso.findMany({});
    if (todosPassos.length === 0) {
      throw new NotFoundException(
        'Nenhum passo de fluxo encontrado no banco de dados para usar como contexto.',
      );
    }

    const contextoFormatado = this.formatContextToPrompt(todosPassos);

    const chatSession = await this.getOrCreateChatSession(
      dto.sessionId,
      contextoFormatado,
    );

    // 1) Primeira chamada ao Gemini
    let initialResponse: any;
    try {
      initialResponse = await chatSession.sendMessage(dto.pergunta);
    } catch (error) {
      console.error('Erro na primeira chamada ao Gemini:', error);
      throw new Error('Falha na comunicação inicial com a IA.');
    }

    let respostaIA = '';
    const functionCall = extractFunctionCall(initialResponse);

    if (functionCall) {
      if (functionCall.name === 'findByNomeOuEspecialidade') {
        const termo = functionCall.args?.termo as string;

        let medicos =
          await this.medicosService.findByNomeOuEspecialidade(termo);

        const toolOutput = JSON.stringify({ medicos });

        const finalResponse = await chatSession.sendMessage([
          {
            functionResponse: {
              name: functionCall.name,
              response: { content: toolOutput },
            },
          } as any,
        ]);

        respostaIA = extractText(finalResponse);
      } else {
        respostaIA = extractText(initialResponse);
      }
    } else {
      respostaIA = extractText(initialResponse);
    }

    await this.prisma.interacao.create({
      data: {
        pergunta: dto.pergunta,
        respostaIA,
      },
    });

    return { resposta: respostaIA };
  }
}
