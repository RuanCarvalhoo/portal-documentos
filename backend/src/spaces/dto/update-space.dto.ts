import { PartialType } from '@nestjs/swagger';
import { CreateSpaceDto } from './create-space.dto';

// PartialType do pacote swagger: mantém as validações e a documentação, com campos opcionais
export class UpdateSpaceDto extends PartialType(CreateSpaceDto) {}
