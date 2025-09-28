import { IsArray, IsISO8601, IsOptional } from 'class-validator';

export class FiltrarHorariosDto {
    @IsArray()
    @IsISO8601({}, { each: true }) // Valida se cada item do array é uma data ISO 8601
    @IsOptional()
    horariosIndisponiveis?: string[];
}