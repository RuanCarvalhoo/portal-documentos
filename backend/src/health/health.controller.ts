import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok';
  database: 'up';
}

/**
 * Readiness: além de o processo estar de pé, confirma que o banco responde.
 * O healthcheck do docker-compose usa esta rota para liberar os serviços dependentes.
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error: unknown) {
      this.logger.error('Database health check failed', error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException('Banco de dados indisponível');
    }
    return { status: 'ok', database: 'up' };
  }
}
