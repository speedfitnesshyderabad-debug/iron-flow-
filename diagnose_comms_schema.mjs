import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });
if (!process.env.VITE_SUPABASE_URL) dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  console.log('--- Diagnosing communications table ---');
  const { data, error, count } = await supabase
    .from('communications')
    .select('*', { count: 'exact' })
    .limit(1);

  if (error) {
    console.error('Error fetching communication:', error);
    return;
  }

  console.log('Total Count:', count);
  if (data && data.length > 0) {
    console.log('Columns found in first row:', Object.keys(data[0]));
    console.log('Sample Data:', data[0]);
  } else {
    console.log('No data found in communications table.');
  }

  // Check if users join works
  const { data: joinData, error: joinError } = await supabase
    .from('communications')
    .select('id, user:users!userId(name)')
    .limit(1);

  if (joinError) {
    console.error('Join error:', joinError);
  } else {
    console.log('Join successful:', joinData?.[0]);
  }
}

diagnose();
