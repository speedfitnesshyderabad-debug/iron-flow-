import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('name', '%Nitin%');

    if (userError) console.error(userError);
    console.log("USERS:", JSON.stringify(users, null, 2));

    if (users && users.length > 0) {
        const { data: payroll, error: payrollError } = await supabase
            .from('payroll')
            .select('*')
            .eq('staffId', users[0].id);

        if (payrollError) console.error(payrollError);
        console.log("PAYROLL:", JSON.stringify(payroll, null, 2));
    }
}

checkData();
