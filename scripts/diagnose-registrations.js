
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Nota: Para diagnóstico real, precisaríamos da SERVICE_ROLE_KEY para ignorar RLS e ver tudo.
// Vou tentar ler do arquivo .env ou assumir que o usuário vai rodar isso num ambiente onde ele tem acesso.
// Se rodar com ANON key, o RLS vai bloquear e confirmaremos a teoria.

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltando VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("Iniciando diagnóstico...");

    // 1. Buscar Inscrições do Campeonato Garagem Games (pesquisa aproximada)
    const { data: champs, error: champError } = await supabase
        .from('championships')
        .select('id, name, organizer_id')
        .ilike('name', '%GARAGEM GAMES%');

    if (champError) {
        console.error("Erro ao buscar campeonatos:", champError);
        return;
    }

    console.log(`Encontrados ${champs.length} campeonatos com nome similar.`);

    if (champs.length === 0) return;

    const champIds = champs.map(c => c.id);

    // 2. Buscar Inscrições sem user_id nesses campeonatos
    // Precisamos usar service_role para ver isso, senão o RLS esconde.
    // Como este script roda local, vou pedir para o usuário fornecer a SERVICE KEY se falhar.

    console.log("Tentando buscar inscrições sem user_id (pode falhar com ANON KEY se RLS estiver ativo)...");

    const { data: regs, error: regError } = await supabase
        .from('registrations')
        .select('id, athlete_name, athlete_email, user_id, status, payment_status')
        .in('championship_id', champIds)
        .is('user_id', null)
        .limit(20);

    if (regError) {
        console.error("Erro ao buscar inscrições:", regError);
    } else {
        console.log(`Encontradas ${regs.length} inscrições SEM user_id.`);
        if (regs.length > 0) {
            console.log("Exemplos:", regs.slice(0, 3));
        }
    }

    // 3. Simular a query do Dashboard para um email específico (se tivermos um exemplo)
    // O usuário não deu um email de ATLETA com problema, só do organizador.
    // Mas podemos ver se conseguimos listar algo.
}

diagnose();
