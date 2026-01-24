import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testEmailFixed() {
    console.log('🧪 Teste de Email - Versão Corrigida\n');

    // 1. Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'athlete@test.com',
        password: 'password123'
    });

    if (authError) {
        console.error('❌ Erro no login:', authError.message);
        return;
    }
    console.log('✅ Login OK\n');

    // 2. Buscar uma inscrição existente (ao invés de criar nova)
    console.log('🔍 Buscando inscrição existente...');
    const { data: existingReg, error: regError } = await supabase
        .from('registrations')
        .select('id, athlete_name, athlete_email')
        .eq('user_id', authData.user.id)
        .limit(1)
        .single();

    if (regError || !existingReg) {
        console.log('⚠️  Nenhuma inscrição encontrada para este usuário.');
        console.log('   Vou usar uma inscrição qualquer do sistema...\n');

        // Buscar qualquer inscrição
        const { data: anyReg } = await supabase
            .from('registrations')
            .select('id, athlete_name, athlete_email')
            .limit(1)
            .single();

        if (!anyReg) {
            console.error('❌ Nenhuma inscrição encontrada no sistema.');
            console.log('   Crie uma inscrição manualmente primeiro via /inscricao/');
            return;
        }

        console.log(`✅ Usando inscrição: ${anyReg.id.substring(0, 8)}\n`);
        await testEmail(anyReg.id);
    } else {
        console.log(`✅ Inscrição encontrada: ${existingReg.id.substring(0, 8)}\n`);
        await testEmail(existingReg.id);
    }

    await supabase.auth.signOut();
}

async function testEmail(registrationId) {
    console.log('📧 Enviando email de teste...\n');

    try {
        const response = await fetch(
            'https://jxuhmqctiyeheamhviob.supabase.co/functions/v1/send-registration-email',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({ registrationId })
            }
        );

        const responseText = await response.text();

        if (!response.ok) {
            console.error('❌ Erro na Edge Function (Status:', response.status, ')');
            try {
                const errorData = JSON.parse(responseText);
                console.log('\n📋 Detalhes do Erro:');
                console.log(JSON.stringify(errorData, null, 2));
            } catch {
                console.log('\n📋 Response:', responseText);
            }
        } else {
            const result = JSON.parse(responseText);
            console.log('✅ Email enviado com sucesso!');
            console.log('   Email ID:', result.emailId);
            console.log('   Destinatários:', result.recipients);
            console.log('\n🎉 Teste concluído! Verifique a caixa de entrada.\n');
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }
}

testEmailFixed();
