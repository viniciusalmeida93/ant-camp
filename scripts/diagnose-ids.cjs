const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    const { data: champs } = await supabase.from('championships').select('id, name, slug');
    console.log('--- CAMPEONATOS ---');
    champs.forEach(c => console.log(`ID: ${c.id} | Name: ${c.name} | Slug: ${c.slug}`));

    const { data: cats } = await supabase.from('categories').select('id, name, championship_id');
    console.log('\n--- CATEGORIAS ---');
    cats.forEach(c => console.log(`ID: ${c.id} | Name: ${c.name} | ChampID: ${c.championship_id}`));
}

diagnose();
