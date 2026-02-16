import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStaffBranches() {
    console.log('\n🔍 Checking Staff Branch Assignments...\n');

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .neq('role', 'MEMBER');

        if (error) {
            console.error('❌ Error fetching staff:', error);
            return;
        }

        if (!users || users.length === 0) {
            console.log('⚠️  No staff found');
            return;
        }

        console.log(`✅ Found ${users.length} staff member(s)\n`);

        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Branch ID: ${user.branchId || '❌ NOT SET'}`);

            if (!user.branchId) {
                console.log(`   ⚠️  WARNING: No branch assigned! This staff can check in anywhere.`);
            }
            console.log('');
        });

        // Get branch details
        const { data: branches } = await supabase
            .from('branches')
            .select('*');

        if (branches) {
            console.log('\n📍 Available Branches:');
            branches.forEach(b => {
                console.log(`   - ${b.id}: ${b.name}`);
            });
        }

    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

checkStaffBranches();
