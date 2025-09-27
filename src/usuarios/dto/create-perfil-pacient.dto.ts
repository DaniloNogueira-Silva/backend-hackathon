import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreatePerfilPacienteDto {
    @IsDateString()
    dataNascimento: string;

    @IsString()
    cpf: string;

    @IsString()
    numeroProntuario: string;

    @IsString()
    @IsOptional()
    telefoneContato?: string;

    @IsString()
    @IsOptional()
    endereco?: string;
}