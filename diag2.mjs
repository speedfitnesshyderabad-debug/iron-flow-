import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';
const TEST_EMAIL = 'krishnatanniru009@gmail.com';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data: branches, error: bErr } = await sb
    .from('branches')
    .select('id,name,emailProvider,emailApiKey,emailFromAddress,smsProvider,smsApiKey,smsSenderId');

if (bErr) { console.log('DB_ERROR: ' + bErr.message); process.exit(1); }
console.log('FOUND_BRANCHES: ' + branches.length);

for (const b of branches) {
    console.log('---BRANCH---');
    console.log('name=' + b.name);
    console.log('id=' + b.id);
    console.log('emailProvider=' + (b.emailProvider || 'SENDGRID'));
    console.log('emailApiKey=' + (b.emailApiKey ? 'SET:' + b.emailApiKey.slice(0, 8) : 'NOT_SET'));
    console.log('emailFromAddress=' + (b.emailFromAddress || 'NOT_SET'));
    console.log('smsProvider=' + (b.smsProvider || 'NOT_SET'));
    console.log('smsApiKey=' + (b.smsApiKey ? 'SET:' + b.smsApiKey.slice(0, 6) : 'NOT_SET'));
    console.log('smsSenderId=' + (b.smsSenderId || 'NOT_SET'));
}

const branch = branches[0];
console.log('---EMAIL_TEST---');
console.log('to=' + TEST_EMAIL);

const er = await fetch(SUPABASE_URL + '/functions/v1/send-email', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
    body: JSON.stringify({
        to: TEST_EMAIL,
        subject: 'IronFlow Email Test ' + Date.now(),
        body: 'Test email from diagnostic script. Timestamp: ' + new Date().toISOString(),
        category: 'ANNOUNCEMENT',
        fromEmail: branch?.emailFromAddress || 'noreply@ironflow.app',
        fromName: (branch?.name || 'IronFlow') + ' Gym',
        branchName: branch?.name || 'IronFlow',
        apiKey: branch?.emailApiKey || undefined,
    }),
});

const eBody = await er.text();
console.log('email_status=' + er.status);
console.log('email_response=' + eBody.slice(0, 200));

if (er.status === 200 || er.status === 202) {
    console.log('EMAIL_RESULT=SUCCESS');
} else {
    console.log('EMAIL_RESULT=FAILED');
    if (eBody.includes('authorization grant is invalid')) {
        console.log('EMAIL_FIX=BAD_SENDGRID_KEY');
    } else if (eBody.includes('Forbidden') || er.status === 403) {
        console.log('EMAIL_FIX=SENDER_NOT_VERIFIED');
    }
}

console.log('---SMS_INFRA_CHECK---');
const sr = await fetch(SUPABASE_URL + '/functions/v1/send-sms', {
    method: 'OPTIONS',
    headers: { 'Authorization': 'Bearer ' + SUPABASE_KEY },
}).catch(() => ({ status: -1 }));
console.log('send_sms_status=' + sr.status);
if (sr.status === 404 || sr.status === -1) {
    console.log('SMS_INFRA=NOT_DEPLOYED');
} else {
    console.log('SMS_INFRA=EXISTS');
}

console.log('---SMS_CONFIG---');
if (!branch?.smsApiKey) {
    console.log('SMS_CONFIG=NO_API_KEY_IN_BRANCH');
} else {
    console.log('SMS_CONFIG=KEY_SET provider=' + branch.smsProvider);
}

console.log('---DONE---');
