import { existsSync } from "node:fs"
import { mkdirSync } from "node:fs"
import path from "node:path"

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

import { PrismaClient } from "@/generated/prisma/client"

function resolveRepoRoot() {
  const cwd = process.cwd()
  const workspaceRoot = path.resolve(cwd, "../..")

  if (
    existsSync(path.join(cwd, "app")) &&
    existsSync(path.join(cwd, "package.json")) &&
    existsSync(path.join(workspaceRoot, "pnpm-workspace.yaml"))
  ) {
    return workspaceRoot
  }

  return cwd
}

const repoRoot = resolveRepoRoot()
const dataDir = path.join(repoRoot, ".data")
export { dataDir }
export const databasePath = path.join(dataDir, "ai-canvas.sqlite")

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? `file:${databasePath}`
}

const globalForPrisma = globalThis as unknown as {
  aiCanvasPrisma?: PrismaClient
  aiCanvasPrismaReady?: Promise<void>
}

mkdirSync(dataDir, { recursive: true })

export const prisma =
  globalForPrisma.aiCanvasPrisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: getDatabaseUrl() }),
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.aiCanvasPrisma = prisma
}

export function initDatabase() {
  globalForPrisma.aiCanvasPrismaReady ??= (async () => {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL")
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000")
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON")
  })()

  return globalForPrisma.aiCanvasPrismaReady
}
