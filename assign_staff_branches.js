import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function assignBranchesToStaff() {
    console.log('\n🔧 Assigning Branches to Staff Members...\n');

    try {
        // Get all branches
        const { data: branches } = await supabase
            .from('branches')
            .select('*');

        if (!branches || branches.length === 0) {
            console.log('❌ No branches found');
            return;
        }

        console.log('📍 Available Branches:');
        branches.forEach((b, i) => {
            console.log(`   ${i + 1}. ${b.id} - ${b.name}`);
        });

        // Get all staff (non-members)
        const { data: staff } = await supabase
            .from('users')
            .select('*')
            .neq('role', 'MEMBER');

        if (!staff || staff.length === 0) {
            console.log('⚠️  No staff found');
            return;
        }

        console.log(`\n✅ Found ${staff.length} staff member(s)\n`);

        // Assign branches based on names or assign all to first branch
        const mumbaiBranch = branches.find(b => b.name.includes('Mumbai')) || branches[0];
        const bangaloreBranch = branches.find(b => b.name.includes('Bangalore')) || branches[0];

        let updated = 0;

        for (const user of staff) {
            // Skip if already has branch
            if (user.branchId) {
                console.log(`✓ ${user.name} already assigned to branch ${user.branchId}`);
                continue;
            }

            // Assign branch based on name/email or default to Mumbai
            let assignedBranch = mumbaiBranch;

            // Smart assignment based on name
            if (user.name.toLowerCase().includes('bangalore')) {
                assignedBranch = bangaloreBranch;
            }

            const { error } = await supabase
                .from('users')
                .update({ branchId: assignedBranch.id })
                .eq('id', user.id);

            if (error) {
                console.log(`❌ Failed to update ${user.name}:`, error.message);
            } else {
                console.log(`✅ ${user.name} (${user.role}) → ${assignedBranch.name}`);
                updated++;
            }
        }

        console.log(`\n✅ Successfully assigned ${updated} staff member(s) to branches!`);
        console.log('\n📝 Next Steps:');
        console.log('   1. Refresh your browser');
        console.log('   2. Try scanning wrong branch QR as staff');
        console.log('   3. Should see "Access Denied" error now! ✅');

    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

assignBranchesToStaff();
