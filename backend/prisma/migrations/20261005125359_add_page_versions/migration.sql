-- CreateTable
CREATE TABLE "page_versions" (
    "page_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "edited_by_id" UUID NOT NULL,
    "edited_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "page_versions_pkey" PRIMARY KEY ("page_id","version")
);

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Histórico de versões (SQL manual: o Prisma não gerencia triggers).
-- Antes de cada UPDATE que muda título ou conteúdo, guarda o estado anterior da página. No banco,
-- e não no código, para ser atômico com o UPDATE e valer para qualquer escrita. Mover a página
-- (parent_id/position) sem editar o texto não gera versão.
CREATE FUNCTION save_page_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO page_versions (page_id, version, title, content, edited_by_id, edited_at)
  VALUES (OLD.id, OLD.version, OLD.title, OLD.content, OLD.updated_by_id, OLD.updated_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER pages_save_version
  BEFORE UPDATE OF title, content ON pages
  FOR EACH ROW
  WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION save_page_version();
