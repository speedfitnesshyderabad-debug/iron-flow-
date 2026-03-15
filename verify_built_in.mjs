import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runVerification() {
    console.log('🚀 Authenticating as owner@gym.in...');
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
        email: 'YOUR_ADMIN_EMAIL',
        password: 'YOUR_ADMIN_PASSWORD'
    });

    if (authError) {
        console.error('❌ Authentication FAILED:', authError.message);
        return;
    }
    console.log('✅ Authenticated successfully!');

    // Get the actual client with the session
    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } }
    });

    console.log('Fetching user details...');
    const { data: user, error: userError } = await authedClient.from('users').select('id, name').eq('email', 'owner@gym.in').single();
    
    if (userError) {
        console.error('❌ Error fetching user:', userError.message);
        return;
    }
    console.log(`✅ Found User: ${user.name} (${user.id})`);

    const notification = {
        id: `test-built-${Date.now()}`,
        userId: user.id,
        type: 'SMS', 
        recipient: 'owner@gym.in',
        subject: '🧪 In-App Notification Test',
        body: 'Hello! This is an in-built app notification. If you see this in your notification bell, the system is working perfectly!',
        category: 'ANNOUNCEMENT',
        status: 'DELIVERED',
        branchId: 'b2',
        is_read: false
    };

    console.log('Inserting into communications table...');
    const { error: insertError } = await authedClient.from('communications').insert(notification);
    
    if (insertError) {
        console.warn('⚠️ Column is_read failed, trying isRead...');
        delete notification.is_read;
        notification.isRead = false;
        const { error: insertError2 } = await authedClient.from('communications').insert(notification);
        
        if (insertError2) {
             console.warn('⚠️ Both is_read and isRead failed, trying without read status...');
             delete notification.isRead;
             const { error: insertError3 } = await authedClient.from('communications').insert(notification);
             if (insertError3) {
                 console.error('❌ Insertion failed completely:', insertError3.message);
             } else {
                 console.log('✅ Success! (No read status column in DB)');
             }
        } else {
            console.log('✅ Success! (Column name is isRead)');
        }
    } else {
        console.log('✅ Success! (Column name is is_read)');
    }
}

runVerification();
