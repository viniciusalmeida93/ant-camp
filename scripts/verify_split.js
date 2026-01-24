import { createClient } from '@supabase/supabase-js';

const ASAAS_API_KEY_SANDBOX = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmVlMmVhNjRlLTgzODAtNDEwMi1hODM3LWRkOWNmNzZiNDA3YTo6JGFhY2hfNjc4MTg5MjctMDMxNy00Y2QxLWFlMjEtOThlYzQ2MWFiYThj';
const PAYMENT_ID = 'pay_abowkyvploy9yvfk';

async function checkPaymentSplit() {
    console.log('🔍 Verificando Split do Pagamento\n');
    console.log(`Payment ID: ${PAYMENT_ID}\n`);

    try {
        // Buscar detalhes do pagamento no Asaas
        const response = await fetch(`https://api-sandbox.asaas.com/v3/payments/${PAYMENT_ID}`, {
            method: 'GET',
            headers: {
                'access_token': ASAAS_API_KEY_SANDBOX,
                'Content-Type': 'application/json'
            }
        });

        const payment = await response.json();

        console.log('📋 Detalhes do Pagamento:');
        console.log(`   Status: ${payment.status}`);
        console.log(`   Valor: R$ ${payment.value}`);
        console.log(`   Descrição: ${payment.description}\n`);

        // Buscar informações de split
        const splitResponse = await fetch(`https://api-sandbox.asaas.com/v3/payments/${PAYMENT_ID}/splits`, {
            method: 'GET',
            headers: {
                'access_token': ASAAS_API_KEY_SANDBOX,
                'Content-Type': 'application/json'
            }
        });

        const splitData = await splitResponse.json();

        if (splitData.data && splitData.data.length > 0) {
            console.log('💸 SPLIT CONFIGURADO:');
            console.log(`   Total de destinatários: ${splitData.data.length}\n`);

            splitData.data.forEach((split, index) => {
                console.log(`   ${index + 1}. Wallet ID: ${split.walletId}`);
                console.log(`      Valor: R$ ${split.totalValue || split.fixedValue || 'N/A'}`);
                console.log(`      Status: ${split.status}`);
                console.log('');
            });

            console.log('✅ SPLIT FUNCIONANDO PERFEITAMENTE!');
        } else {
            console.log('⚠️  Nenhum split encontrado');
            console.log('Response:', JSON.stringify(splitData, null, 2));
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

checkPaymentSplit();
