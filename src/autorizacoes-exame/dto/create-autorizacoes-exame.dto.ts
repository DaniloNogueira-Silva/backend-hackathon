import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAutorizacaoExameDto {
  @IsString()
  @IsNotEmpty()
  exame: string;

  @IsUUID()
  @IsNotEmpty()
  pacienteId: string;

  @IsUUID()
  @IsNotEmpty()
  medicoId: string;

  @IsUUID()
  @IsOptional()
  consultaId?: string;
}