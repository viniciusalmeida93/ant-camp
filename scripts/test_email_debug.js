import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testEmailWithDetails() {
    console.log('🧪 Testando Email com Detalhes de Erro\n');

    // 1. Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'athlete@test.com',
        password: 'password123'
    });

    if (authError) {
        console.error('❌ Erro no login:', authError.message);
        return;
    }
    console.log('✅ Login OK\n');

    // 2. Buscar campeonato
    const { data: championship } = await supabase
        .from('championships')
        .select('id')
        .eq('slug', 'test-championship-2025')
        .single();

    // 3. Buscar categoria
    const { data: category } = await supabase
        .from('categories')
        .select('id, price_cents')
        .eq('championship_id', championship.id)
        .limit(1)
        .single();

    // 4. Criar inscrição
    const { data: registration } = await supabase
        .from('registrations')
        .insert({
            championship_id: championship.id,
            category_id: category.id,
            user_id: authData.user.id,
            athlete_name: 'Test Athlete',
            athlete_email: 'athlete@test.com',
            athlete_phone: '(11) 99999-9999',
            athlete_cpf: '123.456.789-00',
            athlete_birth_date: '1990-01-01',
            subtotal_cents: category.price_cents,
            platform_fee_cents: 900,
            total_cents: category.price_cents + 900,
            payment_status: 'pending',
            payment_method: 'pix'
        })
        .select()
        .single();

    console.log(`✅ Inscrição criada: ${registration.id}\n`);

    // 5. Chamar função com tratamento de erro detalhado
    console.log('📧 Chamando Edge Function...\n');

    try {
        const response = await fetch(
            'https://jxuhmqctiyeheamhviob.supabase.co/functions/v1/send-registration-email',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({ registrationId: registration.id })
            }
        );

        const responseText = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', responseText);

        if (!response.ok) {
            console.error('\n❌ Erro na Edge Function:');
            try {
                const errorData = JSON.parse(responseText);
                console.log('Detalhes:', JSON.stringify(errorData, null, 2));
            } catch {
                console.log('Response (texto):', responseText);
            }
        } else {
            console.log('\n✅ Email enviado com sucesso!');
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }

    // Limpar
    await supabase.from('registrations').delete().eq('id', registration.id);
    await supabase.auth.signOut();
}

testEmailWithDetails();
