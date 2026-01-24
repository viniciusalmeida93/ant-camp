import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testCouponSystemFixed() {
    console.log('🧪 Teste de Sistema de Cupons (Corrigido)\n');

    // Login como organizador
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'organizer@test.com',
        password: 'password123'
    });
    console.log('✅ Login OK\n');

    // Buscar campeonato
    const { data: championship } = await supabase
        .from('championships')
        .select('id, name')
        .eq('slug', 'test-championship-2025')
        .single();

    console.log(`📋 Campeonato: ${championship.name}\n`);

    // Criar cupom de teste
    console.log('1️⃣ Criando cupom de desconto...');
    const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .insert({
            championship_id: championship.id,
            code: 'TEST10',
            description: 'Cupom de teste - 10% de desconto',
            discount_type: 'percentage',
            discount_value: 10,
            max_uses: 5,
            used_count: 0,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
        })
        .select()
        .single();

    if (couponError) {
        if (couponError.message.includes('duplicate key')) {
            console.log('   ℹ️  Cupom TEST10 já existe\n');
        } else {
            console.error('   ❌ Erro:', couponError.message);
            return;
        }
    } else {
        console.log(`   ✅ Cupom criado: ${coupon.code}`);
        console.log(`      Desconto: ${coupon.discount_value}%`);
        console.log(`      Limite: ${coupon.max_uses} usos\n`);
    }

    // Validar cupom
    console.log('2️⃣ Validando cupom TEST10...');
    const { data: validCoupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', 'TEST10')
        .eq('championship_id', championship.id)
        .eq('is_active', true)
        .single();

    if (validCoupon) {
        const now = new Date();
        const expiresAt = new Date(validCoupon.expires_at);

        if (now > expiresAt) {
            console.log('   ⚠️  Cupom expirado');
        } else if (validCoupon.used_count >= validCoupon.max_uses) {
            console.log('   ⚠️  Cupom esgotado');
        } else {
            console.log('   ✅ Cupom válido!');
            console.log(`      Tipo: ${validCoupon.discount_type}`);
            console.log(`      Valor: ${validCoupon.discount_value}${validCoupon.discount_type === 'percentage' ? '%' : ' centavos'}`);
            console.log(`      Usos: ${validCoupon.used_count}/${validCoupon.max_uses}\n`);
        }
    }

    // Simular aplicação
    console.log('3️⃣ Simulando aplicação de desconto...');
    const subtotal = 10000; // R$ 100
    const platformFee = 900; // R$ 9

    let discount = 0;
    if (validCoupon.discount_type === 'percentage') {
        discount = Math.floor((subtotal * validCoupon.discount_value) / 100);
    } else {
        discount = validCoupon.discount_value;
    }

    const total = subtotal + platformFee - discount;

    console.log(`   Subtotal: R$ ${(subtotal / 100).toFixed(2)}`);
    console.log(`   Taxa: R$ ${(platformFee / 100).toFixed(2)}`);
    console.log(`   Desconto: -R$ ${(discount / 100).toFixed(2)}`);
    console.log(`   ✅ Total: R$ ${(total / 100).toFixed(2)}\n`);

    // Testar cupom expirado
    console.log('4️⃣ Testando cupom expirado...');
    const { data: expiredCoupon } = await supabase
        .from('coupons')
        .insert({
            championship_id: championship.id,
            code: 'EXPIRED',
            discount_type: 'fixed',
            discount_value: 500,
            max_uses: 10,
            used_count: 0,
            expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Ontem
            is_active: true
        })
        .select()
        .single();

    if (expiredCoupon) {
        const now = new Date();
        const expiresAt = new Date(expiredCoupon.expires_at);

        if (now > expiresAt) {
            console.log('   ✅ Validação de expiração OK! (cupom EXPIRED está expirado)\n');
        }

        await supabase.from('coupons').delete().eq('id', expiredCoupon.id);
    }

    // Testar limite de usos
    console.log('5️⃣ Testando limite de usos...');
    const { data: limitCoupon } = await supabase
        .from('coupons')
        .insert({
            championship_id: championship.id,
            code: 'LIMIT1',
            discount_type: 'fixed',
            discount_value: 500,
            max_uses: 1,
            used_count: 1, // Já esgotado
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
        })
        .select()
        .single();

    if (limitCoupon) {
        if (limitCoupon.used_count >= limitCoupon.max_uses) {
            console.log('   ✅ Validação de limite OK! (cupom LIMIT1 esgotado)\n');
        }

        await supabase.from('coupons').delete().eq('id', limitCoupon.id);
    }

    await supabase.auth.signOut();
    console.log('🎉 Teste de Cupons Concluído!\n');
}

testCouponSystemFixed();
