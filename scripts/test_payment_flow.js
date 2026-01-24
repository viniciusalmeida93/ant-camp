import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testPaymentFlow() {
    console.log('🧪 TESTE COMPLETO - SISTEMA DE PAGAMENTO\n');
    console.log('='.repeat(60));

    // 1. LOGIN COMO ATLETA
    console.log('\n📍 PASSO 1: Login como Atleta');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'athlete@test.com',
        password: 'password123'
    });

    if (authError) {
        console.error('❌ Erro no login:', authError.message);
        return;
    }
    console.log('✅ Login bem-sucedido!');
    console.log(`   User ID: ${authData.user.id}`);

    // 2. BUSCAR CAMPEONATO E CATEGORIA
    console.log('\n📍 PASSO 2: Buscar Campeonato de Teste');
    const { data: championship } = await supabase
        .from('championships')
        .select('id, name, slug')
        .eq('slug', 'test-championship-2025')
        .single();

    if (!championship) {
        console.error('❌ Campeonato não encontrado');
        return;
    }
    console.log(`✅ Campeonato: ${championship.name}`);

    const { data: category } = await supabase
        .from('categories')
        .select('id, name, price_cents')
        .eq('championship_id', championship.id)
        .limit(1)
        .single();

    if (!category) {
        console.error('❌ Categoria não encontrada');
        return;
    }
    console.log(`✅ Categoria: ${category.name} - R$ ${(category.price_cents / 100).toFixed(2)}`);

    // 3. CRIAR INSCRIÇÃO
    console.log('\n📍 PASSO 3: Criar Inscrição');
    const registrationData = {
        championship_id: championship.id,
        category_id: category.id,
        user_id: authData.user.id,
        athlete_name: 'Test Athlete',
        athlete_email: 'athlete@test.com',
        athlete_phone: '(11) 99999-9999',
        team_name: null,
        team_members: null,
        subtotal_cents: category.price_cents,
        platform_fee_cents: 900, // R$ 9,00
        total_cents: category.price_cents + 900,
        payment_method: null,
        status: 'pending',
        payment_status: 'pending'
    };

    const { data: registration, error: regError } = await supabase
        .from('registrations')
        .insert(registrationData)
        .select()
        .single();

    if (regError) {
        console.error('❌ Erro ao criar inscrição:', regError.message);
        return;
    }
    console.log(`✅ Inscrição criada! ID: ${registration.id}`);
    console.log(`   Subtotal: R$ ${(registration.subtotal_cents / 100).toFixed(2)}`);
    console.log(`   Taxa Plataforma: R$ ${(registration.platform_fee_cents / 100).toFixed(2)}`);
    console.log(`   Total: R$ ${(registration.total_cents / 100).toFixed(2)}`);

    // 4. TESTAR EDGE FUNCTION DE PAGAMENTO (PIX)
    console.log('\n📍 PASSO 4: Chamar Edge Function - Criar Pagamento PIX');

    const { data: paymentResponse, error: paymentError } = await supabase.functions.invoke('create-payment', {
        body: {
            registrationId: registration.id,
            paymentMethod: 'pix'
        }
    });

    if (paymentError) {
        console.error('❌ Erro ao criar pagamento:', paymentError.message);
        console.log('   Detalhes:', paymentError);
    } else {
        console.log('✅ Pagamento PIX criado!');
        console.log('   Resposta:', JSON.stringify(paymentResponse, null, 2));
    }

    // 5. VERIFICAR REGISTRO DE PAGAMENTO
    console.log('\n📍 PASSO 5: Verificar Registro de Pagamento no Banco');
    const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('registration_id', registration.id);

    if (payments && payments.length > 0) {
        console.log(`✅ ${payments.length} pagamento(s) encontrado(s):`);
        payments.forEach(p => {
            console.log(`   - ID: ${p.id}`);
            console.log(`     Método: ${p.payment_method}`);
            console.log(`     Status: ${p.status}`);
            console.log(`     Valor: R$ ${(p.amount_cents / 100).toFixed(2)}`);
            if (p.pix_qr_code) console.log(`     QR Code: ${p.pix_qr_code.substring(0, 50)}...`);
        });
    } else {
        console.log('⚠️  Nenhum pagamento registrado ainda');
    }

    // 6. LIMPAR DADOS DE TESTE
    console.log('\n📍 PASSO 6: Limpar Dados de Teste');
    await supabase.from('payments').delete().eq('registration_id', registration.id);
    await supabase.from('registrations').delete().eq('id', registration.id);
    console.log('✅ Dados de teste removidos');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TESTE CONCLUÍDO!\n');

    await supabase.auth.signOut();
}

testPaymentFlow().catch(console.error);
