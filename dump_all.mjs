import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qnjpjknhobauyfqjyjcr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o'
);

async function dumpAll() {
    const { data: users, error: uErr } = await supabase.from('users').select('id, name, memberId');
    if (uErr) console.error(uErr);

    console.log(`Total users in DB: ${users?.length}`);
    const manoj = users?.find(u => u.name?.includes('Manoj') || u.memberId?.includes('9789'));
    console.log("Is Manoj in DB?", manoj ? "YES: " + JSON.stringify(manoj) : "NO");

    const vinay = users?.find(u => u.name?.includes('Vinay'));
    console.log("Is Vinay in DB?", vinay ? "YES: " + JSON.stringify(vinay) : "NO");
}

dumpAll();
