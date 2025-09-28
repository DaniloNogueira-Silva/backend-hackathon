import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Get,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { NewChatRequestDto } from './dto/new-chat-request.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AgendamentoChatService } from './agendamento.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService,
    private readonly agendamentoChatService: AgendamentoChatService
  ) { }

  @Post('start')
  async startChat(@Body() dto: NewChatRequestDto) {
    try {
      const newSessionId = randomUUID();
      const respostaCompleta = await this.chatService.generateResponse({
        sessionId: newSessionId,
        pergunta: dto.pergunta,
      });

      const sessionName = await this.chatService.generateSessionName(
        dto.pergunta,
      );

      return {
        sessionId: newSessionId,
        sessionName: sessionName,
        resposta: respostaCompleta.resposta,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('continue')
  // 1. Use o interceptor para capturar o arquivo do campo 'pdfFile'
  @UseInterceptors(FileInterceptor('pdfFile'))
  async continueChat(
    // 2. Capture o arquivo com o decorator @UploadedFile
    @UploadedFile() file: Express.Multer.File,
    // 3. O @Body ainda captura os outros campos do formulário
    @Body() dto: ChatRequestDto,
  ) {
    try {
      // Agora você tem acesso tanto ao DTO quanto ao arquivo!
      console.log('DTO recebido:', dto); // { pergunta: 'aqui está o pdf', sessionId: '...' }
      console.log('Arquivo recebido:', file); // Informações sobre o PDF

      // Passe o DTO e o arquivo para o seu service, se necessário
      return await this.chatService.generateResponse(dto, file); // Adapte seu service para receber o arquivo
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('/agendamento')
  async agendamento(@Body() dto: any) {
    try {
      return await this.agendamentoChatService.processarAgendamento(dto);
    } catch (error) {
      return { error: error.message }
    }
  }
}
