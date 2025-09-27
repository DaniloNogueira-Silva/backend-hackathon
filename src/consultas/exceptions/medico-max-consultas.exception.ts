// src/consultas/exceptions/medico-max-consultas.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class MedicoMaxConsultasException extends HttpException {
    constructor(medicoId: string) {
        super(
            {
                medicoId: medicoId,
                message: 'Este médico ultrapassou o número máximo de consultas diárias.',
                error: 'Conflict',
                statusCode: HttpStatus.CONFLICT,
            },
            HttpStatus.CONFLICT,
        );
    }
}