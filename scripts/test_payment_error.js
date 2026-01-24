import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testPaymentWithErrorHandling() {
    console.log('💰 Teste de Pagamento com Tratamento de Erro\n');

    // Login
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'organizer@test.com',
        password: 'password123'
    });

    // Buscar campeonato de teste
    const { data: championship } = await supabase
        .from('championships')
        .select('id, name')
        .eq('slug', 'test-championship-2025')
        .single();

    console.log(`Campeonato: ${championship.name}\n`);

    // Buscar categoria
    const { data: category } = await supabase
        .from('categories')
        .select('id, name, price_cents')
        .eq('championship_id', championship.id)
        .limit(1)
        .single();

    console.log(`Categoria: ${category.name} - R$ ${(category.price_cents / 100).toFixed(2)}\n`);

    // Criar inscrição
    const { data: registration } = await supabase
        .from('registrations')
        .insert({
            championship_id: championship.id,
            category_id: category.id,
            user_id: authData.user.id,
            athlete_name: 'Teste Pagamento',
            athlete_email: 'vinicius.almeidaa93@gmail.com',
            athlete_phone: '(11) 99999-9999',
            athlete_cpf: '55566677788',
            athlete_birth_date: '1990-01-01',
            subtotal_cents: category.price_cents,
            platform_fee_cents: 900,
            total_cents: category.price_cents + 900,
            payment_status: 'pending',
            payment_method: 'pix'
        })
        .select()
        .single();

    console.log(`Inscrição criada: ${registration.id}\n`);

    // Chamar Edge Function com fetch para capturar erro detalhado
    console.log('Chamando create-payment...\n');

    try {
        const response = await fetch(
            'https://jxuhmqctiyeheamhviob.supabase.co/functions/v1/create-payment',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    registrationId: registration.id,
                    paymentMethod: 'pix'
                })
            }
        );

        const responseText = await response.text();

        console.log(`Status: ${response.status}`);
        console.log(`Response:\n${responseText}\n`);

        if (!response.ok) {
            try {
                const errorData = JSON.parse(responseText);
                console.log('❌ Erro detalhado:');
                console.log(JSON.stringify(errorData, null, 2));
            } catch {
                console.log('❌ Erro (texto):', responseText);
            }
        } else {
            const data = JSON.parse(responseText);
            console.log('✅ Sucesso!');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }

    // Limpar
    await supabase.from('registrations').delete().eq('id', registration.id);
    await supabase.auth.signOut();
}

testPaymentWithErrorHandling();
