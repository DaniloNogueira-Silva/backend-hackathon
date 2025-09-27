import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class NewChatRequestDto {
  @IsString()
  @IsNotEmpty()
  pergunta: string;

}