
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false
    }
});

async function verifyLogin() {
    const email = 'athlete@test.com';
    const password = 'password123';

    console.log(`Attempting to login with ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('❌ Login Failed:', error.message);
        process.exit(1);
    }

    console.log('✅ Login Successful!');
    console.log('User ID:', data.user.id);

    // Verify Profile
    console.log('Verifying profile existence...');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (profileError) {
        console.error('❌ Profile Fetch Failed:', profileError.message);
        process.exit(1);
    }

    if (!profile) {
        console.error('❌ Profile is MISSING (Trigger failed?)');
        process.exit(1);
    }

    console.log('✅ Profile Found:', profile.full_name);
}

verifyLogin();
