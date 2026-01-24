import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAsaasDirectly() {
    console.log('🔍 Testando API Asaas Diretamente\n');

    const ASAAS_API_KEY_SANDBOX = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmVlMmVhNjRlLTgzODAtNDEwMi1hODM3LWRkOWNmNzZiNDA3YTo6JGFhY2hfNjc4MTg5MjctMDMxNy00Y2QxLWFlMjEtOThlYzQ2MWFiYThj';

    console.log('Chave fornecida:');
    console.log(`  Prefixo: ${ASAAS_API_KEY_SANDBOX.substring(0, 15)}...`);
    console.log(`  Tamanho: ${ASAAS_API_KEY_SANDBOX.length} caracteres\n`);

    // Testar chamada direta à API Asaas Sandbox
    console.log('Testando chamada à API Asaas Sandbox...\n');

    try {
        const response = await fetch('https://api-sandbox.asaas.com/v3/customers', {
            method: 'GET',
            headers: {
                'access_token': ASAAS_API_KEY_SANDBOX,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status: ${response.status}`);
        const data = await response.text();
        console.log(`Response: ${data.substring(0, 200)}...\n`);

        if (response.ok) {
            console.log('✅ Chave API Sandbox VÁLIDA!\n');
        } else {
            console.log('❌ Chave API Sandbox INVÁLIDA\n');
            console.log('Resposta completa:', data);
        }
    } catch (error) {
        console.error('❌ Erro na chamada:', error.message);
    }
}

testAsaasDirectly();
