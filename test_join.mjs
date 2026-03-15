
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testJoin() {
  console.log('Testing join: sales -> users!memberId');
  const { data, error } = await supabase
    .from('sales')
    .select('*, member:users!memberId(name, memberId)')
    .limit(1);

  if (error) {
    console.error('Join Error:', error);
  } else {
    console.log('Join Success! Data:', data);
  }
}

testJoin();
