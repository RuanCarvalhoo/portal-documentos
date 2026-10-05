import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { hasRole, type Role } from './roles';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/** Metadado com o perfil mínimo da rota, gravado pelo decorator @Auth(). */
export const MIN_ROLE_KEY = 'auth:minRole';

const INVALID_TOKEN = 'Token inválido ou expirado';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Exige `Authorization: Bearer <jwt>` válido, carrega o perfil atual da conta e confere o perfil
 * mínimo da rota. Anexa `request.user = { id, role }`.
 *
 * O perfil vem do banco a cada requisição autenticada (uma leitura pela chave primária), não do
 * token: promover, rebaixar ou remover uma conta vale na hora, sem esperar o token expirar.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    // O esquema é case-insensitive (RFC 7235): 'bearer' também vale
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Token de acesso ausente');
    }

    let payload: { sub?: unknown };
    try {
      // Algoritmo fixo: impede tokens forjados com outro "alg" no header
      payload = await this.jwt.verifyAsync(token, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) {
      throw new UnauthorizedException(INVALID_TOKEN);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub.toLowerCase() },
      select: { id: true, role: true },
    });
    // Conta removida depois de emitido o token
    if (!user) {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    request.user = user;

    const minimum = this.reflector.getAllAndOverride<Role | undefined>(MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (minimum && !hasRole(user.role, minimum)) {
      throw new ForbiddenException('Seu perfil não permite esta ação');
    }
    return true;
  }
}
