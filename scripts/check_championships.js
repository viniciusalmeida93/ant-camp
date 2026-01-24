import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://jxuhmqctiyeheamhviob.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s'
);

async function checkChampionships() {
    console.log('📋 Verificando campeonatos e Link Pages...\n');

    // Buscar campeonatos
    const { data: championships } = await supabase
        .from('championships')
        .select('id, slug, name, is_published');

    console.log('Campeonatos encontrados:');
    championships?.forEach(c => {
        console.log(`  - ${c.name}`);
        console.log(`    Slug: ${c.slug}`);
        console.log(`    Publicado: ${c.is_published ? 'SIM' : 'NÃO'}`);
        console.log(`    URL: http://localhost:8080/inscricao/${c.slug}\n`);
    });

    // Buscar Link Pages
    const { data: linkPages } = await supabase
        .from('link_pages')
        .select('slug, championship_id, is_active');

    console.log('Link Pages encontradas:');
    linkPages?.forEach(lp => {
        const champ = championships?.find(c => c.id === lp.championship_id);
        console.log(`  - Slug: ${lp.slug}`);
        console.log(`    Campeonato: ${champ?.name || 'N/A'}`);
        console.log(`    Ativo: ${lp.is_active ? 'SIM' : 'NÃO'}`);
        console.log(`    URL: http://localhost:8080/inscricao/${lp.slug}\n`);
    });
}

checkChampionships();
