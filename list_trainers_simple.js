
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listData() {
    const { data: users } = await supabase.from('users').select('name, role, branchId');
    const trainers = users?.filter(u => u.role === 'TRAINER') || [];
    console.log(`Found ${trainers.length} trainers:`);
    trainers.forEach(t => console.log(`- ${t.name} (Branch: ${t.branchId})`));

    const { data: branches } = await supabase.from('branches').select('id, name');
    console.log(`\nFound ${branches?.length || 0} branches:`);
    branches?.forEach(b => console.log(`- ${b.id}: ${b.name}`));
}

listData();
