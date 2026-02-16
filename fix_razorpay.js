import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRazorpay() {
    console.log('\n🔧 Adding Razorpay key to Mumbai Central branch...\n');

    // Prompt for Razorpay key
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Enter your Razorpay Key ID (rzp_test_... or rzp_live_...): ', async (apiKey) => {
        if (!apiKey || apiKey.trim() === '') {
            console.log('❌ No key provided. Exiting.');
            readline.close();
            return;
        }

        try {
            // Find Mumbai branch
            const { data: branches } = await supabase
                .from('branches')
                .select('*')
                .ilike('name', '%mumbai%');

            if (!branches || branches.length === 0) {
                console.log('❌ Mumbai branch not found');
                readline.close();
                return;
            }

            const mumbaiBranch = branches[0];
            console.log(`Found branch: ${mumbaiBranch.name} (${mumbaiBranch.id})`);

            // Update with Razorpay key
            const { data, error } = await supabase
                .from('branches')
                .update({
                    paymentProvider: 'RAZORPAY',
                    paymentApiKey: apiKey.trim()
                })
                .eq('id', mumbaiBranch.id)
                .select();

            if (error) {
                console.error('❌ Error updating branch:', error);
                readline.close();
                return;
            }

            console.log('\n✅ SUCCESS! Razorpay key has been added to the database!');
            console.log(`Branch: ${data[0].name}`);
            console.log(`Payment Provider: ${data[0].paymentProvider}`);
            console.log(`API Key: ${data[0].paymentApiKey.substring(0, 15)}...`);
            console.log('\n🔄 Please refresh your browser or reload the app data.');
            console.log('   (The app should auto-refresh on page reload)\n');

        } catch (err) {
            console.error('❌ Exception:', err);
        }

        readline.close();
    });
}

fixRazorpay();
