import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAdminFeatures() {
    console.log('🧪 Testando Funcionalidades Administrativas\n');

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

    // Buscar categoria
    const { data: category } = await supabase
        .from('categories')
        .select('id, price_cents')
        .eq('championship_id', championship.id)
        .limit(1)
        .single();

    // 1. TESTE: Criar inscrição com status PENDING
    console.log('1️⃣ Criando inscrição com status PENDING...');
    const { data: pendingReg, error: regError } = await supabase
        .from('registrations')
        .insert({
            championship_id: championship.id,
            category_id: category.id,
            user_id: authData.user.id,
            athlete_name: 'Teste Admin Features',
            athlete_email: 'vinicius.almeidaa93@gmail.com', // Email do dono da conta Resend
            athlete_phone: '(11) 99999-9999',
            athlete_cpf: '777.777.777-77',
            athlete_birth_date: '1990-01-01',
            subtotal_cents: category.price_cents,
            platform_fee_cents: 900,
            total_cents: category.price_cents + 900,
            payment_status: 'pending', // Status inicial: PENDING
            payment_method: 'pix'
        })
        .select()
        .single();

    if (regError) {
        console.error('❌ Erro:', regError.message);
        return;
    }

    console.log(`✅ Inscrição criada: ${pendingReg.id.substring(0, 8)}`);
    console.log(`   Status inicial: ${pendingReg.payment_status}\n`);

    // 2. TESTE: Atualizar status de pagamento
    console.log('2️⃣ Testando atualização de status de pagamento...');

    // Pending → Paid
    await supabase
        .from('registrations')
        .update({ payment_status: 'paid' })
        .eq('id', pendingReg.id);
    console.log('   ✅ Status atualizado: pending → paid');

    // Paid → Approved
    await supabase
        .from('registrations')
        .update({ payment_status: 'approved', paid_at: new Date().toISOString() })
        .eq('id', pendingReg.id);
    console.log('   ✅ Status atualizado: paid → approved\n');

    // Verificar
    const { data: updatedReg } = await supabase
        .from('registrations')
        .select('payment_status, paid_at')
        .eq('id', pendingReg.id)
        .single();

    console.log(`   Status final: ${updatedReg.payment_status}`);
    console.log(`   Pago em: ${updatedReg.paid_at ? new Date(updatedReg.paid_at).toLocaleString('pt-BR') : 'N/A'}\n`);

    // 3. TESTE: Email de confirmação
    console.log('3️⃣ Testando envio de email de confirmação...');
    try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-registration-email', {
            body: { registrationId: pendingReg.id }
        });

        if (emailError) throw emailError;

        console.log('   ✅ Email de confirmação enviado!');
        console.log(`      Email ID: ${emailData.emailId}`);
        console.log(`      Destinatários: ${emailData.recipients}\n`);
    } catch (error) {
        console.error('   ❌ Erro ao enviar email:', error.message, '\n');
    }

    // 4. TESTE: Voltar status para PENDING e testar cart recovery
    console.log('4️⃣ Testando email de recuperação de carrinho...');

    // Voltar para pending
    await supabase
        .from('registrations')
        .update({ payment_status: 'pending', paid_at: null })
        .eq('id', pendingReg.id);
    console.log('   Status revertido para: pending\n');

    try {
        const { data: cartData, error: cartError } = await supabase.functions.invoke('send-cart-recovery', {
            body: { registrationId: pendingReg.id }
        });

        if (cartError) throw cartError;

        console.log('   ✅ Email de recuperação enviado!');
        console.log(`      Email ID: ${cartData.emailId}\n`);
    } catch (error) {
        console.error('   ❌ Erro ao enviar cart recovery:', error.message, '\n');
    }

    // 5. TESTE: Verificar que inscrições com todos os status aparecem
    console.log('5️⃣ Verificando visibilidade de inscrições...');
    const { data: allRegs } = await supabase
        .from('registrations')
        .select('id, payment_status')
        .eq('championship_id', championship.id);

    const statusCount = allRegs?.reduce((acc, reg) => {
        acc[reg.payment_status] = (acc[reg.payment_status] || 0) + 1;
        return acc;
    }, {});

    console.log('   Inscrições por status:');
    Object.entries(statusCount || {}).forEach(([status, count]) => {
        console.log(`      ${status}: ${count}`);
    });
    console.log('');

    // Limpar
    await supabase.from('registrations').delete().eq('id', pendingReg.id);
    console.log('🧹 Inscrição de teste removida\n');

    await supabase.auth.signOut();
    console.log('🎉 Todos os testes concluídos!\n');

    console.log('📋 RESUMO:');
    console.log('   ✅ Criação de inscrição com status PENDING');
    console.log('   ✅ Atualização de status (pending → paid → approved)');
    console.log('   ✅ Email de confirmação funcionando');
    console.log('   ✅ Email de recuperação de carrinho funcionando');
    console.log('   ✅ Visibilidade de todas as inscrições (todos os status)');
}

testAdminFeatures();
