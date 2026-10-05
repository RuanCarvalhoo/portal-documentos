import { validateEnv } from './env.validation';

const SECRET = 'x'.repeat(32);

describe('validateEnv', () => {
  it('applies defaults for optional variables', () => {
    expect(validateEnv({ DATABASE_URL: 'postgresql://localhost/db', JWT_SECRET: SECRET })).toMatchObject({
      DATABASE_URL: 'postgresql://localhost/db',
      PORT: 3001,
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });

  it('converts PORT to a number', () => {
    expect(validateEnv({ DATABASE_URL: 'postgresql://x', JWT_SECRET: SECRET, PORT: '4000' }).PORT).toBe(4000);
  });

  it('fails fast when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL');
  });

  it('rejects a PORT that is not a positive integer', () => {
    expect(() => validateEnv({ DATABASE_URL: 'postgresql://x', PORT: 'abc' })).toThrow('PORT');
  });
});

describe('validateEnv edge cases', () => {
  const base = { DATABASE_URL: 'postgresql://x', JWT_SECRET: SECRET };

  it('rejects an empty DATABASE_URL', () => {
    expect(() => validateEnv({ DATABASE_URL: '' })).toThrow('DATABASE_URL');
  });

  it.each(['0', '65536', '1e3', '0x10', '30.5', '-1'])('rejects PORT %p', (port) => {
    expect(() => validateEnv({ ...base, PORT: port })).toThrow('PORT');
  });

  it.each(['', '*', 'http://localhost:3000/', 'localhost:3000', 'http://a.com,http://b.com'])(
    'rejects CORS_ORIGIN %p',
    (origin) => {
      expect(() => validateEnv({ ...base, CORS_ORIGIN: origin })).toThrow('CORS_ORIGIN');
    },
  );

  it('accepts an exact origin', () => {
    expect(validateEnv({ ...base, CORS_ORIGIN: 'https://docs.example.com' }).CORS_ORIGIN).toBe(
      'https://docs.example.com',
    );
  });
});

describe('validateEnv JWT_SECRET', () => {
  const base = { DATABASE_URL: 'postgresql://x' };

  it('requires JWT_SECRET', () => {
    expect(() => validateEnv(base)).toThrow('JWT_SECRET');
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow('JWT_SECRET');
  });
});

describe('validateEnv INTERNAL_API_SECRET', () => {
  const base = { DATABASE_URL: 'postgresql://x', JWT_SECRET: SECRET };

  it('is optional: without it the API ignores forwarded client IPs', () => {
    expect(validateEnv(base).INTERNAL_API_SECRET).toBeUndefined();
  });

  it('accepts a secret of at least 32 characters', () => {
    expect(validateEnv({ ...base, INTERNAL_API_SECRET: 'y'.repeat(32) }).INTERNAL_API_SECRET).toBe(
      'y'.repeat(32),
    );
  });

  it('rejects a short secret instead of silently trusting it', () => {
    expect(() => validateEnv({ ...base, INTERNAL_API_SECRET: 'curto' })).toThrow('INTERNAL_API_SECRET');
  });
});

describe('validateEnv logging', () => {
  const base = { DATABASE_URL: 'postgresql://x', JWT_SECRET: SECRET };

  it('logs at info, as JSON, by default', () => {
    expect(validateEnv(base)).toMatchObject({ LOG_LEVEL: 'info', LOG_PRETTY: false });
  });

  it('accepts any pino level, including silent for the tests', () => {
    expect(validateEnv({ ...base, LOG_LEVEL: 'silent', LOG_PRETTY: 'true' })).toMatchObject({
      LOG_LEVEL: 'silent',
      LOG_PRETTY: true,
    });
  });

  it.each([
    ['LOG_LEVEL', 'verbose'],
    ['LOG_LEVEL', 'INFO'],
    ['LOG_PRETTY', 'yes'],
  ])('rejects %s=%p', (name, value) => {
    expect(() => validateEnv({ ...base, [name]: value })).toThrow(name);
  });
});
