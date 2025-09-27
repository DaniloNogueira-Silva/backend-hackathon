import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { MedicoMaxConsultasException } from './exceptions/medico-max-consultas.exception';
import { Prisma, StatusConsulta } from '@prisma/client';

@Injectable()
export class ConsultasService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateConsultaDto) {
    const { dataHoraInicio, pacienteId, medicoId, duracaoEmMinutos } = dto;

    const duracao = duracaoEmMinutos || 60;
    const dataInicio = new Date(dataHoraInicio);
    const dataFim = new Date(dataInicio);
    dataFim.setMinutes(dataInicio.getMinutes() + duracao);


    const inicioDoDia = new Date(dataInicio);
    inicioDoDia.setHours(0, 0, 0, 0);

    const fimDoDia = new Date(dataInicio);
    fimDoDia.setHours(23, 59, 59, 999);
    const consultasNoDia = await this.prisma.consulta.count({
      where: {
        medicoId: medicoId,
        dataHoraInicio: {
          gte: inicioDoDia,
          lte: fimDoDia,
        },
      },
    });

    if (consultasNoDia >= 6) {
      throw new MedicoMaxConsultasException(medicoId);
    }

    const agendamentoSobreposto = await this.prisma.consulta.findFirst({
      where: {
        medicoId: medicoId,
        dataHoraInicio: {
          lt: dataFim,
        },
        dataHoraFim: {
          gt: dataInicio,
        },
        status: {
          not: 'CANCELADA'
        }
      },
    });

    if (agendamentoSobreposto) {
      throw new ConflictException(
        'O médico já possui uma consulta agendada neste horário.',
      );
    }


    return this.prisma.consulta.create({
      data: {
        pacienteId,
        medicoId,
        dataHoraInicio: dataInicio,
        dataHoraFim: dataFim,
      },
    });
  }

  async findAll(userId: string, status?: string) {
    const where: Prisma.ConsultaWhereInput = {
      OR: [
        { pacienteId: userId },
        { medicoId: userId },
      ],
    };

    if (status) {
      where.status = status as StatusConsulta; 
    }

    return this.prisma.consulta.findMany({
      where, 
      include: {
        paciente: { select: { usuario: { select: { nome: true } } } },
        medico: { select: { usuario: { select: { nome: true } } } },
      },
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