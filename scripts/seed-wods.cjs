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

async function createWods() {
    console.log('--- CRIANDO WODS DE TESTE ---');

    const wodsToInsert = [];

    CATEGORIES.forEach(cat => {
        // WOD 1: AMRAP (Reps)
        wodsToInsert.push({
            championship_id: CHAMP_ID,
            category_id: cat.id,
            name: 'WOD 1: AMRAP 10\'',
            description: 'As many reps as possible in 10 minutes',
            type: 'reps',
            order_num: 1,
            is_published: true
        });

        // WOD 2: For Time (Time)
        wodsToInsert.push({
            championship_id: CHAMP_ID,
            category_id: cat.id,
            name: 'WOD 2: FOR TIME',
            description: 'Complete the task as fast as possible',
            type: 'time',
            order_num: 2,
            is_published: true
        });

        // WOD 3: Max Load (Carga)
        wodsToInsert.push({
            championship_id: CHAMP_ID,
            category_id: cat.id,
            name: 'WOD 3: MAX LOAD',
            description: 'Find your maximum weight for 1 rep of Back Squat',
            type: 'load',
            order_num: 3,
            is_published: true
        });
    });

    const { data, error } = await supabase
        .from('wods')
        .insert(wodsToInsert)
        .select();

    if (error) {
        console.error('Erro ao criar WODs:', error.message);
        return;
    }

    console.log(`✅ ${data.length} WODs criados com sucesso!`);
}

createWods();
