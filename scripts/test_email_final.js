import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testEmailProduction() {
    console.log('🧪 Teste Final de Email\n');

    // Login
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'athlete@test.com',
        password: 'password123'
    });

    console.log('✅ Login OK\n');

    // Buscar campeonato e categoria
    const { data: championship } = await supabase
        .from('championships')
        .select('id')
        .eq('slug', 'test-championship-2025')
        .single();

    const { data: category } = await supabase
        .from('categories')
        .select('id, price_cents')
        .eq('championship_id', championship.id)
        .limit(1)
        .single();

    // Criar inscrição COM O EMAIL CORRETO (do dono da conta Resend)
    console.log('📝 Criando inscrição de teste...');
    const { data: registration, error: regError } = await supabase
        .from('registrations')
        .insert({
            championship_id: championship.id,
            category_id: category.id,
            user_id: authData.user.id,
            athlete_name: 'Vinicius Almeida (Teste)',
            athlete_email: 'vinicius.almeidaa93@gmail.com', // Email do dono da conta Resend
            athlete_phone: '(11) 99999-9999',
            athlete_cpf: '999.999.999-99',
            athlete_birth_date: '1990-01-01',
            subtotal_cents: category.price_cents,
            platform_fee_cents: 900,
            total_cents: category.price_cents + 900,
            payment_status: 'pending',
            payment_method: 'pix'
        })
        .select()
        .single();

    if (regError) {
        console.error('❌ Erro ao criar inscrição:', regError.message);
        console.log('\n⚠️  Isso é esperado se a RLS bloquear.');
        console.log('   Solução: Verificar um domínio no Resend ou usar inscrição existente.\n');
        return;
    }

    console.log(`✅ Inscrição criada: ${registration.id.substring(0, 8)}\n`);

    // Enviar email
    console.log('📧 Enviando email...\n');

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

    if (!response.ok) {
        console.error('❌ Erro:', response.status);
        const errorData = JSON.parse(responseText);
        console.log(JSON.stringify(errorData, null, 2));
    } else {
        const result = JSON.parse(responseText);
        console.log('✅ EMAIL ENVIADO COM SUCESSO!');
        console.log('   Email ID:', result.emailId);
        console.log('   Destinatários:', result.recipients);
        console.log('\n📬 Verifique: vinicius.almeidaa93@gmail.com\n');
    }

    // Limpar
    await supabase.from('registrations').delete().eq('id', registration.id);
    console.log('🧹 Inscrição de teste removida\n');

    await supabase.auth.signOut();
}

testEmailProduction();
