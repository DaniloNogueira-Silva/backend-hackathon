import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MedicosService } from './medicos.service';
import { CreateMedicoDto } from './dto/create-medico.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('medicos')
export class MedicosController {
  constructor(private readonly medicosService: MedicosService) { }

  @Get('buscar')
  buscarPorNomeEspecialidade(
    @Query('nome') nome: string,
    @Query('especialidade') especialidade: string,
  ) {
    return this.medicosService.findByNomeEspecialidade(nome, especialidade);
  }
  
  @Post()
  create(@Body() createMedicoDto: CreateMedicoDto) {
    return this.medicosService.create(createMedicoDto);
  }

  @Get() findAll(@Query('especialidade') especialidade?: string) {
    return this.medicosService.findAll(especialidade);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicosService.findOne(id);
  }

}