
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllData() {
    const { data: bData, error: bError } = await supabase.from('branches').select('*');
    console.log('--- BRANCHES ---');
    if (bError) console.error('Error:', bError);
    else console.log(`Found ${bData?.length || 0} branches.`);

    const { data: pData, error: pError } = await supabase.from('plans').select('*');
    console.log('\n--- PLANS ---');
    if (pError) console.error('Error:', pError);
    else console.log(`Found ${pData?.length || 0} plans.`);

    const { data: uData, error: uError } = await supabase.from('users').select('*');
    console.log('\n--- USERS ---');
    if (uError) console.error('Error:', uError);
    else {
        console.log(`Found ${uData?.length || 0} users.`);
        console.log('Roles present:', [...new Set(uData.map(u => u.role))]);
        const trainers = uData.filter(u => u.role === 'TRAINER');
        console.log(`Trainers Count: ${trainers.length}`);
        if (trainers.length > 0) {
            console.log('Trainers:', trainers.map(t => `${t.name} (${t.branchId})`).join(', '));
        }
    }
}

checkAllData();
