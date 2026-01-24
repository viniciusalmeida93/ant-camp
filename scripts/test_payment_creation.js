import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testPaymentCreation() {
    console.log('💰 Teste de Criação de Pagamento com Split\n');

    // 1. Login
    console.log('1️⃣ Login como organizador...');
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'organizer@test.com',
        password: 'password123'
    });
    console.log('✅ Login OK\n');

    // 2. Buscar campeonato
    const { data: championship } = await supabase
        .from('championships')
        .select('id, name')
        .eq('slug', 'caverna-challenge-2025')
        .single();

    console.log(`2️⃣ Campeonato: ${championship.name}\n`);

    // 3. Buscar categoria
    const { data: category } = await supabase
        .from('categories')
        .select('id, name, price_cents')
        .eq('championship_id', championship.id)
        .limit(1)
        .single();

    console.log(`3️⃣ Categoria: ${category.name}`);
    console.log(`   Preço: R$ ${(category.price_cents / 100).toFixed(2)}\n`);

    // 4. Criar inscrição
    console.log('4️⃣ Criando inscrição...');
    const { data: registration } = await supabase
        .from('registrations')
        .insert({
            championship_id: championship.id,
            category_id: category.id,
            user_id: authData.user.id,
            athlete_name: 'Teste Split Real',
            athlete_email: 'vinicius.almeidaa93@gmail.com',
            athlete_phone: '(11) 99999-9999',
            athlete_cpf: '11122233344',
            athlete_birth_date: '1990-01-01',
            subtotal_cents: category.price_cents,
            platform_fee_cents: 900,
            total_cents: category.price_cents + 900,
            payment_status: 'pending',
            payment_method: 'pix'
        })
        .select()
        .single();

    console.log(`✅ Inscrição criada: ${registration.id.substring(0, 8)}`);
    console.log(`   Total: R$ ${(registration.total_cents / 100).toFixed(2)}\n`);

    // 5. Chamar Edge Function create-payment
    console.log('5️⃣ Chamando Edge Function create-payment...');
    console.log('   Método: PIX\n');

    try {
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', {
            body: {
                registrationId: registration.id,
                paymentMethod: 'pix'
            }
        });

        if (paymentError) {
            console.error('❌ Erro ao criar pagamento:', paymentError);
            console.log('\nDetalhes:', JSON.stringify(paymentError, null, 2));
            return;
        }

        console.log('✅ Pagamento criado com sucesso!\n');
        console.log('📋 Resposta do Asaas:');
        console.log(JSON.stringify(paymentData, null, 2));
        console.log('');

        // Verificar se o split está presente
        if (paymentData.split) {
            console.log('💸 SPLIT DETECTADO:');
            paymentData.split.forEach((s, i) => {
                console.log(`   ${i + 1}. Wallet: ${s.walletId}`);
                console.log(`      Valor: R$ ${s.totalValue || s.fixedValue || 'N/A'}`);
                console.log(`      Status: ${s.status || 'N/A'}`);
            });
            console.log('');
            console.log('✅ SPLIT FUNCIONANDO CORRETAMENTE!');
        } else {
            console.log('⚠️  Split não encontrado na resposta');
        }

        // QR Code PIX
        if (paymentData.encodedImage) {
            console.log('\n📱 QR Code PIX gerado com sucesso!');
            console.log(`   Payload: ${paymentData.payload?.substring(0, 50)}...`);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.log('\nStack:', error.stack);
    }

    // Limpar
    console.log('\n🧹 Limpando...');
    await supabase.from('registrations').delete().eq('id', registration.id);
    console.log('✅ Inscrição removida');

    await supabase.auth.signOut();
    console.log('✅ Teste concluído!\n');
}

testPaymentCreation();
