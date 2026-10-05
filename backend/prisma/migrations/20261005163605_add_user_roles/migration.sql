-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'editor', 'reader');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "user_role" NOT NULL DEFAULT 'reader';

-- Dados (SQL manual). Antes dos perfis, qualquer conta editava tudo: as contas que já existem
-- viram editoras, para ninguém perder o que já fazia, e a mais antiga vira administradora, para
-- o banco não ficar sem ninguém que conceda perfis. Contas novas entram como leitoras (DEFAULT).
UPDATE "users" SET "role" = 'editor';
UPDATE "users" SET "role" = 'admin'
WHERE "id" = (SELECT "id" FROM "users" ORDER BY "created_at", "id" LIMIT 1);
