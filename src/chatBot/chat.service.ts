import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { FluxoPasso } from '@prisma/client';

@Injectable()
export class ChatService {
  private ai: GoogleGenerativeAI;
  private readonly modelName = 'gemini-2.5-flash';

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
      contexto += `
        PASSO ${passo.numeroPasso}: ${passo.descricaoAcao}
          - QUEM: ${passo.quemAtor}
          - DETALHE: ${passo.comoDetalhe}
      `;

      if (passo.isDecisao) {
        contexto += `  - DECISÃO: Sim -> Passo ${passo.passoSimId} | Não -> Passo ${passo.passoNaoId}\n`;
      } else if (passo.proximoPassoId) {
        contexto += `  - PRÓXIMO: Passo ${passo.proximoPassoId}\n`;
      } else {
        contexto += `  - PRÓXIMO: FIM DO PROCESSO\n`;
      }
    }

    return contexto;
  }

  async generateResponse(dto: ChatRequestDto): Promise<{ resposta: string }> {
    const todosPassos = await this.prisma.fluxoPasso.findMany();

    if (todosPassos.length === 0) {
      throw new NotFoundException(
        'Nenhum passo de fluxo encontrado no banco de dados para usar como contexto.',
      );
    }

    const contextoFormatado = this.formatContextToPrompt(todosPassos);

    const fullPrompt = `
        Você é um especialista em descrever fluxos de trabalho e processos.
        Sua tarefa é responder à pergunta do usuário baseada **APENAS** no CONTEXTO ESTRUTURADO a seguir.
        Sua resposta deve ser amigável e concisa, descrevendo o passo a passo relevante para a pergunta.
        Sempre será o beneficiário que irá fazer as perguntas responda de acordo.

        --- CONTEXTO ESTRUTURADO DO FLUXO ---
        ${contextoFormatado}
        --- FIM DO CONTEXTO ---

        PERGUNTA DO USUÁRIO:
        ${dto.pergunta}
    `;

    let respostaIA: string;
    try {
      const response = await this.ai
        .getGenerativeModel({ model: this.modelName })
        .generateContent(fullPrompt);
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
