import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qnjpjknhobauyfqjyjcr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o'
);

async function clean() {
    console.log('🧹 Cleaning public.users table...');
    const { error } = await supabase.from('users').delete().neq('id', '0'); // Delete everything
    if (error) {
        console.error('Error cleaning users:', error);
    } else {
        console.log('✅ Users table cleared. You can now use Admin Setup.');
    }
}

clean();
