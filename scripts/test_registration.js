import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRegistrationFlow() {
    console.log('🧪 Teste de Fluxo de Registro\n');

    // 1. Buscar campeonato e categorias
    console.log('1️⃣ Buscando campeonato e categorias...');
    const { data: championship } = await supabase
        .from('championships')
        .select('id, name, slug')
        .eq('slug', 'test-championship-2025')
        .single();

    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('championship_id', championship.id);

    console.log(`✅ Campeonato: ${championship.name}`);
    console.log(`✅ Categorias encontradas: ${categories.length}\n`);

    categories.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.format}) - R$ ${cat.price_cents / 100}`);
    });

    // 2. Teste de Inscrição Individual
    console.log('\n2️⃣ Testando Inscrição Individual...');
    const individualCategory = categories.find(c => c.format === 'individual');

    if (individualCategory) {
        const { data: individualReg, error: indError } = await supabase
            .from('registrations')
            .insert({
                championship_id: championship.id,
                category_id: individualCategory.id,
                athlete_name: 'Atleta Individual Teste',
                athlete_email: 'individual@test.com',
                athlete_phone: '(11) 98888-8888',
                athlete_cpf: '111.111.111-11',
                athlete_birth_date: '1995-05-15',
                subtotal_cents: individualCategory.price_cents,
                platform_fee_cents: 900,
                total_cents: individualCategory.price_cents + 900,
                payment_status: 'pending',
                payment_method: 'pix'
            })
            .select()
            .single();

        if (indError) {
            console.log(`   ⚠️  Erro: ${indError.message}`);
            if (indError.message.includes('unique_registration_per_category')) {
                console.log('   ℹ️  CPF já registrado nesta categoria (regra de negócio OK!)');
            }
        } else {
            console.log(`   ✅ Inscrição individual criada: #${individualReg.id.substring(0, 8)}`);
            // Limpar
            await supabase.from('registrations').delete().eq('id', individualReg.id);
        }
    } else {
        console.log('   ⚠️  Nenhuma categoria individual encontrada');
    }

    // 3. Teste de Inscrição em Dupla
    console.log('\n3️⃣ Testando Inscrição em Dupla...');
    const duoCategory = categories.find(c => c.format === 'duo');

    if (duoCategory) {
        const { data: duoReg, error: duoError } = await supabase
            .from('registrations')
            .insert({
                championship_id: championship.id,
                category_id: duoCategory.id,
                team_name: 'Dupla Teste',
                athlete_name: 'Atleta 1 Dupla',
                athlete_email: 'dupla1@test.com',
                athlete_phone: '(11) 97777-7777',
                athlete_cpf: '222.222.222-22',
                athlete_birth_date: '1992-03-10',
                team_members: [
                    {
                        name: 'Atleta 2 Dupla',
                        email: 'dupla2@test.com',
                        whatsapp: '(11) 96666-6666',
                        cpf: '333.333.333-33',
                        birth_date: '1993-07-20'
                    }
                ],
                subtotal_cents: duoCategory.price_cents,
                platform_fee_cents: 900,
                total_cents: duoCategory.price_cents + 900,
                payment_status: 'pending',
                payment_method: 'pix'
            })
            .select()
            .single();

        if (duoError) {
            console.log(`   ⚠️  Erro: ${duoError.message}`);
        } else {
            console.log(`   ✅ Inscrição em dupla criada: #${duoReg.id.substring(0, 8)}`);
            console.log(`   ✅ Time: ${duoReg.team_name}`);
            console.log(`   ✅ Membros: ${duoReg.team_members.length + 1}`);
            // Limpar
            await supabase.from('registrations').delete().eq('id', duoReg.id);
        }
    } else {
        console.log('   ⚠️  Nenhuma categoria de dupla encontrada');
    }

    // 4. Teste de Validação de CPF Único
    console.log('\n4️⃣ Testando Validação de CPF Único...');
    const testCategory = categories[0];

    // Primeira inscrição
    const { data: firstReg } = await supabase
        .from('registrations')
        .insert({
            championship_id: championship.id,
            category_id: testCategory.id,
            athlete_name: 'Teste CPF Único',
            athlete_email: 'cpftest@test.com',
            athlete_phone: '(11) 95555-5555',
            athlete_cpf: '444.444.444-44',
            athlete_birth_date: '1990-01-01',
            subtotal_cents: testCategory.price_cents,
            platform_fee_cents: 900,
            total_cents: testCategory.price_cents + 900,
            payment_status: 'pending',
            payment_method: 'pix'
        })
        .select()
        .single();

    if (firstReg) {
        console.log('   ✅ Primeira inscrição criada');

        // Tentar criar segunda com mesmo CPF
        const { error: duplicateError } = await supabase
            .from('registrations')
            .insert({
                championship_id: championship.id,
                category_id: testCategory.id,
                athlete_name: 'Teste CPF Duplicado',
                athlete_email: 'cpftest2@test.com',
                athlete_phone: '(11) 94444-4444',
                athlete_cpf: '444.444.444-44', // Mesmo CPF
                athlete_birth_date: '1990-01-01',
                subtotal_cents: testCategory.price_cents,
                platform_fee_cents: 900,
                total_cents: testCategory.price_cents + 900,
                payment_status: 'pending',
                payment_method: 'pix'
            });

        if (duplicateError && duplicateError.message.includes('unique_registration_per_category')) {
            console.log('   ✅ Validação de CPF único funcionando! (bloqueou duplicata)');
        } else {
            console.log('   ⚠️  Validação de CPF único NÃO está funcionando');
        }

        // Limpar
        await supabase.from('registrations').delete().eq('id', firstReg.id);
    }

    console.log('\n🎉 Teste de Registro Concluído!\n');
}

testRegistrationFlow();
