const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHAMP_ID = '3060b6d4-eea9-458e-b3f0-211a45b3de08';
const CAT_ID_SCALE = '66252667-5d5e-4ef5-982d-47e19dd9ac7e';

async function testWaitlist() {
    console.log('--- TESTANDO LISTA DE ESPERA ---');

    // 1. Simular atleta entrando na lista
    const testAthlete = {
        championship_id: CHAMP_ID,
        category_id: CAT_ID_SCALE,
        athlete_name: 'Atleta Extra (Esperando)',
        athlete_email: 'espera@teste.com',
        athlete_phone: '11999998888',
        status: 'waiting'
    };

    // Lógica de posição (replicando PublicRegistration.tsx)
    const { data: currentWaitlist } = await supabase
        .from("waitlist")
        .select("position")
        .eq("category_id", CAT_ID_SCALE)
        .order("position", { ascending: false })
        .limit(1);

    const nextPosition = (currentWaitlist && currentWaitlist.length > 0) ? currentWaitlist[0].position + 1 : 1;
    testAthlete.position = nextPosition;

    console.log(`Inserindo atleta na posição: ${nextPosition}`);

    const { data, error } = await supabase
        .from('waitlist')
        .insert(testAthlete)
        .select()
        .single();

    if (error) {
        console.error('Erro ao entrar na lista:', error.message);
        return;
    }

    console.log('✅ Inserido com sucesso:', data);

    // 2. Verificar se aparece na lista de espera da categoria
    const { data: list } = await supabase
        .from('waitlist')
        .select('*')
        .eq('category_id', CAT_ID_SCALE)
        .order('position', { ascending: true });

    console.log(`Lista atual para SCALE: ${list.length} atletas.`);
    list.forEach(a => console.log(`- #${a.position}: ${a.athlete_name}`));
}

testWaitlist();
