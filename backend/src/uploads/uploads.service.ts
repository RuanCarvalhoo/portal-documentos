import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadDto } from './dto/upload.dto';
import { detectImageType, safeFileName } from './upload.util';

// Sem os bytes: a resposta do envio não devolve a imagem
const UPLOAD_FIELDS = { id: true, fileName: true, mimeType: true, size: true } as const;

export interface StoredImage {
  data: Uint8Array;
  mimeType: string;
  fileName: string;
  size: number;
  sha256: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarda a imagem e devolve onde ela fica. O mesmo arquivo enviado de novo (mesmo sha256)
   * devolve o registro existente: colar a mesma imagem duas vezes não duplica bytes no banco.
   */
  async create(
    file: { buffer: Buffer; originalname: string } | undefined,
    userId: string,
  ): Promise<UploadDto> {
    if (!file || file.buffer.length === 0) {
      throw new BadRequestException('Envie uma imagem no campo "file"');
    }
    const mimeType = detectImageType(file.buffer);
    if (!mimeType) {
      throw new UnsupportedMediaTypeException('Formato não suportado: envie PNG, JPEG, GIF ou WebP');
    }
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const existing = await this.prisma.upload.findUnique({ where: { sha256 }, select: UPLOAD_FIELDS });
    if (existing) {
      return toUploadDto(existing);
    }
    try {
      const upload = await this.prisma.upload.create({
        data: {
          fileName: safeFileName(file.originalname, mimeType),
          mimeType,
          size: file.buffer.length,
          sha256,
          data: new Uint8Array(file.buffer),
          uploadedById: userId,
        },
        select: UPLOAD_FIELDS,
      });
      this.logger.log(
        { event: 'upload.created', uploadId: upload.id, mimeType, size: upload.size },
        'Imagem enviada',
      );
      return toUploadDto(upload);
    } catch (error: unknown) {
      // Duas pessoas enviando o mesmo arquivo ao mesmo tempo: a segunda usa o registro da primeira
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return toUploadDto(
          await this.prisma.upload.findUniqueOrThrow({ where: { sha256 }, select: UPLOAD_FIELDS }),
        );
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<StoredImage> {
    const image = await this.prisma.upload.findUnique({
      where: { id },
      select: { data: true, mimeType: true, fileName: true, size: true, sha256: true },
    });
    if (!image) {
      throw new NotFoundException('Imagem não encontrada');
    }
    return image;
  }
}

function toUploadDto(upload: { id: string; fileName: string; mimeType: string; size: number }): UploadDto {
  return { ...upload, path: `/uploads/${upload.id}` };
}
