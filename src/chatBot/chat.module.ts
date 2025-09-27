import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaService } from '../prisma/prisma.service'; // Importa o Prisma

@Module({
  imports: [ConfigModule], // Necessário para usar o ConfigService
  controllers: [ChatController],
  providers: [ChatService, PrismaService], // O Prisma deve ser injetado aqui
})
export class ChatModule {}