import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { randomUUID } from 'crypto'; 
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { NewChatRequestDto } from './dto/new-chat-request.dto'; 

@Controller('chat')
@UsePipes(new ValidationPipe({ transform: true }))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('start')
  async startChat(@Body() dto: NewChatRequestDto) {
    try {
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
