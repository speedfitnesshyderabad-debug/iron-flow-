import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';
const TEST_EMAIL = 'krishnatanniru009@gmail.com';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const result = {};

// 1. Branches
const { data: branches, error: bErr } = await sb
    .from('branches')
    .select('id,name,emailProvider,emailApiKey,emailFromAddress,smsProvider,smsApiKey,smsSenderId');
result.branch_fetch_error = bErr?.message || null;
result.branches = (branches || []).map(b => ({
    name: b.name,
    id: b.id,
    emailProvider: b.emailProvider || 'SENDGRID',
    emailApiKey: b.emailApiKey ? ('SET:' + b.emailApiKey.slice(0, 10) + '...') : 'NOT_SET',
    emailApiKeyFull: b.emailApiKey || null,
    emailFromAddress: b.emailFromAddress || null,
    smsProvider: b.smsProvider || null,
    smsApiKey: b.smsApiKey ? ('SET:' + b.smsApiKey.slice(0, 6) + '...') : 'NOT_SET',
    smsApiKeyFull: b.smsApiKey || null,
    smsSenderId: b.smsSenderId || null,
}));

const branch = branches?.[0];

// 2. Email test
const er = await fetch(SUPABASE_URL + '/functions/v1/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
    body: JSON.stringify({
        to: TEST_EMAIL,
        subject: 'IronFlow Email Test ' + Date.now(),
        body: 'Diagnostic test email. Time: ' + new Date().toISOString(),
        category: 'ANNOUNCEMENT',
        fromEmail: branch?.emailFromAddress || 'noreply@ironflow.app',
        fromName: (branch?.name || 'IronFlow') + ' Gym',
        branchName: branch?.name || 'IronFlow',
        apiKey: branch?.emailApiKey || undefined,
    }),
});
const eBody = await er.text();
result.email_test = {
    status_code: er.status,
    success: er.status === 200 || er.status === 202,
    response: eBody.slice(0, 300),
    fix_needed: eBody.includes('authorization grant is invalid') ? 'SENDGRID_KEY_INVALID' :
        (er.status === 403 ? 'SENDER_NOT_VERIFIED_IN_SENDGRID' : null),
};

// 3. SMS infra check
const smsPing = await fetch(SUPABASE_URL + '/functions/v1/send-sms', {
    method: 'OPTIONS',
    headers: { 'Authorization': 'Bearer ' + SUPABASE_KEY },
}).catch(() => ({ status: -1 }));
result.sms_edge_function = {
    status_code: smsPing.status,
    deployed: smsPing.status !== 404 && smsPing.status !== -1,
};

// 4. SMS key config
result.sms_config = {
    has_api_key: !!branch?.smsApiKey,
    provider: branch?.smsProvider || null,
    sender_id: branch?.smsSenderId || null,
};

writeFileSync('diag_result.json', JSON.stringify(result, null, 2), 'utf8');
console.log('Written to diag_result.json');
