import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ChatModule } from './chatBot/chat.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { MedicosModule } from './medicos/medicos.module';
import { ConsultasModule } from './consultas/consultas.module';
import { AutorizacoesExameModule } from './autorizacoes-exame/autorizacoes-exame.module';
import { rolProcedimentosModule } from './rol-procedimentos/rol-procedimentos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ChatModule,
    PrismaModule,
    UsuariosModule,
    AuthModule,
    MedicosModule,
    ConsultasModule,
    AutorizacoesExameModule,
    rolProcedimentosModule
  ],
})
export class AppModule {}
