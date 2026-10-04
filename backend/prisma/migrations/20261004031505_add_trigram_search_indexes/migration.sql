-- Extensão de trigramas: permite indexar buscas por substring (ILIKE %termo%) com GIN.
-- Adicionada à mão: o Prisma não gerencia extensões sem preview feature.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "pages_title_trgm_idx" ON "pages" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "pages_content_trgm_idx" ON "pages" USING GIN ("content" gin_trgm_ops);
