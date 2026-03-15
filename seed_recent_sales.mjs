import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function backfillSales() {
    console.log('🚀 Authenticating as Super Admin...');
    
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
        email: 'owner@gym.in',
        password: 'ironflow2025' // Default password from seed_db.js
    });

    if (authError) {
        console.error('❌ Authentication FAILED:', authError.message);
        console.log('Attempting without authentication (might fail due to RLS)...');
    } else {
        console.log('✅ Authenticated successfully!');
    }

    try {
        // 1. Get all subscriptions
        const { data: subs, error: subError } = await supabase
            .from('subscriptions')
            .select('*, plans(price)');

        if (subError) throw subError;
        console.log(`📊 Found ${subs.length} subscriptions.`);

        if (subs.length === 0) {
            console.log('ℹ️ No subscriptions found to backfill.');
            return;
        }

        // 2. Get existing sales to avoid duplicates
        const { data: existingSales } = await supabase.from('sales').select('id, memberId, planId, date');
        const existingKeys = new Set(existingSales?.map(s => `${s.memberId}-${s.planId}-${s.date}`));

        const newSales = [];
        let skipped = 0;

        for (const sub of subs) {
            const key = `${sub.memberId}-${sub.planId}-${sub.startDate}`;
            if (existingKeys.has(key)) {
                skipped++;
                continue;
            }

            // Generate a deterministic but unique ID for the backfilled sale
            const saleId = `bf-${sub.id.substring(0, 15)}`;
            const branchPrefix = sub.branchId === 'b2' ? 'BLR' : 'MUM';
            const year = sub.startDate.split('-')[0];
            const random = Math.floor(1000 + Math.random() * 9000);

            newSales.push({
                id: saleId,
                invoiceNo: `INV/${branchPrefix}/${year}/${random}`,
                date: sub.startDate,
                amount: sub.plans?.price || 0,
                discount: 0,
                memberId: sub.memberId,
                planId: sub.planId,
                staffId: null,
                branchId: sub.branchId || 'b1',
                paymentMethod: 'CASH',
                createdAt: new Date(sub.startDate + 'T10:00:00Z').toISOString()
            });
        }

        console.log(`✨ Preparing to insert ${newSales.length} records (${skipped} skipped).`);

        if (newSales.length > 0) {
            // Insert in batches of 50
            for (let i = 0; i < newSales.length; i += 50) {
                const batch = newSales.slice(i, i + 50);
                const { error: insertError } = await supabase.from('sales').insert(batch);
                if (insertError) {
                    console.error('❌ Batch Insert Failed:', insertError.message);
                } else {
                    console.log(`✅ Inserted batch ${Math.floor(i / 50) + 1}`);
                }
            }
        }

        console.log('\n🎉 Backfill Complete!');

    } catch (e) {
        console.error('💥 Backfill FAILED:', e.message);
    }
}

backfillSales();
