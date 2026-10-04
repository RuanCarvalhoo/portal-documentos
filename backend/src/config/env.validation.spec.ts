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
