import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qnjpjknhobauyfqjyjcr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o'
);

async function verifyData() {
    console.log('\n📊 Database Verification Report\n');
    console.log('='.repeat(60));

    const { data: users } = await supabase.from('users').select('*');
    const { data: branches } = await supabase.from('branches').select('*');
    const { data: plans } = await supabase.from('plans').select('*');

    console.log(`\n✅ Branches: ${branches?.length || 0}`);
    branches?.forEach(b => console.log(`   - ${b.name}`));

    console.log(`\n✅ Users: ${users?.length || 0}`);
    users?.forEach(u => console.log(`   - ${u.email.padEnd(20)} | ${u.role.padEnd(15)} | ${u.name}`));

    console.log(`\n✅ Plans: ${plans?.length || 0}`);
    plans?.forEach(p => console.log(`   - ${p.name} (₹${p.price})`));

    console.log('\n' + '='.repeat(60));
    console.log('\n🔓 LOGIN INSTRUCTIONS');
    console.log('='.repeat(60));
    console.log('\n1. Open: http://localhost:5000/');
    console.log('2. Click any "Quick Demo" button to login instantly');
    console.log('3. OR enter email + password "ironflow2025"');
    console.log('\n✨ Try logging in as Super Admin: owner@gym.in\n');
}

verifyData();
