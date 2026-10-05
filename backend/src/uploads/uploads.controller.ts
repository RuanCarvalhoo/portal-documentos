import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Auth } from '../auth/auth.decorator';
import { type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Role } from '../auth/roles';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { UploadDto } from './dto/upload.dto';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from './upload.util';
import { UploadsService } from './uploads.service';

// Cada imagem tem um id próprio e nunca muda: o navegador pode guardá-la por um ano
const IMMUTABLE = 'public, max-age=31536000, immutable';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /**
   * Envia uma imagem (Editor ou Admin). Devolve o caminho para usar no Markdown:
   * `![descrição](/api/uploads/<id>)`
   */
  @Post()
  @Auth(Role.EDITOR)
  // Mais apertado que as outras escritas: cada envio pode ter 5 MB
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  // Depois dos guards: sem login e perfil, o corpo nem chega a ser lido. Em memória e com teto
  // (o arquivo vai para o banco; disco local não serviria a várias réplicas)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0 },
      // Navegadores enviam o nome do arquivo em UTF-8 ("visão.png" não vira "visÃ£o.png")
      defParamCharset: 'utf8',
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary', description: 'PNG, JPEG, GIF ou WebP' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Nenhuma imagem no campo "file"' })
  @ApiPayloadTooLargeResponse({ description: `Imagem maior que ${MAX_UPLOAD_MB} MB` })
  @ApiUnsupportedMediaTypeResponse({ description: 'Não é PNG, JPEG, GIF nem WebP' })
  @ApiTooManyRequestsResponse({ description: 'Muitos envios em pouco tempo' })
  create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadDto> {
    return this.uploads.create(file, user.id);
  }

  /** Devolve a imagem (público, como a leitura das páginas) */
  @Get(':id')
  @ApiOkResponse({ description: 'A imagem, com cache longo e ETag' })
  @ApiBadRequestResponse({ description: 'Identificador inválido' })
  @ApiNotFoundResponse({ description: 'Imagem não encontrada' })
  async findOne(
    @Param('id', ParseIdPipe) id: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const image = await this.uploads.findOne(id);
    const etag = `"${image.sha256}"`;
    response.set({ 'Cache-Control': IMMUTABLE, ETag: etag });
    if (ifNoneMatch === etag) {
      response.status(HttpStatus.NOT_MODIFIED);
      return undefined;
    }
    return new StreamableFile(image.data, {
      type: image.mimeType,
      length: image.size,
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(image.fileName)}`,
    });
  }
}
