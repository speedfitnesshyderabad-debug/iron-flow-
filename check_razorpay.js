import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRazorpayConfig() {
    console.log('\n🔍 Checking Razorpay Configuration...\n');

    try {
        const { data: branches, error } = await supabase
            .from('branches')
            .select('*');

        if (error) {
            console.error('❌ Error fetching branches:', error);
            return;
        }

        if (!branches || branches.length === 0) {
            console.log('⚠️  No branches found in database');
            return;
        }

        console.log(`✅ Found ${branches.length} branch(es)\n`);

        branches.forEach((branch, index) => {
            console.log(`Branch ${index + 1}: ${branch.name}`);
            console.log('─'.repeat(50));
            console.log(`ID: ${branch.id}`);
            console.log(`Payment Provider: ${branch.paymentProvider || 'NOT SET'}`);
            console.log(`Payment API Key: ${branch.paymentApiKey ? `${branch.paymentApiKey.substring(0, 15)}... (${branch.paymentApiKey.length} chars)` : '❌ NOT SET'}`);
            console.log(`Payment Merchant ID: ${branch.paymentMerchantId || 'NOT SET'}`);
            console.log(`Email Provider: ${branch.emailProvider || 'NOT SET'}`);
            console.log(`Email API Key: ${branch.emailApiKey ? 'SET' : 'NOT SET'}`);
            console.log(`SMS Provider: ${branch.smsProvider || 'NOT SET'}`);
            console.log(`SMS API Key: ${branch.smsApiKey ? 'SET' : 'NOT SET'}`);
            console.log('');

            // Validation
            if (branch.paymentProvider === 'RAZORPAY' && branch.paymentApiKey) {
                if (branch.paymentApiKey.startsWith('rzp_test_') || branch.paymentApiKey.startsWith('rzp_live_')) {
                    console.log('✅ Razorpay key format looks correct!');
                } else {
                    console.log('⚠️  WARNING: Razorpay key should start with "rzp_test_" or "rzp_live_"');
                    console.log(`   Current key: ${branch.paymentApiKey.substring(0, 20)}...`);
                }
            } else if (branch.paymentProvider === 'RAZORPAY') {
                console.log('❌ PROBLEM: Payment provider is RAZORPAY but paymentApiKey is missing!');
            }
            console.log('\n');
        });

        // Show what the app will see
        console.log('🔧 App Behavior Prediction:');
        console.log('─'.repeat(50));
        const mumbaiCentral = branches.find(b => b.name.includes('Mumbai'));
        if (mumbaiCentral) {
            const hasKey = !!mumbaiCentral.paymentApiKey;
            console.log(`Mumbai Central Payment: ${hasKey ? '✅ WILL WORK' : '❌ WILL FAIL'}`);
            if (hasKey) {
                console.log(`Key being used: ${mumbaiCentral.paymentApiKey.substring(0, 15)}...`);
            }
        }

    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

checkRazorpayConfig();
