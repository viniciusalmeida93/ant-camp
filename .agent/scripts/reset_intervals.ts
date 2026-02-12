
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Configurar variáveis de ambiente
const env = await load({ envPath: "d:/00_VA_Studio/ant-camp/.env" });
const supabaseUrl = env["VITE_SUPABASE_URL"];
const supabaseKey = env["VITE_SUPABASE_ANON_KEY"];

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Credenciais do Supabase não encontradas no .env");
    Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetIntervals() {
    console.log("🔄 Iniciando reset de intervalos no banco de dados...");

    try {
        // 1. Resetar intervalos na tabela 'championships'
        const { data: champData, error: champError } = await supabase
            .from("championships")
            .update({
                transition_time_minutes: 0,
                category_interval_minutes: 0,
                wod_interval_minutes: 0
            })
            .neq("id", "00000000-0000-0000-0000-000000000000") // update all rows basically
            .select();

        if (champError) {
            console.error("❌ Erro ao atualizar 'championships':", champError.message);
        } else {
            console.log(`✅ ${champData?.length || 0} campeonatos atualizados com intervalos zero.`);
        }

        // 2. Resetar configurações de pausa na tabela 'championship_days' se existirem
        // (Opcional, mas o usuário pediu "tudo que tiver de intervalo")
        // Verificando colunas: break_duration_minutes
        const { data: daysData, error: daysError } = await supabase
            .from("championship_days")
            .update({
                break_duration_minutes: 0
            })
            .neq("id", "00000000-0000-0000-0000-000000000000")
            .select();

        if (daysError) {
            // Pode dar erro se a coluna não existir ou se não tiver permissão, mas vamos tentar
            console.warn("⚠️ Aviso ao atualizar 'championship_days' (pode não existir break_duration_minutes ou sem permissão):", daysError.message);
        } else {
            console.log(`✅ ${daysData?.length || 0} dias de campeonato atualizados com pausa zero.`);
        }

        console.log("🎉 Reset de intervalos concluído!");

    } catch (err) {
        console.error("❌ Erro inesperado:", err);
    }
}

resetIntervals();
