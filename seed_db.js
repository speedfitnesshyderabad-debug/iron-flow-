import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qnjpjknhobauyfqjyjcr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuanBqa25ob2JhdXlmcWp5amNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM2NjIsImV4cCI6MjA4Njc4OTY2Mn0.9H9cHTpjniKzYaeL05xbHxDL36bPJmj1ThoGfS5Yw2o'
);

const BRANCHES = [
    {
        id: 'b1',
        name: 'IronFlow Mumbai Central',
        address: 'Plot 45, BKC, Mumbai, Maharashtra 400051',
        phone: '+91 98765 43210',
        email: 'mumbai@ironflow.in',
        gstin: '27AABCU1234F1Z1',
        gstPercentage: 18,
        equipment: 'Cardio: 5 Treadmills, 2 Spin Bikes. Strength: Full Smith Machine, Dumbbells up to 40kg, Bench Press, Squat Rack, Cable Crossover. Plate Loaded: Leg Press, Lat Pulldown.'
    },
    {
        id: 'b2',
        name: 'IronFlow Bangalore East',
        address: 'Indiranagar 100ft Rd, Bengaluru, Karnataka 560038',
        phone: '+91 98765 01234',
        email: 'bangalore@ironflow.in',
        gstin: '29AABCU5678F1Z2',
        gstPercentage: 18,
        equipment: 'Functional Training Zone: Kettlebells, Battle Ropes, TRX, Medicine Balls. Machines: Leg Extension, Chest Press, Seated Row. Cardio: 3 Treadmills, 1 Rower.'
    },
];

const MOCK_USERS = [
    { id: 'u1', name: 'Arjun Sharma', email: 'owner@gym.in', role: 'SUPER_ADMIN', branchId: null, avatar: 'https://i.pravatar.cc/150?u=arjun' },
    { id: 'u2', name: 'Priya Patel', email: 'priya@gym.in', role: 'BRANCH_ADMIN', branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=priya' },
    { id: 'u3', name: 'Vikram Singh', email: 'vikram@gym.in', role: 'TRAINER', branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=vikram', hourlyRate: 800, commissionPercentage: 20, shifts: [{ start: '06:00', end: '11:00' }, { start: '17:00', end: '21:00' }] },
    { id: 'u4', name: 'Rahul Verma', email: 'rahul@gmail.com', role: 'MEMBER', branchId: 'b1', memberId: 'IF-IND-1001', avatar: 'https://i.pravatar.cc/150?u=rahul' },
    { id: 'u5', name: 'Sanjay Dutt', email: 'manager@gym.in', role: 'MANAGER', branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=sanjay', hourlyRate: 1200, commissionPercentage: 5 },
    { id: 'u6', name: 'Neha Kapoor', email: 'reception@gym.in', role: 'RECEPTIONIST', branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=neha', hourlyRate: 400 },
    { id: 'u7', name: 'Karan Mehra', email: 'staff@gym.in', role: 'STAFF', branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=karan', hourlyRate: 300 },
];

const MOCK_PLANS = [
    { id: 'p1', name: 'Standard Monthly Gym', type: 'GYM', price: 2500, durationDays: 30, branchId: 'b1', isActive: true, isMultiBranch: false },
    { id: 'p2', name: 'Personal Training (12 Sessions)', type: 'PT', price: 12000, durationDays: 30, branchId: 'b1', isActive: true, isMultiBranch: false, maxSessions: 12, sessionDurationMinutes: 60 },
    { id: 'p3', name: 'Yoga Group Class', type: 'GROUP', price: 3500, durationDays: 30, branchId: 'b1', isActive: true, isMultiBranch: false, sessionDurationMinutes: 60, groupCapacity: 20 },
    { id: 'p4', name: 'Annual Beast Mode (All India)', type: 'GYM', price: 18000, durationDays: 365, branchId: 'b1', isActive: true, isMultiBranch: true },
];

const MOCK_OFFERS = [
    {
        id: 'o1',
        title: 'SUMMER SHRED 2025',
        description: 'Transform your physique with our elite Personal Training packages. Get 20% flat discount on all 12-session PT modules this month!',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
        expiryDate: '2025-06-30',
        branchId: 'GLOBAL',
        isActive: true,
        ctaText: 'RESERVE SPOT'
    },
    {
        id: 'o2',
        title: 'MUMBAI MONSOON SPECIAL',
        description: 'Don\'t let the rain stop your gains! Renew your Annual Gym Membership and get 3 MONTHS of additional access completely free.',
        imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1200&auto=format&fit=crop',
        expiryDate: '2025-08-15',
        branchId: 'b1',
        isActive: true,
        ctaText: 'UPGRADE NOW'
    }
];

async function seedDatabase() {
    console.log('🌱 Starting database seeding...\n');

    try {
        // Check current data
        const { data: existingBranches } = await supabase.from('branches').select('*');
        const { data: existingUsers } = await supabase.from('users').select('*');
        const { data: existingPlans } = await supabase.from('plans').select('*');

        console.log(`📊 Current Status:`);
        console.log(`   Branches: ${existingBranches?.length || 0}`);
        console.log(`   Users: ${existingUsers?.length || 0}`);
        console.log(`   Plans: ${existingPlans?.length || 0}\n`);

        // Insert Branches
        if (!existingBranches || existingBranches.length === 0) {
            console.log('🏢 Inserting branches...');
            const { error: branchError } = await supabase.from('branches').insert(BRANCHES);
            if (branchError) {
                console.error('❌ Error inserting branches:', branchError.message);
            } else {
                console.log('✅ Branches inserted successfully!\n');
            }
        } else {
            console.log('⏭️  Branches already exist, skipping...\n');
        }

        // Insert Users
        if (!existingUsers || existingUsers.length === 0) {
            console.log('👥 Inserting users...');
            const { error: userError } = await supabase.from('users').insert(MOCK_USERS);
            if (userError) {
                console.error('❌ Error inserting users:', userError.message);
            } else {
                console.log('✅ Users inserted successfully!\n');
            }
        } else {
            console.log('⏭️  Users already exist, skipping...\n');
        }

        // Insert Plans
        if (!existingPlans || existingPlans.length === 0) {
            console.log('📋 Inserting plans...');
            const { error: planError } = await supabase.from('plans').insert(MOCK_PLANS);
            if (planError) {
                console.error('❌ Error inserting plans:', planError.message);
            } else {
                console.log('✅ Plans inserted successfully!\n');
            }
        } else {
            console.log('⏭️  Plans already exist, skipping...\n');
        }

        // Insert Offers
        const { data: existingOffers } = await supabase.from('offers').select('*');
        if (!existingOffers || existingOffers.length === 0) {
            console.log('🎁 Inserting offers...');
            const { error: offerError } = await supabase.from('offers').insert(MOCK_OFFERS);
            if (offerError) {
                console.error('❌ Error inserting offers:', offerError.message);
            } else {
                console.log('✅ Offers inserted successfully!\n');
            }
        } else {
            console.log('⏭️  Offers already exist, skipping...\n');
        }

        // Final verification
        const { data: finalUsers } = await supabase.from('users').select('*');
        const { data: finalBranches } = await supabase.from('branches').select('*');
        const { data: finalPlans } = await supabase.from('plans').select('*');

        console.log('📊 Final Status:');
        console.log(`   Branches: ${finalBranches?.length || 0}`);
        console.log(`   Users: ${finalUsers?.length || 0}`);
        console.log(`   Plans: ${finalPlans?.length || 0}\n`);

        if (finalUsers && finalUsers.length > 0) {
            console.log('✅ Database seeding completed successfully!');
            console.log('\n👤 You can now login with any of these emails:');
            finalUsers.forEach(u => {
                console.log(`   - ${u.email} (${u.role})`);
            });
            console.log('\n🔑 Password: ironflow2025 (works for all accounts)');
        } else {
            console.log('⚠️  No users found after seeding. Please check for errors above.');
        }

    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

seedDatabase();
