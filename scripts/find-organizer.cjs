const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findOrganizer() {
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');

    console.log('--- PERFIS NO SISTEMA ---');
    profiles?.forEach(p => {
        console.log(`ID: ${p.id} | Nome: ${p.full_name}`);
    });

    // Verificar se o ID do organizador do Ant Games está nesta lista
    const targetId = '1f1a2cd1-6b65-408f-aabc-e2409270ca28';
    const found = profiles?.find(p => p.id === targetId);

    if (found) {
        console.log(`\nSUCESSO: O organizador do Ant Games é: ${found.full_name}`);
    } else {
        console.log('\nO ID do organizador não possui um perfil público na tabela "profiles".');
    }
}

findOrganizer();
