import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qnjpjknhobauyfqjyjcr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o'
);

async function debugConnection() {
    console.log('\n🔍 Debugging Database Connection\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Can we connect?
        console.log('\n📡 Test 1: Connection Test');
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('count');

        if (testError) {
            console.log('❌ Connection Error:', testError.message);
            console.log('Details:', testError);
            return;
        }
        console.log('✅ Connection successful!');

        // Test 2: Fetch all users
        console.log('\n👥 Test 2: Fetching Users');
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('*');

        if (userError) {
            console.log('❌ Error fetching users:', userError.message);
            console.log('Details:', userError);
            return;
        }

        console.log(`✅ Found ${users?.length || 0} users`);

        if (users && users.length > 0) {
            console.log('\n📋 User Details:');
            users.forEach((u, i) => {
                console.log(`\n${i + 1}. ${u.name}`);
                console.log(`   Email: ${u.email}`);
                console.log(`   Role: ${u.role}`);
                console.log(`   ID: ${u.id}`);
                console.log(`   Branch: ${u.branchId || 'NULL'}`);
            });

            // Test 3: Try to find a specific user
            console.log('\n🔍 Test 3: Finding "owner@gym.in"');
            const ownerUser = users.find(u => u.email.toLowerCase() === 'owner@gym.in');
            if (ownerUser) {
                console.log('✅ Found owner user:');
                console.log(JSON.stringify(ownerUser, null, 2));
            } else {
                console.log('❌ Could not find owner@gym.in');
            }

            // Test 4: Check data types
            console.log('\n🔍 Test 4: Data Type Check');
            const firstUser = users[0];
            console.log('Email type:', typeof firstUser.email);
            console.log('Role type:', typeof firstUser.role);
            console.log('Role value:', firstUser.role);
            console.log('Shifts:', firstUser.shifts);
            console.log('Shifts type:', typeof firstUser.shifts);

        } else {
            console.log('❌ No users found in database!');
        }

        // Test 5: Check branches
        console.log('\n🏢 Test 5: Checking Branches');
        const { data: branches, error: branchError } = await supabase
            .from('branches')
            .select('*');

        if (branches) {
            console.log(`✅ Found ${branches.length} branches`);
            branches.forEach(b => console.log(`   - ${b.name}`));
        }

    } catch (error) {
        console.error('\n💥 Unexpected Error:', error);
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

debugConnection();
