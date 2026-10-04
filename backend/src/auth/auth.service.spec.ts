import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const jwt = new JwtService({ secret: 'test-secret-with-at-least-32-characters' });
const user = { id: 'u1', name: 'Ana', email: 'ana@example.com' };
const credentials = { email: user.email, password: 'senha-forte-1' };

describe('AuthService', () => {
  const prisma = { user: { create: jest.fn(), findUnique: jest.fn() } };
  const service = new AuthService(prisma as unknown as PrismaService, jwt);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('stores a bcrypt hash, never the plain password', async () => {
      prisma.user.create.mockResolvedValue(user);

      await service.register({ name: user.name, ...credentials });

      const { data } = prisma.user.create.mock.calls[0][0];
      expect(data.passwordHash).not.toBe(credentials.password);
      await expect(compare(credentials.password, data.passwordHash)).resolves.toBe(true);
    });

    it('returns a token for the new user and the public profile only', async () => {
      prisma.user.create.mockResolvedValue(user);

      const result = await service.register({ name: user.name, ...credentials });

      expect(result.user).toEqual(user);
      expect(jwt.verify(result.accessToken).sub).toBe(user.id);
    });

    it('answers 409 when the e-mail is already registered', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' }),
      );

      await expect(service.register({ name: user.name, ...credentials })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    let passwordHash: string;

    beforeAll(async () => {
      passwordHash = await hash(credentials.password, 4);
    });

    it('returns a token and the public profile for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });

      const result = await service.login(credentials);

      expect(result.user).toEqual(user);
      expect(jwt.verify(result.accessToken).sub).toBe(user.id);
    });

    it('rejects a wrong password with a generic message', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });

      await expect(service.login({ ...credentials, password: 'errada-123' })).rejects.toThrow(
        new UnauthorizedException('Credenciais inválidas'),
      );
    });

    it('rejects an unknown e-mail with the same generic message', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(credentials)).rejects.toThrow(
        new UnauthorizedException('Credenciais inválidas'),
      );
    });
  });

  describe('me', () => {
    it('returns the public profile of the user', async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.me(user.id)).resolves.toEqual(user);
    });

    it('answers 401 when the user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me(user.id)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
