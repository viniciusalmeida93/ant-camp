import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
    const { data, error } = await supabase.from('payments').select('id, status, asaas_payment_id, created_at').order('created_at', { ascending: false }).limit(5);
    console.log('Recent payments:', data);
    const { data: regs } = await supabase.from('registrations').select('id, payment_status, athlete_name').order('created_at', { ascending: false }).limit(5);
    console.log('Recent regs:', regs);
}
check();
