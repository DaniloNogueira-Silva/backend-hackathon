import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  pergunta: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}