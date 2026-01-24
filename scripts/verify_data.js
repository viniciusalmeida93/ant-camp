
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyData() {
    console.log('Verifying Championship...');
    const { data: champs, error: champError } = await supabase
        .from('championships')
        .select('id, name, slug, organizer_id')
        .eq('slug', 'test-championship-2025');

    if (champError) {
        console.error('❌ Error fetching championship:', champError.message);
        process.exit(1);
    }

    if (!champs || champs.length === 0) {
        console.error('❌ Test Championship NOT FOUND.');
        process.exit(1);
    }

    const champ = champs[0];
    console.log(`✅ Found Championship: ${champ.name} (ID: ${champ.id})`);

    console.log('Verifying Categories...');
    const { data: cats, error: catError } = await supabase
        .from('categories')
        .select('id, name, price_cents')
        .eq('championship_id', champ.id);

    if (catError) {
        console.error('❌ Error fetching categories:', catError.message);
        process.exit(1);
    }

    console.log(`✅ Found ${cats.length} Categories:`);
    cats.forEach(c => console.log(`   - ${c.name} (R$ ${(c.price_cents / 100).toFixed(2)})`));

    if (cats.length < 3) {
        console.warn('⚠️ Expected 3 categories, found fewer.');
    }
}

verifyData();
