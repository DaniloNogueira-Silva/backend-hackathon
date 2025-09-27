import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaService } from '../prisma/prisma.service'; 
import { MedicosModule } from 'src/medicos/medicos.module';
import { ConsultasModule } from 'src/consultas/consultas.module';

@Module({
  imports: [ConfigModule, MedicosModule, ConsultasModule], 
  controllers: [ChatController],
  providers: [ChatService, PrismaService], 
})
export class ChatModule {}