import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnjpjknhobauyfqjyjcr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestNotification() {
    console.log('Fetching a user to notify...');
    const { data: users, error: userError } = await supabase.from('users').select('id, name').limit(1);
    
    if (userError || !users || users.length === 0) {
        console.error('Error fetching users or no users found.');
        return;
    }
    
    const user = users[0];
    console.log(`Target User: ${user.name} (${user.id})`);
    
    const notification = {
        id: `test-comm-${Date.now()}`,
        userId: user.id,
        type: 'SMS', // Even if it's SMS type, it should show in-app
        recipient: 'test@example.com',
        subject: '🧪 In-App Test',
        body: 'Hello! This is an in-app notification test. If you see this in the bell icon, it works!',
        category: 'ANNOUNCEMENT',
        status: 'DELIVERED',
        branchId: 'b2', // IronFlow Bangalore East
        is_read: false
    };
    
    console.log('Inserting test notification into communications...');
    const { data, error } = await supabase.from('communications').insert(notification).select();
    
    if (error) {
        console.warn('Error with is_read column, trying without it...');
        console.error('Full Error:', JSON.stringify(error, null, 2));
        
        // Try without is_read
        delete notification.is_read;
        const { error: error2 } = await supabase.from('communications').insert(notification);
        if (error2) {
            console.error('Failed even without is_read:', error2.message);
        } else {
            console.log('✅ Success (WITHOUT is_read column). This confirms the column is missing in DB.');
        }
    } else {
        console.log('✅ Success (WITH is_read column)!');
    }
}

createTestNotification();
