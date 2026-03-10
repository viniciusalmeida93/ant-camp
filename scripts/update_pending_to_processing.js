import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Atualizando inscrições que têm payment_id gerado mas estão como pending...");

    const { data, error } = await supabase
        .from('registrations')
        .update({ payment_status: 'processing' })
        .not('payment_id', 'is', null)
        .eq('payment_status', 'pending')
        .select('id, team_name, athlete_name');

    if (error) {
        console.error('Erro na atualização:', error);
    } else {
        console.log(`Sucesso: ${data.length} inscrições foram atualizadas para 'processing'!`);
    }
}

main();
