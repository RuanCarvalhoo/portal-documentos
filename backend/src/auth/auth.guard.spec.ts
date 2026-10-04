import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

const jwt = new JwtService({ secret: 'test-secret-with-at-least-32-characters' });
const guard = new AuthGuard(jwt);

function contextWith(authorization?: string) {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('AuthGuard', () => {
  it('rejects requests without a token', async () => {
    await expect(guard.canActivate(contextWith().context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
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

  it('attaches the user id from a valid token', async () => {
    const { context, request } = contextWith(`Bearer ${jwt.sign({ sub: 'u1' })}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1' });
  });
});
