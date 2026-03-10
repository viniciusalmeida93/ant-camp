import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('payments')
        .select('*, registrations(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching payments:', error);
    } else {
        console.log('Last 5 pending payments:', JSON.stringify(data, null, 2));
    }
}

main();
