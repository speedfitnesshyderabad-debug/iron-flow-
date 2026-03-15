
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagSales() {
  console.log('--- Testing Sales Table ---');
  
  // 1. Basic count
  const { count, error: countError } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('Error fetching count:', countError);
  } else {
    console.log('Total sales count:', count);
  }

  // 2. Sample data with join
  console.log('\n--- Fetching sample sales with users join ---');
  const { data, error: joinError } = await supabase
    .from('sales')
    .select('*, member:users!memberId(name, memberId)')
    .limit(5);

  if (joinError) {
    console.error('Join Error:', joinError);
  } else {
    console.log('Sample data fetched:', data?.length || 0, 'rows');
    if (data && data.length > 0) {
      console.log('First row invoice:', data[0].invoiceNo);
      console.log('First row member name:', data[0].member?.name || 'MISSING');
    }
  }

  // 3. Check for specific columns
  console.log('\n--- Checking column names ---');
  const { data: colData, error: colError } = await supabase
    .from('sales')
    .select('*')
    .limit(1);
    
  if (colError) {
    console.error('Column check error:', colError);
  } else if (colData && colData.length > 0) {
    console.log('Columns found:', Object.keys(colData[0]));
  } else {
    console.log('No data to check columns.');
  }
}

diagSales();
