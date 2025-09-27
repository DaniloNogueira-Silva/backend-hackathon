import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { AutorizacoesExameService } from './autorizacoes-exame.service';
import { CreateAutorizacaoExameDto } from './dto/create-autorizacoes-exame.dto';
import { UpdateAutorizacaoExameDto } from './dto/update-autorizacoes-exame.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('autorizacoes-exame')
export class AutorizacoesExameController {
  constructor(
    private readonly autorizacoesExameService: AutorizacoesExameService,
  ) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('imagem'))
  async createFromImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5 MB
          new FileTypeValidator({ fileType: 'image/(jpeg|png|gif)|application/pdf' }),
        ],
      }),
    )
    imagem: Express.Multer.File,
  ) {
    return this.autorizacoesExameService.processarPdfEExtrairDados(imagem);
  }

  @Get()
  findAll() {
    return this.autorizacoesExameService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.autorizacoesExameService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAutorizacaoExameDto: UpdateAutorizacaoExameDto,
  ) {
    return this.autorizacoesExameService.update(id, updateAutorizacaoExameDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.autorizacoesExameService.remove(id);
  }
}