import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePerfilMedicoDto {
    @IsString()
    @IsNotEmpty()
    crm: string;

    @IsString()
    @IsNotEmpty()
    especialidade: string;
}