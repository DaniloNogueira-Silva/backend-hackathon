import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicoDto } from './dto/create-medico.dto';
import * as bcrypt from 'bcrypt';
import { Perfil, Prisma, Usuario } from '@prisma/client';

@Injectable()
export class MedicosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMedicoDto) {
    const hashSenha = await bcrypt.hash(dto.senha, 10);

    return this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        senha: hashSenha,
        perfil: Perfil.MEDICO,
        perfilMedico: {
          create: dto.perfilMedico,
        },
      },
      include: {
        perfilMedico: true,
      },
    });
  }

  async findAll(especialidade?: string) {
    const where: Prisma.UsuarioWhereInput = {
      perfil: Perfil.MEDICO,
    };

    if (especialidade) {
      where.perfilMedico = {
        especialidade: {
          equals: especialidade,
          mode: 'insensitive',
        },
      };
    }

    return this.prisma.usuario.findMany({
      where,
      include: {
        perfilMedico: true,
      },
    });
  }

  async findOne(id: string) {
    const medico = await this.prisma.usuario.findUnique({
      where: { id },
      include: { perfilMedico: true },
    });

    if (!medico || medico.perfil !== Perfil.MEDICO) {
      throw new NotFoundException('Médico não encontrado');
    }
    return medico;
  }

  async findByNomeEspecialidade(nome: string, especialidade: string) {
    return this.prisma.usuario.findMany({
      where: {
        AND: [
          {
            perfil: Perfil.MEDICO,
          },
          {
            nome: {
              contains: nome,
              mode: 'insensitive',
            },
          },
          {
            perfilMedico: {
              especialidade: especialidade,
            },
          },
        ],
      },
      include: {
        perfilMedico: true,
      },
    });
  }

  async findByCRM(crm: string) {
    return this.prisma.usuario.findFirst({
      where: { perfilMedico: { crm: crm } },
      include: {
        perfilMedico: true,
      },
    });
  }

  async findByNomeOuEspecialidade(termo: string) {
    const termoNormalizado = termo.toLowerCase();

    return this.prisma.usuario.findMany({
      where: {
        perfil: Perfil.MEDICO,
        OR: [
          {
            nome: {
              contains: termoNormalizado,
              mode: 'insensitive',
            },
          },
          {
            perfilMedico: {
              especialidade: {
                contains: termoNormalizado,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      include: {
        perfilMedico: true,
      },
    });
  }
}
