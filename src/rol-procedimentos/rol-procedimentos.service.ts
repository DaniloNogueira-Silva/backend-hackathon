import { Injectable } from '@nestjs/common'; // 1. IMPORTE O DECORATOR
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable() // 2. ADICIONE O DECORATOR AQUI
export class RolProcedimentosService {
    constructor(private prisma: PrismaService) { }

    async findByTerminologia(terminologia: string) {
        return this.prisma.rolProcedimento.findMany({
            where: { terminologia: { contains: terminologia, mode: 'insensitive' } }, 
        });
    }
}