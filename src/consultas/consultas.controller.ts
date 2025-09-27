import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('consultas')
export class ConsultasController {
  constructor(private readonly consultasService: ConsultasService) { }

  @Post()
  create(@Body() createConsultaDto: CreateConsultaDto) {
    return this.consultasService.create(createConsultaDto);
  }

  @Get()
  findAll() {
    return this.consultasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consultasService.findOne(id);
  }
}