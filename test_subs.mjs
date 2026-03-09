import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    'https://qnjpjknhobauyfqjyjcr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o'
);

async function test() {
    const userNames = ['RASALA MAHESH', 'Chappidi Vinay', 'Manoj Kumar', 'Suman Tanuku', 'Rajinikanth'];
    const results = [];

    for (const name of userNames) {
        const { data: users, error: uErr } = await supabase.from('users').select('*').ilike('name', `%${name}%`);
        if (uErr) { console.error('Error fetching user:', uErr); continue; }

        for (const u of users || []) {
            const { data: subs, error: sErr } = await supabase.from('subscriptions').select('*').eq('memberId', u.id);
            results.push({
                user: { id: u.id, name: u.name, memberId: u.memberId },
                subscriptions: subs || []
            });
        }
    }

    fs.writeFileSync('test_output.json', JSON.stringify(results, null, 2));
}

test();
