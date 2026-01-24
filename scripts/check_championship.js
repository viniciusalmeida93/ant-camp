import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkChampionship() {
    console.log('🔍 Verificando Campeonato de Teste...\n');

    const { data: champ, error } = await supabase
        .from('championships')
        .select('*')
        .eq('slug', 'test-championship-2025')
        .single();

    if (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }

    console.log('📋 Detalhes do Campeonato:');
    console.log(`   Nome: ${champ.name}`);
    console.log(`   Slug: ${champ.slug}`);
    console.log(`   Publicado: ${champ.is_published ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   Data: ${champ.date}`);
    console.log(`   Link Público: http://localhost:8080/register/${champ.slug}\n`);

    // Verificar se existe link_page
    const { data: linkPage } = await supabase
        .from('link_pages')
        .select('*')
        .eq('championship_id', champ.id)
        .single();

    if (linkPage) {
        console.log('🔗 Link Page encontrada!');
        console.log(`   Slug: ${linkPage.slug}`);
    } else {
        console.log('⚠️  Link Page NÃO encontrada (necessária para inscrições públicas)');
    }
}

checkChampionship();
