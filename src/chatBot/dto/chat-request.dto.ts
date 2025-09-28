import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  @IsOptional()
  pergunta: string;

  @IsString()
  @IsOptional()
  sessionId: string;
}