import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Get,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { NewChatRequestDto } from './dto/new-chat-request.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  constructor(private readonly chatService: ChatService) { }

  @Post('start')
  async startChat(@Body() dto: NewChatRequestDto) {
    try {
      this.logger.log(dto);
      const newSessionId = randomUUID();
      const respostaCompleta = await this.chatService.generateResponse({
        sessionId: newSessionId,
        pergunta: dto.pergunta,
      });

      return {
        sessionId: newSessionId,
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
