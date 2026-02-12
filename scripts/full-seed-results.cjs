const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHAMP_ID = '3060b6d4-eea9-458e-b3f0-211a45b3de08';
const CATEGORIES = [
    { id: 'dd418d67-50c0-41c5-a093-be8f6b2b3c7b', name: 'INICIANTE MISTO' },
    { id: '66252667-5d5e-4ef5-982d-47e19dd9ac7e', name: 'SCALE MASCULINO' },
    { id: '55d84599-4e10-4297-9746-9ca34819b40a', name: 'INTERMEDIÁRIO FEMININO' },
    { id: '18e1e3b1-5984-4128-a6a1-5433b6874070', name: 'ELITE MASCULINO' }
];

async function seedEverything() {
    console.log('--- INICIANDO SEEDING COMPLETO DO ANT GAMES ---');

    // 1. Criar WODs Globais
    const wodsBase = [
        { championship_id: CHAMP_ID, name: 'WOD 1: AMRAP 10\'', type: 'amrap', description: 'Reps em 10 min', order_num: 1 },
        { championship_id: CHAMP_ID, name: 'WOD 2: FOR TIME', type: 'time', description: 'Tempo total', order_num: 2 },
        { championship_id: CHAMP_ID, name: 'WOD 3: MAX LOAD', type: 'carga', description: 'Peso máx Back Squat', order_num: 3 }
    ];

    const { data: createdWods, error: wodError } = await supabase.from('wods').insert(wodsBase).select();
    if (wodError) return console.error('Erro WODs:', wodError.message);
    console.log(`✅ ${createdWods.length} WODs globais criados.`);

    // 2. Criar Variações por Categoria
    const variations = [];
    CATEGORIES.forEach(cat => {
        createdWods.forEach(wod => {
            variations.push({
                wod_id: wod.id,
                category_id: cat.id,
                display_name: `${wod.name} - ${cat.name}`,
                description: wod.description
            });
        });
    });

    const { error: varError } = await supabase.from('wod_category_variations').insert(variations);
    if (varError) console.warn('Aviso Variações (podem já existir):', varError.message);
    else console.log('✅ Variações de categoria criadas.');

    // 3. Buscar Inscrições para lançar resultados
    const { data: regs, error: regError } = await supabase.from('registrations')
        .select('id, category_id')
        .eq('championship_id', CHAMP_ID)
        .eq('status', 'approved');

    if (regError) return console.error('Erro Registrations:', regError.message);
    console.log(`📊 Processando ${regs.length} inscrições.`);

    // 4. Lançar Resultados (com empates propositais)
    const results = [];

    // Agrupar por categoria para criar os empates
    CATEGORIES.forEach(cat => {
        const catRegs = regs.filter(r => r.category_id === cat.id);
        const catWods = createdWods;

        catRegs.forEach((reg, index) => {
            catWods.forEach(wod => {
                let score = '';
                let tiebreak = '';

                // Simular Scores e EMPATES
                if (wod.type === 'amrap') {
                    // Empates no WOD 1 para os participantes 0 e 1, 2 e 3 de cada categoria
                    if (index === 0 || index === 1) score = '150';
                    else if (index === 2 || index === 3) score = '145';
                    else score = (140 - index).toString();
                }
                else if (wod.type === 'time') {
                    // Empates no WOD 2 com tiebreak diferente
                    if (index === 0 || index === 1) {
                        score = '08:00';
                        tiebreak = index === 0 ? '10' : '12'; // Participante 0 ganha no tiebreak
                    } else {
                        score = `09:${index.toString().padStart(2, '0')}`;
                    }
                }
                else {
                    score = (100 - (index * 2)).toString(); // Cargas variadas
                }

                results.push({
                    wod_id: wod.id,
                    category_id: cat.id,
                    registration_id: reg.id,
                    result: score,
                    tiebreak_value: tiebreak,
                    status: 'completed',
                    is_published: true
                });
            });
        });
    });

    const { data: finalResults, error: resError } = await supabase.from('wod_results').insert(results).select();
    if (resError) return console.error('Erro Resultados:', resError.message);

    console.log(`🚀 ${finalResults.length} resultados lançados com sucesso!`);
    console.log('--- SEEDING CONCLUÍDO ---');
}

seedEverything();
