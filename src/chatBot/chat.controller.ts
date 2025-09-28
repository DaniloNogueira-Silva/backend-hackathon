import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { NewChatRequestDto } from './dto/new-chat-request.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

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
  async continueChat(@Body() dto: ChatRequestDto) {
    try {
      return await this.chatService.generateResponse(dto);
    } catch (error) {
      return { error: error.message };
    }
  }
}
