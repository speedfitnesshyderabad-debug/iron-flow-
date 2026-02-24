
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTrainer() {
    console.log('Seeding trainer...');

    // 1. Get branch ID (fallback to b1 if not found)
    const { data: branches } = await supabase.from('branches').select('id');
    const branchId = branches?.[0]?.id || 'b1';

    // 2. Insert a mock trainer
    const { data, error } = await supabase
        .from('users')
        .upsert({
            id: 'trainer-mock-1',
            name: 'Rohan Singh (Elite Coach)',
            email: 'rohan@ironflow.in',
            role: 'TRAINER',
            branchId: branchId,
            avatar: 'https://i.pravatar.cc/150?u=rohan',
            phone: '+91 98765 00001'
        })
        .select();

    if (error) {
        console.error('Error seeding trainer:', error);
    } else {
        console.log('Successfully seeded trainer:', JSON.stringify(data, null, 2));
    }
}

seedTrainer();
