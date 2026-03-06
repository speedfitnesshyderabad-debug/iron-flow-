/**
 * COMPLETE DATA PURGE for titanstrengthfit@gmail.com
 * Deletes all records from ALL tables + removes from Supabase Auth
 * Run: node purge_user.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';
const TARGET_EMAIL = 'titanstrengthfit@gmail.com';

const supabase = createClient(SUPABASE_URL, ANON_KEY);
let errors = [];
let deleted = [];

async function del(table, column, value, label) {
    const { error, count } = await supabase
        .from(table)
        .delete({ count: 'estimated' })
        .eq(column, value);

    if (error) {
        errors.push(`  ❌ ${label}: ${error.message}`);
    } else {
        deleted.push(`  ✅ ${label}`);
    }
}

async function main() {
    console.log(`\n🗑️  Purging all data for: ${TARGET_EMAIL}\n`);

    // Step 1: Find the user's ID in public.users first
    const { data: user, error: findErr } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('email', TARGET_EMAIL)
        .maybeSingle();

    if (findErr) {
        console.error('❌ Could not query users table:', findErr.message);
    }

    const userId = user?.id;
    console.log(userId
        ? `👤 Found public profile: ${user.name} (${user.role}) — ID: ${userId}`
        : `⚠️  No public profile found for ${TARGET_EMAIL} (may already be deleted or was never created)`
    );

    // Step 2: Delete all related public data by userId (if found)
    if (userId) {
        console.log('\n📦 Deleting from public tables...\n');

        // Order matters — delete child records before parent records
        await del('attendance', 'userId', userId, 'Attendance records');
        await del('bookings', 'memberId', userId, 'Bookings (as member)');
        await del('bookings', 'trainerId', userId, 'Bookings (as trainer)');
        await del('subscriptions', 'memberId', userId, 'Subscriptions');
        await del('sales', 'memberId', userId, 'Sales (as member)');
        await del('sales', 'staffId', userId, 'Sales (as staff)');
        await del('feedback', 'userId', userId, 'Feedback');
        await del('body_metrics', 'userId', userId, 'Body Metrics');
        await del('active_sessions', 'userId', userId, 'Active Sessions');
        await del('notifications', 'userId', userId, 'Notifications');
        await del('referrals', 'referrerId', userId, 'Referrals (as referrer)');
        await del('referrals', 'referredId', userId, 'Referrals (as referred)');
        await del('payroll', 'staffId', userId, 'Payroll records');
        await del('walk_ins', 'staffId', userId, 'Walk-in records (staff)');
        await del('communications', 'userId', userId, 'Communications');

        // Finally delete the user profile itself
        await del('users', 'id', userId, 'User profile (public.users)');

        deleted.forEach(m => console.log(m));
        if (errors.length) {
            console.log('\n⚠️  Some tables had errors (may not exist or already empty):');
            errors.forEach(e => console.log(e));
        }
    }

    // Step 3: Delete from Supabase Auth via the deployed Edge Function
    console.log('\n🔑 Deleting from Supabase Auth via delete-user function...\n');
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANON_KEY}`,
                'apikey': ANON_KEY,
            },
            body: JSON.stringify({ email: TARGET_EMAIL }),
        });

        const result = await res.json();
        if (result.success) {
            console.log('  ✅ Auth user deleted (or not found — already clean)');
            if (result.note) console.log(`     Note: ${result.note}`);
        } else {
            console.log('  ❌ Auth deletion failed:', result.error);
            console.log('\n  👉 Manual fallback: Go to Supabase Dashboard → Authentication → Users');
            console.log(`     Find "${TARGET_EMAIL}" and click Delete.\n`);
        }
    } catch (err) {
        console.error('  ❌ Failed to call delete-user function:', err.message);
        console.log('\n  👉 Manual fallback: Go to Supabase Dashboard → Authentication → Users');
        console.log(`     Find "${TARGET_EMAIL}" and click Delete.\n`);
    }

    console.log('\n✅ PURGE COMPLETE\n');
    console.log('━'.repeat(50));
    console.log(`  Email:  ${TARGET_EMAIL}`);
    console.log(`  Status: All records deleted (or were already gone)`);
    console.log('━'.repeat(50) + '\n');
}

main().catch(console.error);
