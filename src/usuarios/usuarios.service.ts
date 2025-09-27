// src/usuarios/usuarios.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Perfil, Usuario } from '@prisma/client';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) { }

  private removeSenha(usuario: Usuario): Omit<Usuario, 'senha'> {
    const { senha, ...resto } = usuario;
    return resto;
  }

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { email, nome, senha, perfil, perfilPaciente } = createUsuarioDto;

    const hashSenha = await bcrypt.hash(senha, 10);

    try {
      const novoUsuario = await this.prisma.usuario.create({
        data: {
          email,
          nome,
          senha: hashSenha,
          perfil,
          perfilPaciente:
            perfil === Perfil.PACIENTE && perfilPaciente
              ? {
                create: {
                  ...perfilPaciente,
                  dataNascimento: new Date(perfilPaciente.dataNascimento),
                }
              }
              : undefined,
        },
        include: { perfilPaciente: true },
      });

      return this.removeSenha(novoUsuario);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email ou número de prontuário já cadastrado.');
      }
      throw error;
    }
  }

  async findAll() {
    const usuarios = await this.prisma.usuario.findMany({
      where: { perfil: Perfil.PACIENTE },
    });
    return usuarios.map(this.removeSenha);
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { perfilPaciente: true },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
    }

    return this.removeSenha(usuario);
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    await this.findOne(id);

    if (updateUsuarioDto.senha) {
      updateUsuarioDto.senha = await bcrypt.hash(updateUsuarioDto.senha, 10);
    }

    const usuarioAtualizado = await this.prisma.usuario.update({
      where: { id },
      data: {
        ...updateUsuarioDto,
        perfilPaciente: updateUsuarioDto.perfilPaciente
          ? { update: updateUsuarioDto.perfilPaciente }
          : undefined,
      },
      include: { perfilPaciente: true },
    });

    return this.removeSenha(usuarioAtualizado);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.usuario.delete({ where: { id } });
    return;
  }

  async findOneByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findByDocumento(cpf: string) {
    return this.prisma.usuario.findFirst({
      where: {
        perfilPaciente: {
          cpf: cpf,
        },
      },
      include: {
        perfilPaciente: true,
      },
    });
  }
}