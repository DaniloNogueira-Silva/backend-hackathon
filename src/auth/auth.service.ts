// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
  ) { }

  /**
   * Valida se as credenciais do usuário (email e senha) estão corretas.
   * @param email Email do usuário
   * @param senha Senha em texto plano
   * @returns O objeto do usuário sem a senha se as credenciais forem válidas, senão null.
   */
  async validateUser(email: string, senhaInserida: string): Promise<any> {
    // Usamos o 'findOneByEmail' que precisa ser criado no UsuariosService
    const usuario = await this.usuariosService.findOneByEmail(email);

    if (usuario && (await bcrypt.compare(senhaInserida, usuario.senha))) {
      const { senha, ...result } = usuario;
      return result;
    }
    return null;
  }

  /**
   * Gera um token de acesso JWT para um usuário validado.
   * @param usuario O objeto do usuário
   * @returns Um objeto contendo o token de acesso.
   */
  async login(usuario: any) {
    const payload = { email: usuario.email, sub: usuario.id, perfil: usuario.perfil };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}