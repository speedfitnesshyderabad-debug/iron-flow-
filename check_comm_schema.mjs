import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log('Checking communications table schema...');
    const { data, error } = await supabase.from('communications').select('*').limit(1);
    
    if (error) {
        console.error('Error fetching communications:', error.message);
        return;
    }
    
    if (data && data.length > 0) {
        console.log('Sample record keys:', Object.keys(data[0]));
        console.log('Sample record:', data[0]);
    } else {
        console.log('No records found in communications table.');
    }
    
    // Check if we can add a column if it's missing (simulation)
    // Actually let's just create a test notification
}

checkSchema();
