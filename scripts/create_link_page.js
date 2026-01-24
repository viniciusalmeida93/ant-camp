import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createLinkPageAsOrganizer() {
    console.log('🔐 Fazendo login como organizador...\n');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'organizer@test.com',
        password: 'password123'
    });

    if (authError) {
        console.error('❌ Erro no login:', authError.message);
        process.exit(1);
    }

    console.log('✅ Login bem-sucedido!\n');

    const champId = '004b8f07-c787-45e9-967f-e58442d0f0f8';

    console.log('🔧 Criando Link Page...\n');

    const { data, error } = await supabase
        .from('link_pages')
        .insert({
            championship_id: champId,
            slug: 'test-championship-2025',
            banner_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&auto=format&fit=crop'
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Erro:', error.message);
        console.log('\nDetalhes:', JSON.stringify(error, null, 2));
        process.exit(1);
    }

    console.log('✅ Link Page criada com sucesso!');
    console.log(`   ID: ${data.id}`);
    console.log(`   Slug: ${data.slug}`);
    console.log(`   Banner: ${data.banner_url}`);
    console.log(`\n📍 Links Disponíveis:`);
    console.log(`   Página de Links: http://localhost:8080/links/${data.slug}`);
    console.log(`   Inscrição Pública: http://localhost:8080/register/${data.slug}\n`);

    await supabase.auth.signOut();
}

createLinkPageAsOrganizer();
