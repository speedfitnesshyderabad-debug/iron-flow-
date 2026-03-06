/**
 * DIRECT PASSWORD RESET SCRIPT
 * 
 * This bypasses the email link flow entirely.
 * Run: node reset_password_direct.js
 * 
 * Requires: SUPABASE_SERVICE_ROLE_KEY in your .env file or hardcoded below.
 * Get it from: Supabase Dashboard → Project Settings → API → service_role key
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qnjpjknhobauyfqjyjcr.supabase.co';

// ⚠️ Replace this with your actual service_role key from the Supabase dashboard
// Project Settings → API → Project API keys → service_role (secret)
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'PASTE_SERVICE_ROLE_KEY_HERE';

// ===== CONFIG =====
const TARGET_EMAIL = 'titanstrengthfit@gmail.com';
const NEW_PASSWORD = 'Titan@2025';   // Change this to your desired password
// ==================

if (SERVICE_ROLE_KEY === 'PASTE_SERVICE_ROLE_KEY_HERE') {
    console.error('\n❌ ERROR: You need to set your service_role key!');
    console.error('   Get it from: Supabase Dashboard → Project Settings → API → service_role');
    console.error('   Then either:');
    console.error('     1. Set env var: $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..." (PowerShell)');
    console.error('     2. Or paste it directly into this script\n');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    }
});

async function resetPassword() {
    console.log(`\n🔐 Resetting password for: ${TARGET_EMAIL}\n`);

    // Step 1: Find the user in auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
        console.error('❌ Failed to list users:', listError.message);
        process.exit(1);
    }

    const authUser = users.find(u => u.email === TARGET_EMAIL);
    if (!authUser) {
        console.error(`❌ No auth user found for ${TARGET_EMAIL}`);
        console.error('   The account does not exist in Supabase Auth.');
        console.error('   Please re-register at: https://localhost:5001/#/register');
        process.exit(1);
    }

    console.log(`✅ Found auth user: ${authUser.id}`);
    console.log(`   Email confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`);

    // Step 2: Update password directly (no email needed)
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: NEW_PASSWORD,
        email_confirm: true,  // Mark email as confirmed so login works immediately
    });

    if (updateError) {
        console.error('❌ Failed to update password:', updateError.message);
        process.exit(1);
    }

    console.log('\n✅ SUCCESS! Password has been reset.\n');
    console.log('━'.repeat(40));
    console.log(`  Email:    ${TARGET_EMAIL}`);
    console.log(`  Password: ${NEW_PASSWORD}`);
    console.log('━'.repeat(40));
    console.log('\n👉 Go to https://localhost:5001/#/login and sign in with these credentials.\n');
}

resetPassword();
