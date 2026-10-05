-- Concorrência otimista nos espaços (ADR 005): os espaços existentes começam na versão 1
ALTER TABLE "spaces" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
