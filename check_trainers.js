
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrainers() {
    const { data: trainers, error } = await supabase
        .from('users')
        .select('id, name, role, branchId')
        .eq('role', 'TRAINER');

    if (error) {
        console.error('Error fetching trainers:', error);
        return;
    }

    console.log('--- TRAINERS CHECK ---');
    console.log(`Found ${trainers?.length || 0} trainers.`);
    console.log(JSON.stringify(trainers, null, 2));

    const { data: member, error: memberError } = await supabase
        .from('users')
        .select('id, name, role, branchId')
        .eq('email', 'krishna@gmail.com')
        .single();

    if (memberError) {
        console.error('Error fetching member:', memberError);
    } else {
        console.log('\n--- MEMBER CHECK (krishna@gmail.com) ---');
        console.log(JSON.stringify(member, null, 2));
    }
}

checkTrainers();
