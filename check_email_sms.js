import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Change these to your real test recipient details
const TEST_EMAIL = 'krishnatanniru009@gmail.com';   // ← your test email
const TEST_PHONE = '+919999999999';                  // ← your test phone (E.164 format)
// ── END CONFIG ────────────────────────────────────────────────────────────────

const sep = '─'.repeat(55);

function mask(val, show = 8) {
    if (!val) return '❌ NOT SET';
    return val.substring(0, show) + '...' + ` (${val.length} chars)`;
}

// ─── 1. Fetch branch config ───────────────────────────────────────────────────
async function fetchBranches() {
    const { data, error } = await supabase.from('branches').select('*');
    if (error) throw new Error('Failed to fetch branches: ' + error.message);
    return data || [];
}

// ─── 2. Test Email via Supabase Edge Function ─────────────────────────────────
async function testEmail(branch) {
    console.log('\n📧  Testing EMAIL...');
    console.log(sep);

    const apiKey = branch?.emailApiKey;
    console.log(`Branch:         ${branch?.name || 'N/A'}`);
    console.log(`Email Provider: ${branch?.emailProvider || 'SENDGRID (default)'}`);
    console.log(`From Address:   ${branch?.emailFromAddress || 'noreply@ironflow.app'}`);
    console.log(`Branch API Key: ${apiKey ? mask(apiKey) : '⚠️  NOT SET — will use Supabase secret SENDGRID_API_KEY'}`);
    console.log(`Sending to:     ${TEST_EMAIL}`);
    console.log(sep);

    const endpoint = `${supabaseUrl}/functions/v1/send-email`;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
                to: TEST_EMAIL,
                subject: `🧪 Email Test — ${branch?.name || 'IronFlow'} [${new Date().toISOString()}]`,
                body: `This is a test email sent by the check_email_sms.js diagnostic script.\n\nIf you received this, email delivery is working correctly.\n\nTimestamp: ${new Date().toLocaleString()}`,
                category: 'ANNOUNCEMENT',
                fromEmail: branch?.emailFromAddress || 'noreply@ironflow.app',
                fromName: branch?.name || 'IronFlow Gym',
                branchName: branch?.name || 'IronFlow',
                apiKey: apiKey || undefined,
            }),
        });

        const responseText = await res.text();
        let parsed;
        try { parsed = JSON.parse(responseText); } catch { parsed = { raw: responseText }; }

        if (res.ok || res.status === 200 || res.status === 202) {
            console.log('✅  EMAIL: SUCCESS — Message accepted by SendGrid');
            console.log(`    Status: ${res.status}`);
            console.log(`    Check ${TEST_EMAIL} inbox (and spam folder).`);
        } else {
            console.log(`❌  EMAIL: FAILED — HTTP ${res.status}`);
            console.log(`    Response: ${JSON.stringify(parsed, null, 2)}`);
            console.log('\n🔧  Likely causes:');
            if (res.status === 401 || responseText.includes('authorization grant is invalid')) {
                console.log('    → SendGrid API key is INVALID or REVOKED.');
                console.log('      1. Go to https://app.sendgrid.com/settings/api_keys');
                console.log('      2. Create a new key with "Mail Send" permission');
                console.log('      3. Update Supabase Secret SENDGRID_API_KEY in:');
                console.log('         Dashboard → Project Settings → Edge Functions → Secrets');
                console.log('      4. Also update Branch Settings → Email API Key field in the app');
            } else if (res.status === 403) {
                console.log('    → Sender email not verified in SendGrid. Verify your "From" address.');
            } else if (res.status === 400) {
                console.log('    → Bad request — check "to" email and payload fields.');
            }
        }
    } catch (err) {
        console.log('❌  EMAIL: EXCEPTION');
        console.log(`    ${err.message}`);
    }
}

// ─── 3. Test SMS via provider ─────────────────────────────────────────────────
async function testSMS(branch) {
    console.log('\n📱  Testing SMS...');
    console.log(sep);

    if (!branch) {
        console.log('❌  SMS: No branch found. Cannot test.');
        return;
    }

    const provider = branch.smsProvider || 'NOT SET';
    const apiKey = branch.smsApiKey;
    const senderId = branch.smsSenderId;

    console.log(`Branch:       ${branch.name}`);
    console.log(`SMS Provider: ${provider}`);
    console.log(`API Key:      ${mask(apiKey)}`);
    console.log(`Sender ID:    ${senderId || '❌ NOT SET'}`);
    console.log(`Sending to:   ${TEST_PHONE}`);
    console.log(sep);

    if (!apiKey) {
        console.log('❌  SMS: SKIPPED — No SMS API Key configured in Branch Settings.');
        console.log('    Go to the app → Branch Settings → SMS Gateway and add your key.');
        console.log('\n🔧  NOTE: Your app currently has NO backend SMS edge function!');
        console.log('    SMS is stored as a communication record in the DB, but no actual');
        console.log('    SMS is sent to the phone. You need a Supabase Edge Function for SMS.');
        return;
    }

    if (provider === 'TWILIO') {
        await testTwilio(apiKey, senderId);
    } else if (provider === 'MSG91') {
        await testMsg91(apiKey, senderId);
    } else if (provider === 'GUPSHUP') {
        await testGupshup(apiKey, senderId);
    } else {
        console.log(`❌  SMS: SKIPPED — Unknown provider: "${provider}"`);
        console.log('    Supported: TWILIO, MSG91, GUPSHUP');
    }
}

async function testTwilio(apiKey, senderId) {
    // Twilio uses "ACCOUNT_SID:AUTH_TOKEN" as the API key
    const parts = apiKey.split(':');
    if (parts.length !== 2) {
        console.log('❌  TWILIO: API key must be in format ACCOUNT_SID:AUTH_TOKEN');
        console.log('    Example: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx:your_auth_token');
        return;
    }
    const [accountSid, authToken] = parts;
    const from = senderId;   // Twilio phone number or Messaging Service SID

    if (!from) {
        console.log('❌  TWILIO: Sender ID (From number) is missing. Set it in Branch Settings → SMS Gateway.');
        return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
        To: TEST_PHONE,
        From: from,
        Body: `🧪 SMS Test — IronFlow Gym. If you received this, SMS delivery is working! [${new Date().toLocaleString()}]`
    });

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
        const data = await res.json();
        if (res.ok && data.sid) {
            console.log('✅  TWILIO SMS: SUCCESS');
            console.log(`    Message SID: ${data.sid}`);
            console.log(`    Status:      ${data.status}`);
        } else {
            console.log(`❌  TWILIO SMS: FAILED — HTTP ${res.status}`);
            console.log(`    Code:    ${data.code}`);
            console.log(`    Message: ${data.message}`);
            twilioErrorHints(data.code);
        }
    } catch (err) {
        console.log('❌  TWILIO SMS: EXCEPTION —', err.message);
    }
}

function twilioErrorHints(code) {
    const hints = {
        20003: '→ Authentication failed. Check your ACCOUNT_SID and AUTH_TOKEN.',
        21211: '→ Invalid "To" number. Use E.164 format, e.g. +919876543210',
        21608: '→ The "From" number is not enabled for SMS.',
        21612: '→ "To" number is not reachable via SMS.',
        21614: '→ "To" number is not a valid mobile number.',
        63038: '→ Daily message limit reached on trial account.',
    };
    if (hints[code]) console.log('    Hint:', hints[code]);
}

async function testMsg91(apiKey, senderId) {
    // MSG91 send OTP/transactional SMS
    const url = `https://api.msg91.com/api/v5/flow/`;
    // MSG91 uses "flow_id" based transactional; use simple SMS for testing
    const simpleUrl = `https://api.msg91.com/api/sendhttp.php?authkey=${apiKey}&mobiles=${TEST_PHONE.replace('+', '')}&message=IronFlow+SMS+Test+${Date.now()}&route=4&sender=${senderId || 'IRONFW'}&response=json`;

    try {
        const res = await fetch(simpleUrl);
        const data = await res.text();
        console.log(`MSG91 Response: ${data}`);
        if (data.includes('"type":"success"') || data.includes('3456767')) {
            console.log('✅  MSG91 SMS: SUCCESS');
        } else {
            console.log('❌  MSG91 SMS: FAILED');
            console.log('    Response:', data);
            if (data.includes('invalidauth')) {
                console.log('    Hint: → Invalid MSG91 Auth Key. Check Branch Settings → SMS API Key.');
            }
        }
    } catch (err) {
        console.log('❌  MSG91 SMS: EXCEPTION —', err.message);
    }
}

async function testGupshup(apiKey, senderId) {
    const url = `https://enterprise.smsgupshup.com/GatewayAPI/rest?method=SendMessage&send_to=${TEST_PHONE.replace('+', '')}&msg=IronFlow+SMS+Test&msg_type=TEXT&userid=${senderId}&auth_scheme=plain&password=${apiKey}&v=1.1&format=text`;
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log(`Gupshup Response: ${text}`);
        if (text.includes('success') || text.includes('OK')) {
            console.log('✅  GUPSHUP SMS: SUCCESS');
        } else {
            console.log('❌  GUPSHUP SMS: FAILED');
        }
    } catch (err) {
        console.log('❌  GUPSHUP SMS: EXCEPTION —', err.message);
    }
}

// ─── 4. Check if SMS edge function exists ────────────────────────────────────
async function checkSmsInfrastructure() {
    console.log('\n🏗️   Checking SMS Infrastructure...');
    console.log(sep);

    // Try calling a /send-sms endpoint
    const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'OPTIONS',
        headers: { 'Authorization': `Bearer ${supabaseAnonKey}` }
    }).catch(() => null);

    if (res && (res.status === 200 || res.status === 204)) {
        console.log('✅  send-sms Edge Function: EXISTS and responding');
    } else if (res && res.status === 404) {
        console.log('❌  send-sms Edge Function: NOT DEPLOYED');
        console.log('    Your app logs CommType.SMS in the DB, but there is NO actual');
        console.log('    SMS dispatch backend. You need to create a new edge function:');
        console.log('    supabase/functions/send-sms/index.ts');
    } else {
        console.log('⚠️   send-sms Edge Function: Unreachable or not deployed');
        console.log(`    Response status: ${res?.status || 'no response'}`);
        console.log('    This means SMS notifications are logged in the DB but NOT actually sent.');
    }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║    📡  Email & SMS Diagnostic Tool — IronFlow Gym      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Fetch branch data
    let branches = [];
    try {
        branches = await fetchBranches();
        console.log(`✅  Connected to Supabase. Found ${branches.length} branch(es).`);
        branches.forEach((b, i) => {
            console.log(`    ${i + 1}. ${b.name} (${b.id})`);
            console.log(`       Email API Key: ${b.emailApiKey ? mask(b.emailApiKey) : '⚠️  NOT SET'}`);
            console.log(`       SMS Provider:  ${b.smsProvider || '⚠️  NOT SET'}`);
            console.log(`       SMS API Key:   ${b.smsApiKey ? mask(b.smsApiKey, 6) : '⚠️  NOT SET'}`);
        });
    } catch (err) {
        console.error('❌  Could not connect to Supabase:', err.message);
        process.exit(1);
    }

    // Use the second branch for testing (Titan Strength) as it has a key
    const branch = branches[1] || branches[0] || null;

    // Run tests
    await testEmail(branch);
    await checkSmsInfrastructure();
    await testSMS(branch);

    // Summary
    console.log('\n' + '═'.repeat(55));
    console.log('📋  SUMMARY');
    console.log('═'.repeat(55));
    console.log('Email: Powered by SendGrid via Supabase Edge Function (send-email)');
    console.log('SMS:   Currently ONLY logged in DB — no actual SMS is sent.');
    console.log('       A "send-sms" Edge Function needs to be built to dispatch real SMS.');
    console.log('═'.repeat(55) + '\n');
}

main().catch(console.error);
