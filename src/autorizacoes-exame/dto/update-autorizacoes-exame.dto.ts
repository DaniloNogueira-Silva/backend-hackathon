import { IsEnum, IsNotEmpty } from 'class-validator';
import { StatusAutorizacao } from '@prisma/client';

export class UpdateAutorizacaoExameDto {
  @IsEnum(StatusAutorizacao)
  @IsNotEmpty()
  status: StatusAutorizacao;
}