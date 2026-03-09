import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qnjpjknhobauyfqjyjcr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o'
);

async function checkManoj() {
    console.log("Looking for IF-RECON-9789...");
    const { data: users, error: uErr } = await supabase.from('users').select('*').eq('memberId', 'IF-RECON-9789');

    if (uErr) console.error("User Err:", uErr);
    console.log("Users Found:", users);

    if (users && users.length > 0) {
        const { data: subs, error: sErr } = await supabase.from('subscriptions').select('*').eq('memberId', users[0].id);
        console.log("Subscriptions Found:", subs);
        console.log("Subs Err:", sErr);
    } else {
        // maybe try name ilike
        const { data: usersByName } = await supabase.from('users').select('*').ilike('name', '%Manoj%');
        console.log("Users by Name:", usersByName);
    }
}

checkManoj();
