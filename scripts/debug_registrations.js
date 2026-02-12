
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDuplicates() {
    console.log('Checking for duplicate championships...');

    const { data: champions, error: champError } = await supabase
        .from('championships')
        .select('id, name, created_at')
        .ilike('name', '%Garagem Games%');

    if (champError) {
        console.error('Error finding championship:', champError);
        return;
    }

    console.log(`Found ${champions.length} championships matching "Garagem Games":`);

    for (const champ of champions) {
        // Count registrations for each
        const { count, error } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('championship_id', champ.id);

        console.log(`- [${champ.id}] "${champ.name}" (Created: ${new Date(champ.created_at).toLocaleString()}) - Registrations: ${count}`);
    }

    console.log('\nChecking the specific registration found earlier...');
    const { data: reg } = await supabase
        .from('registrations')
        .select('id, championship_id, payment_status')
        .ilike('athlete_name', '%Joanderson%')
        .limit(1);

    if (reg && reg.length > 0) {
        console.log('Registration "Joanderson":', reg[0]);
    }
}

checkDuplicates();
