import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';

// PartialType torna todos os campos do CreateUsuarioDto opcionais
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) { }