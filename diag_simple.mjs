import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

// -------- CONFIG: change these --------
const TEST_EMAIL = 'krishnatanniru009@gmail.com';
const TEST_PHONE = '+919999999999';
// --------------------------------------

async function run() {
    // 1. Fetch branches
    const { data: branches, error } = await supabase
        .from('branches')
        .select('id,name,emailProvider,emailApiKey,emailFromAddress,smsProvider,smsApiKey,smsSenderId');

    if (error) {
        console.log('[ERROR] Could not fetch branches:', error.message);
        process.exit(1);
    }

    console.log('[INFO] Found ' + branches.length + ' branch(es).');
    for (const b of branches) {
        console.log('');
        console.log('Branch: ' + b.name + ' | ID: ' + b.id);
        console.log('  emailProvider:    ' + (b.emailProvider || 'SENDGRID (default)'));
        console.log('  emailApiKey:      ' + (b.emailApiKey ? b.emailApiKey.substring(0, 10) + '...' : 'NOT SET - will use Supabase secret'));
        console.log('  emailFromAddress: ' + (b.emailFromAddress || 'NOT SET'));
        console.log('  smsProvider:      ' + (b.smsProvider || 'NOT SET'));
        console.log('  smsApiKey:        ' + (b.smsApiKey ? b.smsApiKey.substring(0, 6) + '...' : 'NOT SET'));
        console.log('  smsSenderId:      ' + (b.smsSenderId || 'NOT SET'));
    }

    const branch = branches[0];

    // 2. Test Email
    console.log('');
    console.log('[EMAIL TEST] Sending test email to: ' + TEST_EMAIL);
    const emailRes = await fetch(supabaseUrl + '/functions/v1/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + supabaseKey,
        },
        body: JSON.stringify({
            to: TEST_EMAIL,
            subject: 'IronFlow Email Test - ' + new Date().toISOString(),
            body: 'This is a test email. Timestamp: ' + new Date().toLocaleString(),
            category: 'ANNOUNCEMENT',
            fromEmail: branch?.emailFromAddress || 'noreply@ironflow.app',
            fromName: branch?.name || 'IronFlow Gym',
            branchName: branch?.name || 'IronFlow',
            apiKey: branch?.emailApiKey || undefined,
        }),
    });

    const emailBody = await emailRes.text();
    if (emailRes.ok || emailRes.status === 200 || emailRes.status === 202) {
        console.log('[EMAIL TEST] SUCCESS - HTTP ' + emailRes.status);
        console.log('[EMAIL TEST] Check your inbox at ' + TEST_EMAIL);
    } else {
        console.log('[EMAIL TEST] FAILED - HTTP ' + emailRes.status);
        console.log('[EMAIL TEST] Response: ' + emailBody);
        if (emailBody.includes('authorization grant is invalid')) {
            console.log('[EMAIL TEST] FIX: Your SendGrid API key is INVALID/EXPIRED/REVOKED.');
            console.log('[EMAIL TEST]      Go to https://app.sendgrid.com/settings/api_keys');
            console.log('[EMAIL TEST]      Create a new key with Mail Send permission.');
            console.log('[EMAIL TEST]      Update Supabase Secret SENDGRID_API_KEY OR Branch Settings emailApiKey.');
        }
    }

    // 3. Check send-sms edge function
    console.log('');
    console.log('[SMS INFRA] Checking if send-sms edge function is deployed...');
    const smsOptionsRes = await fetch(supabaseUrl + '/functions/v1/send-sms', {
        method: 'OPTIONS',
        headers: { 'Authorization': 'Bearer ' + supabaseKey },
    }).catch(e => ({ status: -1, _err: e.message }));

    console.log('[SMS INFRA] send-sms endpoint status: ' + smsOptionsRes.status);
    if (smsOptionsRes.status === 404 || smsOptionsRes.status === -1) {
        console.log('[SMS INFRA] NOT DEPLOYED: There is NO send-sms edge function in your project.');
        console.log('[SMS INFRA] Your app stores SMS type communications in the DB but does NOT');
        console.log('[SMS INFRA] actually dispatch any SMS to phone numbers. This is a gap.');
    }

    // 4. Try actual SMS if keys exist
    console.log('');
    if (!branch?.smsApiKey) {
        console.log('[SMS TEST] SKIPPED: No smsApiKey set in branch "' + (branch?.name || 'N/A') + '".');
        console.log('[SMS TEST] SMS is ONLY logged in the DB - no real SMS is sent to phones.');
        console.log('[SMS TEST] To enable real SMS, add an smsApiKey in Branch Settings.');
    } else if (branch.smsProvider === 'TWILIO') {
        const parts = branch.smsApiKey.split(':');
        if (parts.length !== 2) {
            console.log('[SMS TEST] TWILIO: Key must be "ACCOUNT_SID:AUTH_TOKEN". Got: ' + branch.smsApiKey.substring(0, 20) + '...');
        } else {
            const [sid, token] = parts;
            const twilioRes = await fetch(
                'https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(sid + ':' + token).toString('base64'),
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        To: TEST_PHONE,
                        From: branch.smsSenderId,
                        Body: 'IronFlow SMS Test. Received? Great - SMS is working!',
                    }).toString(),
                }
            );
            const tBody = await twilioRes.json();
            if (twilioRes.ok) {
                console.log('[SMS TEST] TWILIO SUCCESS - SID: ' + tBody.sid);
            } else {
                console.log('[SMS TEST] TWILIO FAILED - Code ' + tBody.code + ': ' + tBody.message);
            }
        }
    } else if (branch.smsProvider === 'MSG91') {
        const phone = TEST_PHONE.replace('+', '');
        const msg91Url = 'https://api.msg91.com/api/sendhttp.php?authkey=' + branch.smsApiKey +
            '&mobiles=' + phone + '&message=IronFlow+SMS+Test&route=4&sender=' +
            (branch.smsSenderId || 'IRONFW') + '&response=json';
        const msg91Res = await fetch(msg91Url);
        const msg91Body = await msg91Res.text();
        console.log('[SMS TEST] MSG91 Response:', msg91Body);
        if (msg91Body.includes('"type":"success"')) {
            console.log('[SMS TEST] MSG91 SUCCESS');
        } else {
            console.log('[SMS TEST] MSG91 FAILED - check API key and sender ID.');
        }
    } else {
        console.log('[SMS TEST] Provider "' + branch.smsProvider + '" - manual test needed.');
    }

    console.log('');
    console.log('--- DIAGNOSTIC COMPLETE ---');
}

run().catch(err => console.error('[FATAL]', err.message));
