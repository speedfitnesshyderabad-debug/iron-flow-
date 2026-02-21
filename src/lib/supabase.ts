import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Supabase credentials missing from .env file.');
  console.warn('Expected: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
} else {
  console.log('🌐 Supabase Client Initialized with URL:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
