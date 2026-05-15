import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "prisma/config"

const repoRoot = path.dirname(fileURLToPath(import.meta.url))
const databaseUrl = process.env.DATABASE_URL ?? `file:${path.join(repoRoot, ".data", "ai-canvas.sqlite")}`

export default defineConfig({
  schema: "apps/web/prisma/schema.prisma",
  migrations: {
    path: "apps/web/prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
})
