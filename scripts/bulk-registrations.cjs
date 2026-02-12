const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHAMP_ID = '3060b6d4-eea9-458e-b3f0-211a45b3de08';

const CATEGORIES = [
    { id: 'dd418d67-50c0-41c5-a093-be8f6b2b3c7b', name: 'INICIANTE MISTO', size: 2, price: 40000, minAge: 15 },
    { id: '66252667-5d5e-4ef5-982d-47e19dd9ac7e', name: 'SCALE MASCULINO', size: 1, price: 25000, minAge: 18 },
    { id: '55d84599-4e10-4297-9746-9ca34819b40a', name: 'INTERMEDIÁRIO FEMININO', size: 2, price: 20000, minAge: 0 },
    { id: '18e1e3b1-5984-4128-a6a1-5433b6874070', name: 'ELITE MASCULINO', size: 1, price: 10000, minAge: 18 }
];

const SHIRT_SIZES = ['P', 'M', 'G', 'GG'];

async function registerBulk() {
    console.log('--- INICIANDO INSCRIÇÕES EM MASSA (40 NO TOTAL) ---');

    for (const cat of CATEGORIES) {
        console.log(`\nInscritos na categoria: ${cat.name}`);
        for (let i = 1; i <= 10; i++) {
            const teamName = cat.size > 1 ? `Time Teste ${cat.name} ${i}` : `Atleta Teste ${cat.name} ${i}`;
            const members = [];

            for (let j = 1; j <= cat.size; j++) {
                members.push({
                    name: `${teamName} - Membro ${j}`,
                    email: `teste_${cat.id.substring(0, 4)}_${i}_${j}@antcamp.com`,
                    whatsapp: '11999999999',
                    shirtSize: SHIRT_SIZES[Math.floor(Math.random() * SHIRT_SIZES.length)],
                    cpf: Math.random().toString().substring(2, 13),
                    birthDate: '1995-01-01',
                    box: 'Box Teste'
                });
            }

            const subtotal = cat.price;
            const fee = 900 * cat.size; // R$ 9,00 por atleta
            const total = subtotal + fee;

            const regData = {
                championship_id: CHAMP_ID,
                category_id: cat.id,
                athlete_name: teamName,
                athlete_email: members[0].email,
                athlete_phone: members[0].whatsapp,
                team_name: cat.size > 1 ? teamName : null,
                box_name: 'Box Teste',
                subtotal_cents: subtotal,
                platform_fee_cents: fee,
                total_cents: total,
                status: 'approved',
                payment_status: 'approved',
                team_members: members,
                payment_method: 'PIX',
                paid_at: new Date().toISOString()
            };

            const { error } = await supabase.from('registrations').insert(regData);

            if (error) {
                console.error(`  ❌ Erro na inscrição ${i} (${cat.name}):`, error.message);
            } else {
                process.stdout.write('.'); // Progresso visual
            }
        }
        console.log(`\n✅ 10 inscrições concluídas para ${cat.name}`);
    }
}

registerBulk();
