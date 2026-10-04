import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../config/env.validation';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

// Sem refresh token: expiração fixa, curta o bastante para limitar um token vazado (ADR 004)
const TOKEN_TTL_SECONDS = 8 * 60 * 60;

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  // Outros módulos protegem rotas com o AuthGuard, que depende do JwtService
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
