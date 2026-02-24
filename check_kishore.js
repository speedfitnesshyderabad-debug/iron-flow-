
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKishore() {
    const { data: users, error } = await supabase.from('users').select('*').eq('email', 'kishore@gmail.com');
    console.log('--- USERS WITH EMAIL kishore@gmail.com ---');
    if (error) console.error(error);
    else console.log(JSON.stringify(users, null, 2));

    if (users?.length === 0) {
        console.log('No user found in public.users table.');
    }
}

checkKishore();
