import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPaymentConfig() {
    console.log('🔍 VERIFICANDO CONFIGURAÇÃO DE PAGAMENTO\n');

    // 1. Buscar organizador via profiles (não auth.users)
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', 'organizer@test.com')
        .single();

    if (!profile) {
        console.error('❌ Organizador não encontrado');
        return;
    }

    const organizerId = profile.id;
    console.log(`✅ Organizador: ${profile.full_name || profile.email}`);
    console.log(`   ID: ${organizerId}\n`);

    // 2. Verificar integração Asaas
    console.log('📍 Verificando Integração Asaas...');
    const { data: integration } = await supabase
        .from('organizer_asaas_integrations')
        .select('*')
        .eq('organizer_id', organizerId)
        .maybeSingle();

    if (integration) {
        console.log('✅ Integração encontrada:');
        console.log(`   Wallet ID: ${integration.asaas_wallet_id || '❌ NÃO CONFIGURADO'}`);
        console.log(`   Modo Produção: ${integration.is_production_mode ? 'SIM' : 'NÃO (Sandbox)'}`);
        console.log(`   Ativa: ${integration.is_active ? 'SIM' : 'NÃO'}`);
    } else {
        console.log('❌ Integração Asaas NÃO encontrada');
        console.log('   Isso impedirá a criação de pagamentos!\n');
    }

    // 3. Verificar configurações da plataforma
    console.log('\n📍 Verificando Configurações da Plataforma...');
    const { data: platformSettings } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (platformSettings) {
        console.log('✅ Configurações encontradas:');
        console.log(`   Taxa da Plataforma: ${platformSettings.platform_fee_percentage}%`);
        console.log(`   Wallet da Plataforma: ${platformSettings.platform_wallet_id || '❌ NÃO CONFIGURADO'}`);
    } else {
        console.log('❌ Configurações da plataforma NÃO encontradas');
    }

    // 4. Diagnóstico
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNÓSTICO:\n');

    const hasOrganizerWallet = integration?.asaas_wallet_id;
    const hasPlatformWallet = platformSettings?.platform_wallet_id;
    const isActive = integration?.is_active;

    if (hasOrganizerWallet && hasPlatformWallet && isActive) {
        console.log('✅ TUDO CONFIGURADO! Sistema de pagamento deve funcionar.');
    } else {
        console.log('❌ CONFIGURAÇÃO INCOMPLETA:');
        if (!hasOrganizerWallet) console.log('   - Falta Wallet ID do Organizador');
        if (!hasPlatformWallet) console.log('   - Falta Wallet ID da Plataforma');
        if (!isActive) console.log('   - Integração não está ativa');

        console.log('\n💡 COMO CONFIGURAR (SEGURO):');
        console.log('   1. Abra Supabase Dashboard > SQL Editor');
        console.log('   2. Execute a query de configuração que vou te passar');
        console.log('   3. Substitua YOUR_WALLET_ID pela sua Wallet real');
    }
}

checkPaymentConfig();
