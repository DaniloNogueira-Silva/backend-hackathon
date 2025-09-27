import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolProcedimentosService } from './rol-procedimentos.service';

@Module({
    providers: [RolProcedimentosService, PrismaService],
    exports: [RolProcedimentosService]
})
export class rolProcedimentosModule { }
