import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsers() {
    console.log('Fetching users...');
    const { data, error, count } = await supabase
        .from('users')
        .select('name, role', { count: 'exact' })
        .limit(10);

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${count} users. Showing up to 10:`);
    console.log(JSON.stringify(data, null, 2));
}

testUsers();
