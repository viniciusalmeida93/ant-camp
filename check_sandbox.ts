import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
    const { data, error } = await supabase.from('organizer_asaas_integrations').select('organizer_id, asaas_api_key, is_active');
    const result = data?.map(d => ({
        id: d.organizer_id.substring(0, 8),
        is_sandbox: d.asaas_api_key?.startsWith('$aact_hmlg_')
    }));
    console.log('Integrations:', result);

    // Also check the platform default key
    console.log('Platform Sandbox:', process.env.VITE_ASAAS_API_KEY?.startsWith('$aact_hmlg_'));
}
check();
