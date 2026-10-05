// Configuração do CLI do Prisma 7: schema, migrations, seed e a URL do banco (lida do .env)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // No Prisma 7 o seed fica no config (não no package.json) e não roda sozinho após migrate
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
