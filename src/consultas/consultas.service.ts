import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';

@Injectable()
export class ConsultasService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateConsultaDto) {
    const { dataHoraInicio, pacienteId, medicoId, duracaoEmMinutos } = dto;

    const duracao = duracaoEmMinutos || 60;

    const dataInicio = new Date(dataHoraInicio);

    const dataFim = new Date(dataInicio);
    dataFim.setMinutes(dataInicio.getMinutes() + duracao);

    return this.prisma.consulta.create({
      data: {
        pacienteId,
        medicoId,
        dataHoraInicio: dataInicio,
        dataHoraFim: dataFim,
      },
    });
  }

  async findAll() {
    return this.prisma.consulta.findMany({
      include: {
        paciente: { select: { id: true, usuario: { select: { nome: true } } } },
        medico: {
          select: { id: true, usuario: { select: { nome: true } } },
        },
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.consulta.findUnique({
      where: { id },
      include: {
        paciente: true,
        medico: true,
      },
    });
  }

}