import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
@UsePipes(new ValidationPipe({ transform: true }))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('question')
  async handleChatRequest(@Body() dto: ChatRequestDto) {
    try {
      return await this.chatService.generateResponse(dto);
    } catch (error) {
      return { error: error.message };
    }
  }
}
