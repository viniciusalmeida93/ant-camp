import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testEmailIntegration() {
  console.log('🧪 Testando Integração de Email\n');

  // 1. Login como atleta
  console.log('1️⃣ Fazendo login como athlete@test.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'athlete@test.com',
    password: 'password123'
  });

  if (authError) {
    console.error('❌ Erro no login:', authError.message);
    return;
  }
  console.log('✅ Login bem-sucedido!\n');

  // 2. Buscar campeonato de teste
  console.log('2️⃣ Buscando campeonato de teste...');
  const { data: championship, error: champError } = await supabase
    .from('championships')
    .select('id, name')
    .eq('slug', 'test-championship-2025')
    .single();

  if (champError || !championship) {
    console.error('❌ Campeonato não encontrado:', champError?.message);
    return;
  }
  console.log(`✅ Campeonato encontrado: ${championship.name}\n`);

  // 3. Buscar primeira categoria
  console.log('3️⃣ Buscando categoria...');
  const { data: category, error: catError } = await supabase
    .from('categories')
    .select('id, name, price_cents')
    .eq('championship_id', championship.id)
    .limit(1)
    .single();

  if (catError || !category) {
    console.error('❌ Categoria não encontrada:', catError?.message);
    return;
  }
  console.log(`✅ Categoria encontrada: ${category.name} - R$ ${category.price_cents / 100}\n`);

  // 4. Criar inscrição de teste
  console.log('4️⃣ Criando inscrição de teste...');
  const testRegistration = {
    championship_id: championship.id,
    category_id: category.id,
    user_id: authData.user.id,
    athlete_name: 'Test Athlete',
    athlete_email: 'athlete@test.com',
    athlete_phone: '(11) 99999-9999',
    athlete_cpf: '123.456.789-00',
    athlete_birth_date: '1990-01-01',
    subtotal_cents: category.price_cents,
    platform_fee_cents: 900, // R$ 9,00
    total_cents: category.price_cents + 900,
    payment_status: 'pending',
    payment_method: 'pix'
  };

  const { data: registration, error: regError } = await supabase
    .from('registrations')
    .insert(testRegistration)
    .select()
    .single();

  if (regError) {
    console.error('❌ Erro ao criar inscrição:', regError.message);
    return;
  }
  console.log(`✅ Inscrição criada: #${registration.id.substring(0, 8)}\n`);

  // 5. Chamar Edge Function de email
  console.log('5️⃣ Enviando email de confirmação...');
  const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-registration-email', {
    body: { registrationId: registration.id }
  });

  if (emailError) {
    console.error('❌ Erro ao enviar email:', emailError.message);
    console.log('\nDetalhes:', emailError);
    return;
  }

  console.log('✅ Email enviado com sucesso!');
  console.log('   Email ID:', emailResult.emailId);
  console.log('   Destinatários:', emailResult.recipients);
  console.log('\n📧 Verifique sua caixa de entrada em athlete@test.com\n');

  // 6. Limpar (deletar inscrição de teste)
  console.log('6️⃣ Limpando dados de teste...');
  await supabase
    .from('registrations')
    .delete()
    .eq('id', registration.id);
  console.log('✅ Inscrição de teste removida\n');

  await supabase.auth.signOut();
  console.log('🎉 Teste concluído com sucesso!');
}

testEmailIntegration();
