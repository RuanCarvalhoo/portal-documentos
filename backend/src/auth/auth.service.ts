import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Custo 10 = dezenas de ms por hash: caro para força bruta, barato para um login
const BCRYPT_ROUNDS = 10;
// Login de e-mail inexistente também roda o bcrypt contra este hash, para que o tempo de
// resposta não revele quais e-mails estão cadastrados
const DUMMY_HASH = hashSync('senha-ficticia-para-tempo-constante', BCRYPT_ROUNDS);
// select explícito em toda query de usuário: o hash da senha nunca sai do banco por acidente
const PUBLIC_USER = { id: true, name: true, email: true } as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, passwordHash },
        select: PUBLIC_USER,
      });
      // Sem e-mail no log (dado pessoal): o id basta para cruzar com o banco
      this.logger.log({ event: 'user.registered', userId: user.id }, 'Conta criada');
      return this.issueToken(user);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...PUBLIC_USER, passwordHash: true },
    });
    const passwordMatches = await compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      // Mesma mensagem nos dois casos: não confirma se o e-mail existe
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.issueToken({ id: user.id, name: user.name, email: user.email });
  }

  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return user;
  }

  private issueToken(user: AuthUserDto): AuthResponseDto {
    return { accessToken: this.jwt.sign({ sub: user.id }), user };
  }
}
