import { Module } from '@nestjs/common';
import { AutorizacoesExameService } from './autorizacoes-exame.service';
import { AutorizacoesExameController } from './autorizacoes-exame.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolProcedimentosService } from 'src/rol-procedimentos/rol-procedimentos.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { MedicosService } from 'src/medicos/medicos.service';

@Module({
  imports: [],
  controllers: [AutorizacoesExameController],
  providers: [AutorizacoesExameService, PrismaService, RolProcedimentosService, UsuariosService, MedicosService],
  exports: [AutorizacoesExameService]
})
export class AutorizacoesExameModule { }
