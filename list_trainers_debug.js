
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTrainers() {
    const { data: trainers, error } = await supabase
        .from('users')
        .select('id, name, role, branchId')
        .eq('role', 'TRAINER');

    console.log('--- TRAINERS IN DB ---');
    if (error) console.error(error);
    else console.log(JSON.stringify(trainers, null, 2));

    const { data: branches } = await supabase.from('branches').select('id, name');
    console.log('\n--- BRANCHES IN DB ---');
    console.log(JSON.stringify(branches, null, 2));
}

listTrainers();
