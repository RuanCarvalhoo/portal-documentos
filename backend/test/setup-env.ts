import { Logger } from '@nestjs/common';

// Os e2e sobem a aplicação inteira várias vezes: sem isso cada requisição imprimiria uma linha
// de log (pino) e cada escrita um evento de negócio. Erros continuam aparecendo.
process.env.LOG_LEVEL ??= 'silent';
// O .env de desenvolvimento liga o pino-pretty, que abre uma worker thread por aplicação
process.env.LOG_PRETTY = 'false';
Logger.overrideLogger(['error']);
