import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

// IDs são uuid: valor malformado vira 400 aqui, em vez de erro do Postgres (500) lá na query
export const ParseIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException('Identificador inválido'),
});
