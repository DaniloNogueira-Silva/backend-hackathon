import { Module } from '@nestjs/common';
import { MedicosService } from './medicos.service';
import { MedicosController } from './medicos.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MedicosController],
  providers: [MedicosService, PrismaService],
  exports: [MedicosService]
})
export class MedicosModule {}
