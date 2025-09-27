import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateConsultaDto {
    @IsDateString()
    @IsNotEmpty()
    dataHoraInicio: string;

    @IsUUID()
    @IsNotEmpty()
    pacienteId: string;

    @IsUUID()
    @IsNotEmpty()
    medicoId: string;

    @IsInt()
    @Min(15)
    @IsOptional()
    duracaoEmMinutos?: number;
}