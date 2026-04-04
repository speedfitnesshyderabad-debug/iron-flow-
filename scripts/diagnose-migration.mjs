// Quick diagnostic - output everything to JSON
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SOURCE_URL = 'https://qnjpjknhobauyfqjyjcr.supabase.co'
const SOURCE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxMzY2MiwiZXhwIjoyMDg2Nzg5NjYyfQ.D9K--P0YyVALeiE2iI1_deaA1x-YC8vyG9bAVAwUVtk'

const DEST_URL = 'https://pndiqjfpmgprdirphifb.supabase.co'
const DEST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZGlxamZwbWdwcmRpcnBoaWZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIyMjM5NiwiZXhwIjoyMDkwNzk4Mzk2fQ.xuOhkoQa3N4NHStc09zSi9Vl6cXlPKg_ySZCrRgyQq0'

const source = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } })
const dest = createClient(DEST_URL, DEST_KEY, { auth: { persistSession: false } })

async function run() {
  const results = {}

  // 1. Fetch one branch from source
  const { data: srcBranches, error: srcErr } = await source.from('branches').select('*').limit(1)
  results.source_branch_fetch = { data: srcBranches, error: srcErr }

  // 2. Try inserting into dest
  if (srcBranches && srcBranches.length > 0) {
    const { data: ins, error: insErr } = await dest.from('branches').insert(srcBranches[0]).select()
    results.dest_branch_insert = { data: ins, error: insErr }
  }

  // 3. Fetch one plan from source
  const { data: srcPlans, error: srcPlanErr } = await source.from('plans').select('*').limit(1)
  results.source_plan_fetch = { data: srcPlans, error: srcPlanErr }

  // 4. Try inserting plan
  if (srcPlans && srcPlans.length > 0) {
    const { data: planIns, error: planInsErr } = await dest.from('plans').insert(srcPlans[0]).select()
    results.dest_plan_insert = { data: planIns, error: planInsErr }
  }

  // 5. Check dest branches
  const { data: destBranches, error: destBranchErr } = await dest.from('branches').select('*').limit(5)
  results.dest_branches_current = { data: destBranches, error: destBranchErr }

  // 6. Check what subscriptions look like (big table)
  const { data: srcSub, error: srcSubErr } = await source.from('subscriptions').select('*').limit(1)
  results.source_subscription = { data: srcSub, error: srcSubErr }

  if (srcSub && srcSub.length > 0) {
    const { data: subIns, error: subInsErr } = await dest.from('subscriptions').insert(srcSub[0]).select()
    results.dest_subscription_insert = { data: subIns, error: subInsErr }
  }

  fs.writeFileSync('diag-results.json', JSON.stringify(results, null, 2))
  console.log('Results written to diag-results.json')
}

run().catch(e => {
  fs.writeFileSync('diag-results.json', JSON.stringify({ fatalError: e.message, stack: e.stack }, null, 2))
  console.error(e)
})
