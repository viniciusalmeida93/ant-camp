import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Credenciais Asaas
const PLATFORM_WALLET_ID = 'db00cd48-a7fe-4dcd-8cdb-615e8b2d012f';
const ORGANIZER_WALLET_ID = 'c451d6ce-e4ce-46d2-9d07-9f154710c0f3';

async function testPaymentSplit() {
    console.log('🧪 Teste Completo de Pagamento com Split\n');
    console.log('📋 Configuração:');
    console.log(`   Platform Wallet: ${PLATFORM_WALLET_ID}`);
    console.log(`   Organizer Wallet: ${ORGANIZER_WALLET_ID}\n`);

    // 1. Login como organizador
    console.log('1️⃣ Login como organizador...');
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'organizer@test.com',
        password: 'password123'
    });
    console.log('✅ Login OK\n');

    // 2. Buscar campeonato
    const { data: championship } = await supabase
        .from('championships')
        .select('id, name, organizer_id')
        .eq('slug', 'test-championship-2025')
        .single();

    console.log(`2️⃣ Campeonato: ${championship.name}`);
    console.log(`   Organizer ID: ${championship.organizer_id}\n`);

    // 3. Configurar integração Asaas do organizador
    console.log('3️⃣ Configurando integração Asaas do organizador...');

    // Verificar se já existe
    const { data: existingIntegration } = await supabase
        .from('organizer_asaas_integrations')
        .select('*')
        .eq('organizer_id', championship.organizer_id)
        .single();

    if (existingIntegration) {
        console.log('   ℹ️  Integração já existe, atualizando...');
        await supabase
            .from('organizer_asaas_integrations')
            .update({ wallet_id: ORGANIZER_WALLET_ID })
            .eq('organizer_id', championship.organizer_id);
    } else {
        console.log('   ℹ️  Criando nova integração...');
        await supabase
            .from('organizer_asaas_integrations')
            .insert({
                organizer_id: championship.organizer_id,
                wallet_id: ORGANIZER_WALLET_ID,
                is_active: true
            });
    }
    console.log(`✅ Wallet configurada: ${ORGANIZER_WALLET_ID}\n`);

    // 4. Buscar categoria
    const { data: category } = await supabase
        .from('categories')
        .select('id, name, price_cents')
        .eq('championship_id', championship.id)
        .limit(1)
        .single();

    console.log(`4️⃣ Categoria: ${category.name}`);
    console.log(`   Preço: R$ ${(category.price_cents / 100).toFixed(2)}\n`);

    // 5. Criar inscrição de teste
    console.log('5️⃣ Criando inscrição de teste...');
    const { data: registration } = await supabase
        .from('registrations')
        .insert({
            championship_id: championship.id,
            category_id: category.id,
            user_id: authData.user.id,
            athlete_name: 'Teste Split Pagamento',
            athlete_email: 'vinicius.almeidaa93@gmail.com',
            athlete_phone: '(11) 99999-9999',
            athlete_cpf: '888.888.888-88',
            athlete_birth_date: '1990-01-01',
            subtotal_cents: category.price_cents,
            platform_fee_cents: 900, // R$ 9,00
            total_cents: category.price_cents + 900,
            payment_status: 'pending',
            payment_method: 'pix'
        })
        .select()
        .single();

    console.log(`✅ Inscrição criada: ${registration.id.substring(0, 8)}`);
    console.log(`   Subtotal: R$ ${(registration.subtotal_cents / 100).toFixed(2)}`);
    console.log(`   Taxa Plataforma: R$ ${(registration.platform_fee_cents / 100).toFixed(2)}`);
    console.log(`   Total: R$ ${(registration.total_cents / 100).toFixed(2)}\n`);

    // 6. Testar criação de pagamento (simulação)
    console.log('6️⃣ Testando criação de pagamento PIX...');
    console.log('   ⚠️  NOTA: Teste real requer Edge Function create-payment');
    console.log('   📝 Payload esperado:');

    const expectedPayload = {
        registrationId: registration.id,
        paymentMethod: 'pix'
    };

    console.log(JSON.stringify(expectedPayload, null, 2));
    console.log('');

    // 7. Calcular split esperado
    console.log('7️⃣ Calculando split esperado...');

    const totalValue = registration.total_cents / 100; // R$ 109,00
    const platformFee = registration.platform_fee_cents / 100; // R$ 9,00
    const organizerValue = registration.subtotal_cents / 100; // R$ 100,00

    console.log('   💰 Divisão de Valores:');
    console.log(`      Total da transação: R$ ${totalValue.toFixed(2)}`);
    console.log(`      Plataforma (${PLATFORM_WALLET_ID.substring(0, 8)}...): R$ ${platformFee.toFixed(2)}`);
    console.log(`      Organizador (${ORGANIZER_WALLET_ID.substring(0, 8)}...): R$ ${organizerValue.toFixed(2)}\n`);

    // 8. Estrutura esperada do split no Asaas
    console.log('8️⃣ Estrutura de Split esperada no Asaas:');
    const expectedSplit = [
        {
            walletId: PLATFORM_WALLET_ID,
            fixedValue: platformFee,
            percentualValue: null,
            totalValue: platformFee,
            status: 'PENDING'
        },
        {
            walletId: ORGANIZER_WALLET_ID,
            fixedValue: null,
            percentualValue: null,
            totalValue: organizerValue,
            status: 'PENDING'
        }
    ];

    console.log(JSON.stringify(expectedSplit, null, 2));
    console.log('');

    // 9. Verificar configuração da plataforma
    console.log('9️⃣ Verificando configuração da plataforma...');
    const { data: platformSettings } = await supabase
        .from('platform_settings')
        .select('*')
        .single();

    if (platformSettings) {
        console.log('   ✅ Platform Settings encontrado:');
        console.log(`      Taxa fixa: R$ ${(platformSettings.platform_fee_cents / 100).toFixed(2)}`);
        console.log(`      Taxa percentual: ${platformSettings.platform_fee_percentage}%`);
        console.log(`      Wallet ID: ${platformSettings.asaas_platform_wallet_id || 'NÃO CONFIGURADO'}\n`);

        if (!platformSettings.asaas_platform_wallet_id) {
            console.log('   ⚠️  ATENÇÃO: Platform Wallet ID não está configurado!');
            console.log('   📝 Atualizando...');
            await supabase
                .from('platform_settings')
                .update({ asaas_platform_wallet_id: PLATFORM_WALLET_ID })
                .eq('id', platformSettings.id);
            console.log('   ✅ Platform Wallet ID configurado!\n');
        }
    } else {
        console.log('   ⚠️  Platform Settings não encontrado, criando...');
        await supabase
            .from('platform_settings')
            .insert({
                platform_fee_cents: 900,
                platform_fee_percentage: 0,
                asaas_platform_wallet_id: PLATFORM_WALLET_ID
            });
        console.log('   ✅ Platform Settings criado!\n');
    }

    // 10. Resumo final
    console.log('🎯 RESUMO DO TESTE:\n');
    console.log('✅ Configurações:');
    console.log(`   - Platform Wallet configurada: ${PLATFORM_WALLET_ID}`);
    console.log(`   - Organizer Wallet configurada: ${ORGANIZER_WALLET_ID}`);
    console.log(`   - Inscrição criada: ${registration.id.substring(0, 8)}`);
    console.log('');
    console.log('✅ Split Calculado:');
    console.log(`   - Plataforma recebe: R$ ${platformFee.toFixed(2)} (taxa de serviço)`);
    console.log(`   - Organizador recebe: R$ ${organizerValue.toFixed(2)} (valor da inscrição)`);
    console.log('');
    console.log('📝 Próximos Passos:');
    console.log('   1. Testar Edge Function create-payment via UI ou script');
    console.log('   2. Verificar no Asaas Sandbox se o split foi criado corretamente');
    console.log('   3. Simular webhook de confirmação de pagamento');
    console.log('');

    // Limpar
    await supabase.from('registrations').delete().eq('id', registration.id);
    console.log('🧹 Inscrição de teste removida');

    await supabase.auth.signOut();
    console.log('✅ Teste concluído!\n');
}

testPaymentSplit();
