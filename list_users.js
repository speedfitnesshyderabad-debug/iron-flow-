
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, role, email, branchId');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${users?.length || 0} users total.`);
    const roles = [...new Set(users.map(u => u.role))];
    console.log('Roles found:', roles);

    const trainers = users.filter(u => u.role === 'TRAINER');
    console.log(`Trainers (strict 'TRAINER'): ${trainers.length}`);
    if (trainers.length > 0) {
        console.log('Sample trainers:', JSON.stringify(trainers.slice(0, 5), null, 2));
    } else {
        console.log('All user roles:', users.map(u => `${u.name}: ${u.role}`).join(', '));
    }
}

listUsers();
