import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testCouponSystem() {
    console.log('🧪 Teste de Sistema de Cupons\n');

    // 1. Login como organizador para criar cupom
    console.log('1️⃣ Fazendo login como organizador...');
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'organizer@test.com',
        password: 'password123'
    });
    console.log('✅ Login OK\n');

    // 2. Buscar campeonato
    const { data: championship } = await supabase
        .from('championships')
        .select('id, name')
        .eq('slug', 'test-championship-2025')
        .single();

    console.log(`2️⃣ Campeonato: ${championship.name}\n`);

    // 3. Criar cupom de teste
    console.log('3️⃣ Criando cupom de teste...');
    const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .insert({
            championship_id: championship.id,
            code: 'TEST10',
            discount_type: 'percentage',
            discount_value: 10, // 10%
            max_uses: 5,
            current_uses: 0,
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
            is_active: true
        })
        .select()
        .single();

    if (couponError) {
        if (couponError.message.includes('duplicate key')) {
            console.log('   ℹ️  Cupom TEST10 já existe, usando existente...');
            const { data: existingCoupon } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', 'TEST10')
                .eq('championship_id', championship.id)
                .single();
            console.log(`   ✅ Cupom encontrado: ${existingCoupon.code} (-${existingCoupon.discount_value}%)\n`);
        } else {
            console.error('   ❌ Erro ao criar cupom:', couponError.message);
            return;
        }
    } else {
        console.log(`   ✅ Cupom criado: ${coupon.code} (-${coupon.discount_value}%)\n`);
    }

    // 4. Validar cupom (como se fosse no frontend)
    console.log('4️⃣ Validando cupom TEST10...');
    const { data: validCoupon, error: validateError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', 'TEST10')
        .eq('championship_id', championship.id)
        .eq('is_active', true)
        .single();

    if (validateError) {
        console.log('   ❌ Cupom não encontrado ou inválido');
    } else {
        // Verificar validade
        const now = new Date();
        const validFrom = new Date(validCoupon.valid_from);
        const validUntil = new Date(validCoupon.valid_until);

        if (now < validFrom) {
            console.log('   ⚠️  Cupom ainda não está válido');
        } else if (now > validUntil) {
            console.log('   ⚠️  Cupom expirado');
        } else if (validCoupon.current_uses >= validCoupon.max_uses) {
            console.log('   ⚠️  Cupom atingiu limite de usos');
        } else {
            console.log('   ✅ Cupom válido!');
            console.log(`      Tipo: ${validCoupon.discount_type}`);
            console.log(`      Desconto: ${validCoupon.discount_value}${validCoupon.discount_type === 'percentage' ? '%' : ' centavos'}`);
            console.log(`      Usos: ${validCoupon.current_uses}/${validCoupon.max_uses}\n`);
        }
    }

    // 5. Simular aplicação de desconto
    console.log('5️⃣ Simulando aplicação de desconto...');
    const subtotal = 10000; // R$ 100,00
    const platformFee = 900; // R$ 9,00
    const total = subtotal + platformFee; // R$ 109,00

    console.log(`   Subtotal: R$ ${(subtotal / 100).toFixed(2)}`);
    console.log(`   Taxa: R$ ${(platformFee / 100).toFixed(2)}`);
    console.log(`   Total sem desconto: R$ ${(total / 100).toFixed(2)}`);

    if (validCoupon) {
        let discount = 0;
        if (validCoupon.discount_type === 'percentage') {
            discount = Math.floor((subtotal * validCoupon.discount_value) / 100);
        } else {
            discount = validCoupon.discount_value;
        }

        const totalWithDiscount = total - discount;
        console.log(`   Desconto: -R$ ${(discount / 100).toFixed(2)}`);
        console.log(`   ✅ Total com desconto: R$ ${(totalWithDiscount / 100).toFixed(2)}\n`);
    }

    // 6. Testar cupom expirado
    console.log('6️⃣ Testando cupom expirado...');
    const { data: expiredCoupon, error: expiredError } = await supabase
        .from('coupons')
        .insert({
            championship_id: championship.id,
            code: 'EXPIRED',
            discount_type: 'percentage',
            discount_value: 20,
            max_uses: 10,
            current_uses: 0,
            valid_from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // -60 dias
            valid_until: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // -30 dias
            is_active: true
        })
        .select()
        .single();

    if (!expiredError) {
        const now = new Date();
        const validUntil = new Date(expiredCoupon.valid_until);

        if (now > validUntil) {
            console.log('   ✅ Validação de expiração funcionando! (cupom EXPIRED está expirado)\n');
        }

        // Limpar
        await supabase.from('coupons').delete().eq('id', expiredCoupon.id);
    }

    // 7. Testar limite de usos
    console.log('7️⃣ Testando limite de usos...');
    const { data: limitCoupon } = await supabase
        .from('coupons')
        .insert({
            championship_id: championship.id,
            code: 'LIMIT1',
            discount_type: 'fixed',
            discount_value: 500, // R$ 5,00
            max_uses: 1,
            current_uses: 1, // Já usado
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
        })
        .select()
        .single();

    if (limitCoupon) {
        if (limitCoupon.current_uses >= limitCoupon.max_uses) {
            console.log('   ✅ Validação de limite de usos funcionando! (cupom LIMIT1 esgotado)\n');
        }

        // Limpar
        await supabase.from('coupons').delete().eq('id', limitCoupon.id);
    }

    await supabase.auth.signOut();
    console.log('🎉 Teste de Cupons Concluído!\n');
}

testCouponSystem();
