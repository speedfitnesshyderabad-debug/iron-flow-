// Schema diff + SQL generator + data migrator
// Reads column names from source & dest, generates ALTER TABLE SQL, then migrates data
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SOURCE_URL = 'https://qnjpjknhobauyfqjyjcr.supabase.co'
const SOURCE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxMzY2MiwiZXhwIjoyMDg2Nzg5NjYyfQ.D9K--P0YyVALeiE2iI1_deaA1x-YC8vyG9bAVAwUVtk'
const DEST_URL = 'https://pndiqjfpmgprdirphifb.supabase.co'
const DEST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZGlxamZwbWdwcmRpcnBoaWZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIyMjM5NiwiZXhwIjoyMDkwNzk4Mzk2fQ.xuOhkoQa3N4NHStc09zSi9Vl6cXlPKg_ySZCrRgyQq0'

const source = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } })
const dest = createClient(DEST_URL, DEST_KEY, { auth: { persistSession: false } })

const TABLES = [
  'branches', 'plans', 'members', 'admins', 'staff',
  'subscriptions', 'attendance', 'payments',
  'member_plans', 'inventory', 'expenses',
  'announcements', 'notifications', 'equipment',
  'hero_sections', 'branch_offers', 'branch_gallery',
  'leads', 'classes', 'class_bookings',
  'feedback', 'referrals',
]

// Infer PostgreSQL type from a JS value
function inferType(val) {
  if (val === null || val === undefined) return 'TEXT'
  if (typeof val === 'boolean') return 'BOOLEAN'
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return 'INTEGER'
    return 'NUMERIC'
  }
  if (typeof val === 'object') return 'JSONB'
  if (typeof val === 'string') {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'DATE'
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return 'TIMESTAMPTZ'
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(val)) return 'TIME'
    return 'TEXT'
  }
  return 'TEXT'
}

async function getColumns(client, tableName) {
  // Get a batch of rows to detect all possible columns
  const { data, error } = await client.from(tableName).select('*').limit(10)
  if (error || !data || data.length === 0) return {}
  
  const colMap = {}
  for (const row of data) {
    for (const [key, val] of Object.entries(row)) {
      if (!(key in colMap)) {
        colMap[key] = inferType(val)
      }
    }
  }
  return colMap
}

async function run() {
  const results = {
    schemaDiff: {},
    sqlToApply: [],
  }

  const lines = [
    '-- ============================================================',
    '-- TITAN GYM - SCHEMA PATCH FOR NEW PROJECT',
    '-- Run this in: https://supabase.com → SQL Editor',
    '-- Project: pndiqjfpmgprdirphifb',
    '-- ============================================================',
    '',
  ]

  for (const table of TABLES) {
    console.log(`Checking schema: ${table}...`)
    
    const srcCols = await getColumns(source, table)
    const dstCols = await getColumns(dest, table)
    
    const srcColNames = Object.keys(srcCols)
    const dstColNames = Object.keys(dstCols)
    
    const missing = srcColNames.filter(c => !dstColNames.includes(c))
    
    if (missing.length === 0) {
      console.log(`  ✅ ${table}: schema OK (${srcColNames.length} cols)`)
      results.schemaDiff[table] = { status: 'ok', count: srcColNames.length }
    } else {
      console.log(`  ⚠️  ${table}: missing ${missing.length} columns: ${missing.join(', ')}`)
      results.schemaDiff[table] = { status: 'missing', missing, srcCols: srcColNames, dstCols: dstColNames }
      
      lines.push(`-- TABLE: ${table}`)
      for (const col of missing) {
        const type = srcCols[col] || 'TEXT'
        // Use quotes for camelCase column names
        const quotedCol = /[A-Z]/.test(col) ? `"${col}"` : col
        lines.push(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${quotedCol} ${type};`)
        results.sqlToApply.push(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${quotedCol} ${type};`)
      }
      lines.push('')
    }
  }

  // Also check for tables in source that don't exist in dest at all
  lines.push('')
  lines.push('-- ============================================================')
  lines.push('-- Check if any source tables are entirely missing from destination')
  lines.push('-- ============================================================')

  const missingTables = []
  for (const table of TABLES) {
    const { error } = await dest.from(table).select('id').limit(1)
    if (error && (error.code === '42P01' || error.code === 'PGRST200')) {
      missingTables.push(table)
      console.log(`  ❌ Table ${table} does not exist in destination!`)
    }
  }

  if (missingTables.length > 0) {
    lines.push(`-- Missing tables: ${missingTables.join(', ')}`)
    results.missingTables = missingTables
  }

  // Write the SQL patch file
  const sql = lines.join('\n')
  fs.writeFileSync('schema-patch.sql', sql)
  fs.writeFileSync('schema-diff.json', JSON.stringify(results, null, 2))
  
  console.log('\n📄 Files written:')
  console.log('   schema-diff.json  - Full column diff')
  console.log('   schema-patch.sql  - SQL to run in Supabase dashboard')
  console.log('\n👉 Next: Run schema-patch.sql in the new project SQL editor, then re-run the migration!')
}

run().catch(e => {
  fs.writeFileSync('schema-diff.json', JSON.stringify({ error: e.message, stack: e.stack }, null, 2))
  console.error(e)
  process.exit(1)
})
