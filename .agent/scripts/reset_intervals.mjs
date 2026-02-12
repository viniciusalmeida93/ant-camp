import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Credenciais do Supabase não encontradas no .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetIntervals() {
    console.log("🔄 Iniciando reset de intervalos no banco de dados...");

    try {
        // Resetar intervalos na tabela 'championships'
        const { data: champData, error: champError } = await supabase
            .from("championships")
            .update({
                transition_time_minutes: 0,
                category_interval_minutes: 0,
                wod_interval_minutes: 0
            })
            .neq("id", "00000000-0000-0000-0000-000000000000")
            .select();

        if (champError) {
            console.error("❌ Erro ao atualizar 'championships':", champError.message);
        } else {
            console.log(`✅ ${champData?.length || 0} campeonatos atualizados com intervalos zero.`);
        }

        console.log("🎉 Reset de intervalos concluído!");

    } catch (err) {
        console.error("❌ Erro inesperado:", err);
    }
}

resetIntervals();
