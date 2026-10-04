import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/** Exige `Authorization: Bearer <jwt>` válido e anexa `request.user = { id }`. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

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
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    if (typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    request.user = { id: payload.sub };
    return true;
  }
}
