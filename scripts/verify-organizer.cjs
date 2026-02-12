const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyOrganizer() {
    // 1. Encontrar o campeonato pelo slug real 'ant-games'
    const { data: champ, error: champError } = await supabase
        .from('championships')
        .select('id, name, organizer_id')
        .eq('slug', 'ant-games')
        .maybeSingle();

    if (champError || !champ) {
        console.log('Campeonato Ant Games não encontrado.');
        return;
    }

    console.log(`Campeonato: ${champ.name} | ID: ${champ.id}`);
    console.log(`Organizer UID: ${champ.organizer_id}`);

    // 2. Tentar buscar o perfil do organizador (onde o e-mail costuma ser sincronizado ou buscado)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, id')
        .eq('id', champ.organizer_id)
        .maybeSingle();

    if (profile) {
        console.log(`Nome do Organizador (Profile): ${profile.full_name}`);
    } else {
        console.log('Perfil do organizador não encontrado.');
    }

    // Nota: Como não tenho acesso direto à tabela auth.users via anon key para ver e-mail,
    // eu posso verificar se existe algum user_role associado.
    const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', champ.organizer_id);

    console.log('Roles do Usuário:', roles?.map(r => r.role).join(', ') || 'Nenhuma');
}

verifyOrganizer();
