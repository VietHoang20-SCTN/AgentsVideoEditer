#!/usr/bin/env node
import { config } from 'dotenv'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import * as path from 'path'

// Load .env from project root
config({ path: path.join(process.cwd(), '.env') })

const IS_DRY_RUN = !process.argv.includes('--execute')
const GRACE_PERIOD_MS = 60 * 60 * 1000 // 1 hour — skip recently created files

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set')
    process.exit(1)
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

async function scanDir(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await scanDir(fullPath))
    else files.push(fullPath)
  }
  return files
}

async function main() {
  const uploadsDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), 'uploads')

  if (!fs.existsSync(uploadsDir)) {
    console.log(`Uploads dir not found: ${uploadsDir}`)
    process.exit(0)
  }

  console.log(`Uploads dir: ${uploadsDir}`)
  console.log(`Mode: ${IS_DRY_RUN ? 'DRY RUN (pass --execute to delete)' : 'EXECUTE'}`)
  console.log()

  const prisma = createPrisma()

  try {
    // Get all known storageKeys from DB
    const assets = await prisma.mediaAsset.findMany({ select: { storageKey: true } })
    const knownKeys = new Set(assets.map(a => a.storageKey))
    console.log(`DB: ${knownKeys.size} known storageKey(s)`)

    // Scan all files
    const allFiles = await scanDir(uploadsDir)
    const now = Date.now()

    let orphanCount = 0
    let orphanBytes = 0
    let deletedBytes = 0
    let skippedRecent = 0

    for (const filePath of allFiles) {
      const stat = await fs.promises.stat(filePath)

      // Skip recent files (grace period)
      if (now - stat.mtimeMs < GRACE_PERIOD_MS) {
        skippedRecent++
        continue
      }

      // Compute storageKey relative to uploadsDir (normalize to forward slashes)
      const storageKey = path.relative(uploadsDir, filePath).replace(/\\/g, '/')

      if (!knownKeys.has(storageKey)) {
        orphanCount++
        orphanBytes += stat.size
        console.log(`ORPHAN: ${storageKey} (${stat.size} bytes)`)

        if (!IS_DRY_RUN) {
          await fs.promises.unlink(filePath)
          deletedBytes += stat.size
        }
      }
    }

    console.log()
    console.log(`Scanned ${allFiles.length} files, skipped ${skippedRecent} recent (< 1h old)`)
    console.log(`Found ${orphanCount} orphans (${orphanBytes} bytes)`)

    if (IS_DRY_RUN) {
      console.log('DRY RUN — pass --execute to actually delete')
    } else {
      console.log(`Deleted ${deletedBytes} bytes`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
