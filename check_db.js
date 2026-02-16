import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qnjpjknhobauyfqjyjcr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o'
);

async function check() {
  console.log('Checking connection...');
  try {
    const { data, error } = await supabase.from('users').select('*').limit(5);
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      console.log('Success! Users found:', data.length);
      console.log(data);
    }
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

check();
