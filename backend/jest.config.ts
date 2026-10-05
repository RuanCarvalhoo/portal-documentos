import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  setupFiles: ['<rootDir>/test/setup-unit.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  // O client gerado pelo Prisma não é código do projeto
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/generated/**'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
