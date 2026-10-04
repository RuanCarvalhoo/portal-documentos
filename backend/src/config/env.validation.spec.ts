import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults for optional variables', () => {
    expect(validateEnv({ DATABASE_URL: 'postgresql://localhost/db' })).toMatchObject({
      DATABASE_URL: 'postgresql://localhost/db',
      PORT: 3001,
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });

  it('converts PORT to a number', () => {
    expect(validateEnv({ DATABASE_URL: 'postgresql://x', PORT: '4000' }).PORT).toBe(4000);
  });

  it('fails fast when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL');
  });

  it('rejects a PORT that is not a positive integer', () => {
    expect(() => validateEnv({ DATABASE_URL: 'postgresql://x', PORT: 'abc' })).toThrow('PORT');
  });
});

describe('validateEnv edge cases', () => {
  const base = { DATABASE_URL: 'postgresql://x' };

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
