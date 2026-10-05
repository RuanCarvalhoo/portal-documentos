import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from './auth.guard';
import { Role } from './roles';

const USER_ID = '01a10ce0-bfc3-759d-ae70-030a8bafc793';
const jwt = new JwtService({ secret: 'test-secret-with-at-least-32-characters' });
const prisma = { user: { findUnique: jest.fn() } };
const reflector = { getAllAndOverride: jest.fn() };
const guard = new AuthGuard(jwt, prisma as unknown as PrismaService, reflector as unknown as Reflector);

function contextWith(authorization?: string) {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return { context, request };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: Role.EDITOR });
  reflector.getAllAndOverride.mockReturnValue(undefined);
});

describe('AuthGuard', () => {
  it('rejects requests without a token', async () => {
    await expect(guard.canActivate(contextWith().context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects other authorization schemes', async () => {
    await expect(guard.canActivate(contextWith('Basic abc').context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another secret', async () => {
    const forged = new JwtService({ secret: 'another-secret-with-at-least-32-chars!' }).sign({
      sub: 'u1',
    });

    await expect(guard.canActivate(contextWith(`Bearer ${forged}`).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ sub: 'u1', exp: Math.floor(Date.now() / 1000) - 10 });

    await expect(guard.canActivate(contextWith(`Bearer ${expired}`).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another algorithm, even with the right secret', async () => {
    const hs512 = jwt.sign({ sub: 'u1' }, { algorithm: 'HS512' });

    await expect(guard.canActivate(contextWith(`Bearer ${hs512}`).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token whose sub is not a user id', async () => {
    const numericSub = jwt.sign({ sub: 123 });

    await expect(guard.canActivate(contextWith(`Bearer ${numericSub}`).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts the scheme in any case', async () => {
    const { context } = contextWith(`bearer ${jwt.sign({ sub: USER_ID })}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('attaches the user with the current role read from the database', async () => {
    const { context, request } = contextWith(`Bearer ${jwt.sign({ sub: USER_ID })}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: USER_ID, role: Role.EDITOR });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { id: true, role: true },
    });
  });

  it('rejects a valid token whose account no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextWith(`Bearer ${jwt.sign({ sub: USER_ID })}`).context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a sub that is not a uuid without querying the database', async () => {
    await expect(
      guard.canActivate(contextWith(`Bearer ${jwt.sign({ sub: 'u1' })}`).context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('AuthGuard roles', () => {
  const tokenOf = () => `Bearer ${jwt.sign({ sub: USER_ID })}`;

  it('answers 403 when the role is below the minimum of the route', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: Role.READER });
    reflector.getAllAndOverride.mockReturnValue(Role.EDITOR);

    await expect(guard.canActivate(contextWith(tokenOf()).context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets a higher role through', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: Role.ADMIN });
    reflector.getAllAndOverride.mockReturnValue(Role.EDITOR);

    await expect(guard.canActivate(contextWith(tokenOf()).context)).resolves.toBe(true);
  });

  it('only requires a login when the route sets no minimum', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: Role.READER });

    await expect(guard.canActivate(contextWith(tokenOf()).context)).resolves.toBe(true);
  });
});
