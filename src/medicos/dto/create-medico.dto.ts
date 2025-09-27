import { Type } from 'class-transformer';
import {
    IsEmail,
    IsNotEmpty,
    IsObject,
    IsString,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { CreatePerfilMedicoDto } from './create-perfil-medico.dto';

export class CreateMedicoDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsString()
    @MinLength(6)
    senha: string;

    @ValidateNested()
    @Type(() => CreatePerfilMedicoDto)
    @IsObject()
    perfilMedico: CreatePerfilMedicoDto;
}