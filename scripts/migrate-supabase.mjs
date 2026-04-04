// ============================================================
// Supabase Data Migration Script
// Old: qnjpjknhobauyfqjyjcr  →  New: pndiqjfpmgprdirphifb
// ============================================================
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// ─── CONFIG ────────────────────────────────────────────────
const SOURCE_URL = 'https://qnjpjknhobauyfqjyjcr.supabase.co'
const SOURCE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxMzY2MiwiZXhwIjoyMDg2Nzg5NjYyfQ.D9K--P0YyVALeiE2iI1_deaA1x-YC8vyG9bAVAwUVtk'

const DEST_URL = 'https://pndiqjfpmgprdirphifb.supabase.co'
const DEST_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZGlxamZwbWdwcmRpcnBoaWZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIyMjM5NiwiZXhwIjoyMDkwNzk4Mzk2fQ.xuOhkoQa3N4NHStc09zSi9Vl6cXlPKg_ySZCrRgyQq0'

const BATCH_SIZE = 500 // rows per insert batch

// ─── CLIENTS ───────────────────────────────────────────────
const source = createClient(SOURCE_URL, SOURCE_SERVICE_KEY, {
  auth: { persistSession: false }
})
const dest = createClient(DEST_URL, DEST_SERVICE_KEY, {
  auth: { persistSession: false }
})

// ─── HELPERS ────────────────────────────────────────────────
const log = (msg) => console.log(msg)
const ok  = (msg) => console.log(`  ✅ ${msg}`)
const err = (msg) => console.error(`  ❌ ${msg}`)
const info = (msg) => console.log(`  ℹ️  ${msg}`)

// Get all user tables using multiple fallback methods
async function getTables(baseUrl, serviceKey) {
  // Method 1: Try information_schema with Accept-Profile header
  try {
    const res = await fetch(
      `${baseUrl}/rest/v1/tables?select=table_name&table_schema=eq.public&table_type=eq.BASE%20TABLE&order=table_name`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Accept-Profile': 'information_schema',
        },
      }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((r) => r.table_name)
      }
    }
  } catch (_) {}

  // Method 2: Try querying pg_tables via RPC (if exec_sql function exists)
  try {
    const res = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data.map((r) => r.table_name)
    }
  } catch (_) {}

  // Method 3: Use known table list by probing each table
  const KNOWN_TABLES = [
    'users', 'sales',
    'admins', 'announcements', 'attendance', 'branch_gallery',
    'branch_offers', 'branches', 'class_bookings', 'classes',
    'equipment', 'expenses', 'hero_sections', 'inventory',
    'leads', 'member_plans', 'members', 'notifications',
    'organizations', 'payments', 'plans', 'staff',
    'profiles', 'roles', 'settings', 'subscriptions',
    'workout_logs', 'body_measurements', 'diet_plans',
    'trainer_assignments', 'feedback', 'referrals',
  ]
  const client = createClient(baseUrl, serviceKey, { auth: { persistSession: false } })
  const existing = []
  for (const t of KNOWN_TABLES) {
    const { error } = await client.from(t).select('id').limit(1)
    // If no error OR error is about no rows/RLS (not 'table not found'), table exists
    if (!error || (error.code !== '42P01' && error.code !== 'PGRST200')) {
      existing.push(t)
    }
  }
  if (existing.length > 0) return existing

  throw new Error('Could not discover tables via any method')
}

// Get all rows from a table with pagination
async function fetchAllRows(client, tableName) {
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .range(from, from + BATCH_SIZE - 1)

    if (error) {
      err(`Fetch error on ${tableName} (offset ${from}): ${error.message}`)
      break
    }
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < BATCH_SIZE) break
    from += BATCH_SIZE
  }
  return rows
}

// Insert rows into destination in batches, skipping conflicts
async function insertRows(client, tableName, rows) {
  let inserted = 0
  let skipped = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    // Try plain insert first
    const { error: insertErr } = await client.from(tableName).insert(batch)
    if (!insertErr) {
      inserted += batch.length
      continue
    }

    // If duplicate key error, try upsert
    if (insertErr.code === '23505') {
      const { error: upsertErr } = await client
        .from(tableName)
        .upsert(batch, { ignoreDuplicates: true })
      if (!upsertErr) {
        inserted += batch.length
        continue
      }
      err(`Upsert error on ${tableName}: ${upsertErr.message}`)
    } else {
      err(`Insert error on ${tableName} (code: ${insertErr.code}): ${insertErr.message}`)
    }

    // Try row-by-row as last resort
    let rowInserted = 0
    for (const row of batch) {
      const { error: rowErr } = await client.from(tableName).insert(row)
      if (!rowErr) {
        rowInserted++
      } else if (rowErr.code !== '23505') {
        // Only log non-duplicate errors
        info(`  Row skip [${tableName}]: ${rowErr.message} | row id: ${row.id}`)
        skipped++
      } else {
        skipped++ // duplicate, skip silently
      }
    }
    inserted += rowInserted
  }
  return { inserted, skipped }
}

// ─── MAIN ───────────────────────────────────────────────────
async function main() {
  log('\n🚀 Supabase Migration Starting...')
  log(`   Source: ${SOURCE_URL}`)
  log(`   Dest  : ${DEST_URL}\n`)

  // 1. Verify connectivity to both projects
  log('─── Step 1: Verifying connectivity ───')
  const { error: srcErr } = await source.from('branches').select('id').limit(1)
  const { error: dstErr } = await dest.from('branches').select('id').limit(1)

  if (srcErr && srcErr.code !== 'PGRST116') {
    // PGRST116 = table does not exist (ok, table might be named differently)
    log(`  Source connection: ⚠️  ${srcErr.message}`)
  } else {
    ok('Source project connected')
  }
  if (dstErr && dstErr.code !== 'PGRST116') {
    log(`  Dest connection: ⚠️  ${dstErr.message}`)
  } else {
    ok('Destination project connected')
  }

  // 2. Get table list from source
  log('\n─── Step 2: Discovering tables in source ───')
  let sourceTables
  try {
    sourceTables = await getTables(SOURCE_URL, SOURCE_SERVICE_KEY)
    ok(`Found ${sourceTables.length} tables: ${sourceTables.join(', ')}`)
  } catch (e) {
    err(`Could not list tables: ${e.message}`)
    process.exit(1)
  }

  // 3. Get table list from destination (to check which tables exist)
  log('\n─── Step 3: Checking destination tables ───')
  let destTables = []
  try {
    destTables = await getTables(DEST_URL, DEST_SERVICE_KEY)
    ok(`Destination has ${destTables.length} tables: ${destTables.join(', ')}`)
  } catch (e) {
    info(`Could not list destination tables: ${e.message}`)
  }

  const missingInDest = sourceTables.filter((t) => !destTables.includes(t))
  if (missingInDest.length > 0) {
    log(`\n  ⚠️  Tables NOT found in destination (schema may not be applied yet):`)
    missingInDest.forEach((t) => log(`     - ${t}`))
    log(`\n  👉 Please run the schema SQL in your new project's SQL editor first.`)
    log(`     Then re-run this migration script.\n`)
  }

  // 4. Migrate each table that exists in both
  log('\n─── Step 4: Migrating data ───')
  const tablesToMigrate = sourceTables.filter((t) => destTables.includes(t))

  if (tablesToMigrate.length === 0) {
    err('No matching tables found in destination. Aborting data copy.')
    process.exit(1)
  }

  const results = []
  let totalRows = 0

  // Migrate in dependency-safe order (less likely to hit FK conflicts first)
  const ORDER_HINT = [
    'organizations', 'branches', 'users', 'admins', 'members', 'staff',
    'plans', 'member_plans', 'sales', 'payments', 'subscriptions', 'attendance',
    'announcements', 'notifications', 'equipment', 'inventory',
    'classes', 'class_bookings', 'leads', 'expenses',
    'hero_sections', 'branch_offers', 'branch_gallery',
  ]
  const ordered = [
    ...ORDER_HINT.filter((t) => tablesToMigrate.includes(t)),
    ...tablesToMigrate.filter((t) => !ORDER_HINT.includes(t)),
  ]

  for (const tableName of ordered) {
    process.stdout.write(`\n  📦 ${tableName} ...`)
    const rows = await fetchAllRows(source, tableName)
    if (rows.length === 0) {
      process.stdout.write(` 0 rows (skipped)\n`)
      results.push({ table: tableName, rows: 0, inserted: 0, skipped: 0 })
      continue
    }
    const { inserted, skipped } = await insertRows(dest, tableName, rows)
    totalRows += inserted
    process.stdout.write(` ${rows.length} rows → inserted: ${inserted}, skipped: ${skipped}\n`)
    results.push({ table: tableName, rows: rows.length, inserted, skipped })
  }

  // 5. Summary
  log('\n─── Migration Summary ───')
  results.forEach((r) => {
    log(`  ${r.table.padEnd(30)} ${r.rows} rows  →  ✅ ${r.inserted} inserted  ⏭️  ${r.skipped} skipped`)
  })
  log(`\n  Total rows migrated: ${totalRows}`)
  ok('Migration complete!\n')

  // 6. Save results to file
  const report = {
    migratedAt: new Date().toISOString(),
    source: SOURCE_URL,
    destination: DEST_URL,
    totalRows,
    tables: results,
  }
  fs.writeFileSync('migration-report.json', JSON.stringify(report, null, 2))
  ok('Report saved to migration-report.json')
}

main().catch((e) => {
  console.error('\n💥 Fatal error:', e)
  process.exit(1)
})
