// Script para criar Subconta (Wallet do Organizador) via API Asaas

const ASAAS_API_KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjYwZmVhZjIwLTk1YjAtNDEwMi05NjEwLTliNjI0Njg1NDkxNjo6JGFhY2hfMzc0MjEyNTUtMjBhZC00OGFjLTlmOTQtNDYxZmEyYjc5NjVh';
const ASAAS_BASE_URL = 'https://sandbox.asaas.com/api/v3';

async function createSubAccount() {
    console.log('🔧 Criando Subconta (Wallet do Organizador) via API...\n');

    const response = await fetch(`${ASAAS_BASE_URL}/accounts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY
        },
        body: JSON.stringify({
            name: 'Organizador Teste',
            email: 'organizador-teste@exemplo.com',
            cpfCnpj: '12345678900',  // CPF de teste
            mobilePhone: '11999999999',
            address: 'Rua Teste',
            addressNumber: '123',
            province: 'Centro',
            postalCode: '01310-100'
        })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erro ao criar subconta:', error);
        return;
    }

    const data = await response.json();

    console.log('✅ Subconta criada com sucesso!');
    console.log(`   Wallet ID: ${data.walletId}`);
    console.log(`   Account ID: ${data.id}`);
    console.log(`   Nome: ${data.name}`);
    console.log(`   Email: ${data.email}\n`);

    console.log('📋 COPIE ESTE WALLET ID:');
    console.log(`   ${data.walletId}\n`);

    console.log('💡 Próximo passo:');
    console.log('   Use este Wallet ID como "Wallet do Organizador"');
    console.log('   E use db00cd48-a7fe-4dcd-8cdb-615e8b2d012f como "Wallet da Plataforma"');
}

createSubAccount().catch(console.error);
