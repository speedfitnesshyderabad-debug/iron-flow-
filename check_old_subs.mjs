import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qnjpjknhobauyfqjyjcr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o'
);

async function checkOldMemberIds() {
    const { data: users } = await supabase.from('users').select('id, name, "memberId"').ilike('name', '%RASALA%');
    console.log('Users matching RASALA:', users);

    if (users && users.length > 0) {
        const user = users[0];

        // Check if subscription exists using the string "memberId" instead of UUID
        const { data: subStringTest } = await supabase.from('subscriptions').select('*').eq('memberId', user.memberId);
        console.log(`Subscriptions using string MemberID (${user.memberId}):`, subStringTest);

        // Also just dump ALL subscriptions to see their memberId format
        const { data: allSubs } = await supabase.from('subscriptions').select('id, "memberId"').limit(5);
        console.log('Sample of memberIds in subscriptions table:', allSubs);
    }
}

checkOldMemberIds();
