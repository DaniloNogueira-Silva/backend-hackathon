import { Type } from 'class-transformer';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { CreatePerfilPacienteDto } from './create-perfil-pacient.dto';
import { Perfil } from '@prisma/client';

export class CreateUsuarioDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsString()
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
    senha: string;

    @IsEnum(Perfil)
    perfil: Perfil;

    @IsOptional()
    @IsString()
    telefone?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreatePerfilPacienteDto)
    @IsObject()
    perfilPaciente?: CreatePerfilPacienteDto;
}