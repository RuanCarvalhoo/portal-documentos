import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { MAX_TAG_LENGTH, normalizeTag, TAG_PATTERN } from './tags.util';

/** Tag da URL na forma canônica (/tags/Banco%20de%20Dados vira "banco-de-dados"), ou 400. */
@Injectable()
export class ParseTagPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const tag = normalizeTag(value);
    if (tag.length > MAX_TAG_LENGTH || !TAG_PATTERN.test(tag)) {
      throw new BadRequestException('Tag inválida');
    }
    return tag;
  }
}
