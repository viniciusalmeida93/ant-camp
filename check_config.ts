
import { createClient } from '@supabase/supabase-api'

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

async function checkConfig() {
    const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'platform_fee_config')
        .maybeSingle()

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Config:', data)
    }
}

checkConfig()
