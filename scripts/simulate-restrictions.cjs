const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHAMP_ID = '35ca9251-40be-452a-9f79-6799f9298e3b'; // Ant Games / Int Gaming

const CATEGORIES = {
    INICIANTE_MISTO: 'dd418d67-50c0-41c5-a093-be8f6b2b3c7b', // Min Age 15
    SCALE_MASCULINO: '66252667-5d5e-4ef5-982d-47e19dd9ac7e', // Min Age 18
    INTERMEDIARIO_FEMININO: '55d84599-4e10-4297-9746-9ca34819b40a', // No Min Age
    ELITE_MASCULINO: '18e1e3b1-5984-4128-a6a1-5433b6874070', // Age 18-30
};

async function testAgeRestriction() {
    console.log('\n--- TESTE 1: RESTRIÇÃO DE IDADE ---');
    // Atleta de 10 anos tentando entrar em Elite (18-30)
    const fakeBirthDate = '2016-01-01';
    const registrationData = {
        championship_id: CHAMP_ID,
        category_id: CATEGORIES.ELITE_MASCULINO,
        athlete_name: 'Atleta Jovem Teste',
        athlete_email: 'jovem@teste.com',
        athlete_phone: '11999999999',
        status: 'pending',
        payment_status: 'pending',
        team_members: [{
            name: 'Atleta Jovem Teste',
            email: 'jovem@teste.com',
            birthDate: fakeBirthDate,
            cpf: '00000000000',
            shirtSize: 'M'
        }],
        total_cents: 10000,
        subtotal_cents: 8000,
        platform_fee_cents: 2000,
    };

    const { data, error } = await supabase.from('registrations').insert(registrationData).select();

    if (error) {
        console.log('✅ Banco Barrou (Correto):', error.message);
    } else {
        console.log('❌ Banco NÃO Barrou (Vulnerabilidade): Inscrição realizada com idade inválida.');
        // Limpar o teste
        await supabase.from('registrations').delete().eq('id', data[0].id);
    }
}

async function testCapacityRestriction() {
    console.log('\n--- TESTE 2: RESTRIÇÃO DE CAPACIDADE ---');
    // Tentar inserir inscrições em massa até estourar a capacidade (10)
    const categoryId = CATEGORIES.INICIANTE_MISTO;
    console.log('Tentando inserir 11 inscrições para testar o limite de 10...');

    for (let i = 1; i <= 11; i++) {
        const regData = {
            championship_id: CHAMP_ID,
            category_id: categoryId,
            athlete_name: `Atleta Teste Cap ${i}`,
            athlete_email: `cap${i}@teste.com`,
            status: 'approved',
            payment_status: 'paid',
            total_cents: 40000,
            subtotal_cents: 35000,
            platform_fee_cents: 5000,
            team_members: [{ name: `Atleta ${i}`, shirtSize: 'M', birthDate: '1990-01-01', cpf: '00000000000' }]
        };

        const { data, error } = await supabase.from('registrations').insert(regData).select();

        if (error) {
            console.log(`Parei na inscrição ${i}:`, error.message);
            if (i > 10) console.log('✅ Banco barrou após o limite (Correto)');
            break;
        } else {
            if (i > 10) {
                console.log('❌ Banco NÃO barrou o limite de capacidade! Inscrição 11 foi aceita.');
            }
        }
    }
}

async function clearTests() {
    console.log('\nLimpando registros de teste...');
    await supabase.from('registrations').delete().ilike('athlete_email', '%@teste.com');
}

async function runTests() {
    await testAgeRestriction();
    await testCapacityRestriction();
    await clearTests();
}

runTests();
