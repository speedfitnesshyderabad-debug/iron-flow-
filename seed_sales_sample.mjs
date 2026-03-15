
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seed() {
  console.log('🚀 Seeding sample users and sales...');

  const branchId = 'b1'; // Assuming a branch exists

  // 1. Create a sample user
  const userId = `u-${Date.now()}`;
  const memberId = `IF-IND-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const newUser = {
    id: userId,
    name: 'Test Member',
    email: `test-${userId}@example.com`,
    role: 'MEMBER',
    memberId: memberId,
    branchId: branchId,
    phone: '9876543210',
    address: '123 Test St',
    createdAt: new Date().toISOString()
  };

  const { error: userError } = await supabase.from('users').insert(newUser);
  if (userError) {
    console.error('❌ User creation failed:', userError.message);
    return;
  }
  console.log('✅ User created:', newUser.name);

  // 2. Create sample sales
  const sales = [
    {
      id: `s1-${Date.now()}`,
      invoiceNo: `INV/TST/${new Date().getFullYear()}/1001`,
      date: new Date().toISOString().split('T')[0],
      amount: 5000,
      memberId: userId,
      branchId: branchId,
      paymentMethod: 'CASH',
      createdAt: new Date().toISOString()
    },
    {
      id: `s2-${Date.now()}`,
      invoiceNo: `INV/TST/${new Date().getFullYear()}/1002`,
      date: new Date().toISOString().split('T')[0],
      amount: 3000,
      memberId: userId,
      branchId: branchId,
      paymentMethod: 'ONLINE',
      createdAt: new Date().toISOString()
    }
  ];

  const { error: saleError } = await supabase.from('sales').insert(sales);
  if (saleError) {
    console.error('❌ Sales creation failed:', saleError.message);
  } else {
    console.log('✅ Sales created:', sales.length);
  }
}

seed();
