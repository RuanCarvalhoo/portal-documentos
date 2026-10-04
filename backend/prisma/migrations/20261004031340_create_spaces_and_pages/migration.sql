-- CreateTable
CREATE TABLE "spaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "space_id" UUID NOT NULL,
    "parent_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pages_space_id_parent_id_position_idx" ON "pages"("space_id", "parent_id", "position");

-- CreateIndex
CREATE INDEX "pages_parent_id_idx" ON "pages"("parent_id");

-- CreateIndex
CREATE INDEX "pages_created_by_id_idx" ON "pages"("created_by_id");

-- CreateIndex
CREATE INDEX "pages_updated_by_id_idx" ON "pages"("updated_by_id");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
