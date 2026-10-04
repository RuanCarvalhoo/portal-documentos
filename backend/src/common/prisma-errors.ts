import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

/**
 * Executa um update/delete por id e troca o P2025 do Prisma ("registro não existe") por um 404
 * com a mensagem do recurso — sem uma consulta extra antes só para checar existência.
 * Use só em update/delete por id: em outras operações o P2025 pode ter outro significado.
 */
export async function orNotFound<T>(operation: Promise<T>, message: string): Promise<T> {
  try {
    return await operation;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(message);
    }
    throw error;
  }
}
