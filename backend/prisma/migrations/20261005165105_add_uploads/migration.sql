-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "data" BYTEA NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uploads_sha256_key" ON "uploads"("sha256");

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SQL manual. PNG, JPEG, GIF e WebP já vêm comprimidos: EXTERNAL guarda o bytea fora da linha
-- (TOAST) sem tentar comprimir de novo, o que só gastaria CPU na escrita e na leitura.
ALTER TABLE "uploads" ALTER COLUMN "data" SET STORAGE EXTERNAL;
