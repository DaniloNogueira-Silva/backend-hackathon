import { Module } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { ConsultasController } from './consultas.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ConsultasController],
  providers: [ConsultasService, PrismaService],
})
export class ConsultasModule {}
