import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { FluxoPasso } from '@prisma/client';

@Injectable()
export class ChatService {
  private ai: GoogleGenerativeAI;
  private readonly modelName = 'gemini-2.5-flash';
  private chatSessions: Map<string, ChatSession> = new Map();

  constructor(
    private configService: ConfigService,
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
Você é um especialista em descrever fluxos de trabalho e processos.
Sua tarefa é responder a todas as perguntas do usuário baseada **APENAS** no CONTEXTO ESTRUTURADO a seguir.
Sua resposta deve ser amigável, concisa e levar em conta o histórico da conversa.
Sempre será o beneficiário quem faz as perguntas.

--- CONTEXTO ESTRUTURADO DO FLUXO ---
${contexto}
--- FIM DO CONTEXTO ---
`;

    const chat = this.ai
      .getGenerativeModel({
        model: this.modelName,
      })
      .startChat({
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }],
        },
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

    let respostaIA: string;
    try {
      const response = await chatSession.sendMessage(dto.pergunta);

      respostaIA = response.response.text();
    } catch (error) {
      console.error('Erro ao chamar a API do Gemini:', error);
      throw new Error('Falha ao gerar resposta com a IA Generativa.');
    }

    await this.prisma.interacao.create({
      data: {
        pergunta: dto.pergunta,
        respostaIA: respostaIA,
      },
    });

    return { resposta: respostaIA };
  }
}
