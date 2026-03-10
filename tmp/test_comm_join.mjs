import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDebug() {
    console.log('Fetching raw communications...');
    const { data, error, count } = await supabase
        .from('communications')
        .select('*', { count: 'exact' })
        .limit(10);

    if (error) {
        console.error('Error fetching raw:', error);
        return;
    }

    console.log(`Found ${count} total communications. Showing up to 10:`);
    console.log(JSON.stringify(data, null, 2));

    console.log('\nTesting Join...');
    const { data: joinedData, error: joinError } = await supabase
        .from('communications')
        .select('*, user:users!userId(name)')
        .limit(5);

    if (joinError) {
        console.error('Join Error:', joinError);
    } else {
        console.log('Joined Results:', JSON.stringify(joinedData, null, 2));
    }
}

testDebug();
