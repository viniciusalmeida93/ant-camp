const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHAMP_ID = '3060b6d4-eea9-458e-b3f0-211a45b3de08';

async function testCouponApplication() {
    console.log('--- TESTANDO APLICAÇÃO DE CUPOM (ANT20) ---');

    // 1. Pegar uma inscrição pendente
    const { data: reg, error: regError } = await supabase
        .from('registrations')
        .select('id, subtotal_cents, total_cents, category_id, athlete_name, athlete_email, team_members')
        .eq('id', 'ae81d7a2-0c97-442a-b726-e9f9c3b1eb1b') // Usar a mesma para consistência
        .single();

    if (regError || !reg) {
        console.error('Nenhuma inscrição encontrada para o Ant Games.');
        return;
    }

    console.log(`Inscrição: ${reg.athlete_name} | ID: ${reg.id}`);
    console.log(`Subtotal original: R$ ${reg.subtotal_cents / 100}`);

    // 2. Chamar a Edge Function (Simular o Checkout.tsx)
    // Nota: O segredo ANT20 dá 20% de desconto.
    // Cálculo esperado no backend: subtotal * 0.20
    const expectedDiscount = Math.round(reg.subtotal_cents * 0.20);
    const newSubtotal = reg.subtotal_cents - expectedDiscount;
    const platformFee = 900; // Simular 1 atleta
    const totalWithCoupon = newSubtotal + platformFee;

    console.log(`Calculado no simulador: Desconto R$ ${expectedDiscount / 100} | Total R$ ${totalWithCoupon / 100}`);

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'apikey': SUPABASE_KEY,
            },
            body: JSON.stringify({
                registrationId: reg.id,
                categoryId: reg.category_id,
                athleteName: 'Atleta de Teste Cupom',
                athleteEmail: 'teste_cupom_v3@antcamp.com.br',
                athletePhone: '11986423377',
                athleteCpf: reg.team_members?.[0]?.cpf || '00000000000',
                priceCents: totalWithCoupon,
                paymentMethod: 'PIX',
                couponCode: 'ANT20'
            })
        });

        const data = await response.json();
        console.log('Resposta da Edge Function:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('✅ Edge Function retornou sucesso.');

            // 3. Verificar no banco de dados se o desconto foi gravado
            const { data: updatedReg } = await supabase
                .from('registrations')
                .select('id, discount_cents, coupon_id')
                .eq('id', reg.id)
                .single();

            console.log('Dados no Banco Após Checkout:', updatedReg);
            if (updatedReg.discount_cents === expectedDiscount) {
                console.log('🏆 SUCESSO: Desconto gravado corretamente no banco!');
            } else {
                console.log(`❌ ERRO: Desconto esperado ${expectedDiscount}, mas gravou ${updatedReg.discount_cents}.`);
            }
        } else {
            console.error('❌ Edge Function falhou:', data.error);
        }
    } catch (error) {
        console.error('❌ Erro na chamada da função:', error.message);
    }
}

testCouponApplication();
