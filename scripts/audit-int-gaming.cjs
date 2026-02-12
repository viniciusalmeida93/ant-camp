const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function audit() {
    console.log('--- AUDITORIA CAMPEONATO INT GAMING ---');

    // 1. Buscar Campeonato
    const { data: champ, error: champError } = await supabase
        .from('championships')
        .select('id, name, slug')
        .or('slug.eq.ant-games,name.ilike.%Int Gaming%,name.ilike.%Ant Games%')
        .maybeSingle();

    if (champError || !champ) {
        console.error('Erro ao buscar campeonato:', champError || 'Não encontrado');
        return;
    }

    console.log(`Campeonato Encontrado: ${champ.name} (${champ.slug}) [ID: ${champ.id}]`);

    // 2. Buscar Categorias
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('championship_id', champ.id);

    if (catError) {
        console.error('Erro ao buscar categorias:', catError);
        return;
    }

    console.log(`\nCategorias Encontradas (${categories.length}):`);

    for (const cat of categories) {
        console.log(`\n- ${cat.name} [ID: ${cat.id}]`);
        console.log(`  Capacidade: ${cat.capacity}`);
        console.log(`  Faixa Etária: ${cat.min_age || 0} - ${cat.max_age || 'Sem limite'}`);
        console.log(`  Preço Base: R$ ${(cat.price_cents / 100).toFixed(2)}`);
        console.log(`  Lotes ativos: ${cat.has_batches ? 'Sim' : 'Não'}`);
        if (cat.batches) {
            console.log(`  Dados dos Lotes:`, JSON.stringify(cat.batches, null, 2));
        }
        console.log(`  Kits ativos: ${cat.kits_active ? 'Sim' : 'Não'}`);
        if (cat.kits_config) {
            console.log(`  Configuração de Kits:`, JSON.stringify(cat.kits_config, null, 2));
        }

        // Buscar inscrições atuais
        const { count, error: countError } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id)
            .eq('status', 'approved');

        console.log(`  Inscrições Aprovadas Atuais: ${count || 0}`);
    }
}

audit();
