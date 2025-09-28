import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaService } from '../prisma/prisma.service'; 
import { MedicosModule } from 'src/medicos/medicos.module';
import { ConsultasModule } from 'src/consultas/consultas.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { AutorizacoesExameModule } from 'src/autorizacoes-exame/autorizacoes-exame.module';
import { AgendamentoChatService } from './agendamento.service';

@Module({
  imports: [ConfigModule, MedicosModule, ConsultasModule, UsuariosModule, AutorizacoesExameModule], 
  controllers: [ChatController],
  providers: [ChatService, PrismaService, AgendamentoChatService
  ] , 
})
export class ChatModule {}