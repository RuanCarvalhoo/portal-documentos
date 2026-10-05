import { ArgumentMetadata, BadRequestException, ParseUUIDPipe } from '@nestjs/common';

// O Postgres aceita uuid em qualquer caixa, mas a aplicação compara ids como texto (hierarquia,
// checagem de ciclo e de profundidade): normaliza para minúsculas, como o banco devolve
class ParseLowercaseUuidPipe extends ParseUUIDPipe {
  async transform(value: unknown, metadata: ArgumentMetadata): Promise<string | undefined | null> {
    return (await super.transform(value, metadata))?.toLowerCase();
  }
}

// IDs são uuid: valor malformado vira 400 aqui, em vez de erro do Postgres (500) lá na query
export const ParseIdPipe = new ParseLowercaseUuidPipe({
  exceptionFactory: () => new BadRequestException('Identificador inválido'),
});
