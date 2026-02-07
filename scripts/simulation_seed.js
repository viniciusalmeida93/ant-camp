
import { createClient } from '@supabase/supabase-js';

// Hardcoded from .env read
const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Configurations ---
const ORGANIZER_EMAIL = 'organizer@test.com';
const ORGANIZER_PASS = 'password123';

const CHAMPS = [
    {
        name: 'Battle of AntCamp 2026 (Games Style - Ranking)',
        slug: 'battle-games-2026',
        date: '2026-05-15', // Weekend
        end_date: '2026-05-17',
        location: 'Arena AntCamp',
        city: 'São Paulo',
        state: 'SP',
        style: 'games'
    },
    {
        name: 'Torneio Tradição 2026 (Simple Style - 1 to 1)',
        slug: 'battle-trad-2026',
        date: '2026-06-20',
        end_date: '2026-06-20',
        location: 'Box Tradição',
        city: 'Rio de Janeiro',
        state: 'RJ',
        style: 'traditional'
    }
];

const CROSSFIT_GAMES_POINTS = {
    1: 100, 2: 97, 3: 94, 4: 91, 5: 88, 6: 85, 7: 82, 8: 79, 9: 76, 10: 73,
    11: 70, 12: 68, 13: 66, 14: 64, 15: 62, 16: 60, 17: 58, 18: 56, 19: 54, 20: 52,
    21: 50, 22: 48, 23: 46, 24: 44, 25: 42, 26: 40, 27: 38, 28: 36, 29: 34, 30: 32
};

const SIMPLE_POINTS = {};
for (let i = 1; i <= 100; i++) SIMPLE_POINTS[i] = i;

async function main() {
    console.log("🚀 Starting Championship Simulation Seed...");

    // 1. Auth as Organizer
    console.log(`🔐 Logging in as ${ORGANIZER_EMAIL}...`);
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: ORGANIZER_EMAIL,
        password: ORGANIZER_PASS
    });

    if (authErr || !auth.user) {
        console.error("❌ Login failed:", authErr);
        process.exit(1);
    }

    const organizerId = auth.user.id;
    console.log(`✅ Logged in! Organizer ID: ${organizerId}`);

    // 2. Create Championships
    for (const champConfig of CHAMPS) {
        console.log(`\n🏆 Processando Campeonato: ${champConfig.name}...`);

        // Check if exists
        const { data: existing } = await supabase.from('championships').select('id').eq('slug', champConfig.slug).maybeSingle();
        let champId = existing?.id;

        if (!champId) {
            const { data: champ, error } = await supabase.from('championships').insert({
                name: champConfig.name,
                slug: champConfig.slug,
                date: champConfig.date,
                end_date: champConfig.end_date,
                location: champConfig.location,
                city: champConfig.city,
                state: champConfig.state,
                organizer_id: organizerId,
                is_published: true,
                wod_interval_minutes: 15,
                enable_break: true,
                break_duration_minutes: 30,
                break_after_wod_number: 2
            }).select().single();

            if (error) { console.error('Error creating champ', error); continue; }
            champId = champ.id;

            // Create Day 1
            await supabase.from('championship_days').insert({
                championship_id: champId,
                day_number: 1,
                date: champConfig.date,
                start_time: '08:00',
                wod_interval_minutes: 15
            });
        }
        console.log(`   -> Champ ID: ${champId}`);

        // Create Link Page
        await supabase.from('link_pages').upsert({
            championship_id: champId,
            slug: champConfig.slug,
            title: champConfig.name
        }, { onConflict: 'slug' });

        // 3. Create Categories & Scoring
        const categories = champConfig.style === 'games'
            ? [
                { name: 'RX Indiv', format: 'individual', capacity: 20 },
                { name: 'Trio Scale', format: 'trio', capacity: 15 }
            ]
            : [
                { name: 'Dupla Amador', format: 'dupla', capacity: 20 }
            ];

        for (const catConf of categories) {
            console.log(`   📂 Verificando Categoria: ${catConf.name}`);

            let catId;
            const { data: existCat } = await supabase.from('categories')
                .select('id').eq('championship_id', champId).eq('name', catConf.name).maybeSingle();

            if (existCat) {
                catId = existCat.id;
            } else {
                const { data: cat } = await supabase.from('categories').insert({
                    championship_id: champId,
                    name: catConf.name,
                    format: catConf.format,
                    gender: 'misto',
                    capacity: catConf.capacity,
                    price_cents: 10000,
                    athletes_per_heat: 5
                }).select().single();
                catId = cat.id;
            }

            // 4. Set Scoring
            console.log(`      ⚙️ Configurando Pontuação para ${catConf.name}`);
            const scoringData = champConfig.style === 'games'
                ? {
                    preset_type: 'crossfit-games',
                    ranking_method: 'standard', // 1, 1, 3
                    points_table: CROSSFIT_GAMES_POINTS,
                    dnf_points: 0,
                    dns_points: 0
                }
                : {
                    preset_type: 'simple-order', // 1 = 1 point
                    ranking_method: 'simple',   // 1, 1, 2
                    points_table: SIMPLE_POINTS,
                    dnf_points: 99,
                    dns_points: 100
                };

            const { data: existScore } = await supabase.from('scoring_configs').select('id').eq('category_id', catId).maybeSingle();
            if (existScore) {
                await supabase.from('scoring_configs').update(scoringData).eq('id', existScore.id);
            } else {
                await supabase.from('scoring_configs').insert({ category_id: catId, ...scoringData });
            }

            // 5. Create Athletes/Registrations
            console.log(`      👥 Gerando Inscrições...`);
            const limit = 8;
            for (let i = 1; i <= limit; i++) {
                const isTeam = catConf.format !== 'individual';
                const name = isTeam ? `Time ${champConfig.style} ${i}` : `Atleta ${champConfig.style} ${i}`;
                const email = `test_${champConfig.style}_${catId.substring(0, 4)}_${i}@test.com`;

                const { data: regExist } = await supabase.from('registrations')
                    .select('id').eq('category_id', catId).eq('athlete_email', email).maybeSingle();

                let regId = regExist?.id;

                if (!regId) {
                    try {
                        const members = isTeam ? [
                            { name: `Membro 1 do ${name}`, email: `m1_${email}`, cpf: `000${i}11122233` },
                            { name: `Membro 2 do ${name}`, email: `m2_${email}`, cpf: `000${i}11122234` }
                        ] : null;

                        const { data: newReg, error: regErr } = await supabase.from('registrations').insert({
                            championship_id: champId,
                            category_id: catId,
                            status: 'approved',
                            athlete_name: name,
                            athlete_email: email,
                            team_name: isTeam ? name : null,
                            athlete_phone: '11999999999',
                            athlete_cpf: `000000000${i}`,
                            subtotal_cents: 10000,
                            total_cents: 10000,
                            payment_status: 'approved',
                            platform_fee_cents: 500,
                            team_members: members
                        }).select().single();

                        if (regErr) {
                            console.error("     Erro ao criar inscrição", regErr);
                        } else {
                            regId = newReg.id;
                        }
                    } catch (err) {
                        console.error("     Exception creating registration", err);
                    }
                }
            }

            // 6. Create WODs in DB
            console.log(`      🏋️ Criando WODs...`);
            const wods = [
                { name: 'WOD 1 - Fran', type: 'tempo', description: '21-15-9 Thrusters', order_num: 1 },
                { name: 'WOD 2 - Max Snatch', type: 'carga', description: '1RM Snatch', order_num: 2 }
            ];

            const { data: day } = await supabase.from('championship_days')
                .select('*').eq('championship_id', champId).eq('day_number', 1).maybeSingle();

            if (!day) console.log("     ⚠️ Dia 1 não encontrado, criando...");

            for (const [idx, wodDef] of wods.entries()) {
                let wodId;
                const uniqueName = `${wodDef.name} (${catConf.name})`;

                const { data: wodExist } = await supabase.from('wods').select('id').eq('name', uniqueName).maybeSingle();

                if (wodExist) {
                    wodId = wodExist.id;
                } else {
                    const { data: wod, error: wodErr } = await supabase.from('wods').insert({
                        championship_id: champId,
                        name: uniqueName,
                        type: wodDef.type,
                        description: wodDef.description,
                        order_num: wodDef.order_num
                    }).select().single();

                    if (wodErr) {
                        console.error(`     ❌ Erro criando WOD ${uniqueName}:`, wodErr.message);
                        continue;
                    }
                    wodId = wod.id;

                    if (day && wodId) {
                        // Check if connection exists
                        const { data: existingLink } = await supabase.from('championship_day_wods')
                            .select('wod_id').eq('wod_id', wodId).maybeSingle();

                        if (!existingLink) {
                            await supabase.from('championship_day_wods').insert({
                                championship_day_id: day.id,
                                wod_id: wodId,
                                order_num: idx + 1
                            });
                        }
                    }
                }

                // 7. Seed Results (with TIES)
                const { data: regs } = await supabase.from('registrations')
                    .select('id, athlete_name').eq('category_id', catId);

                if (regs && wodId) {
                    console.log(`         📝 Lançando Resultados para ${wodDef.name}`);
                    for (const [rIdx, r] of regs.entries()) {
                        const { data: resExist } = await supabase.from('wod_results')
                            .select('id').eq('wod_id', wodId).eq('registration_id', r.id).maybeSingle();

                        if (!resExist) {
                            let resValue;
                            if (wodDef.type === 'tempo') {
                                // Tie: 05:00 for idx 0 and 1
                                resValue = (rIdx < 2) ? '05:00' : `05:${10 + rIdx}`;
                            } else {
                                // Tie: 100kg for idx 0 and 1
                                resValue = (rIdx < 2) ? '100' : `${100 - rIdx * 5}`;
                            }

                            await supabase.from('wod_results').insert({
                                wod_id: wodId,
                                category_id: catId,
                                registration_id: r.id,
                                status: 'completed',
                                result: resValue,
                                created_at: new Date().toISOString()
                            });
                        }
                    }

                    // --- ADDED HEAT GENERATION LOGIC ---
                    console.log(`         🔥 Gerando Baterias para ${wodDef.name}`);

                    // Check if heats exist for this WOD/Cat
                    const { data: existingHeats } = await supabase.from('heats')
                        .select('id').eq('championship_id', champId).eq('category_id', catId).eq('wod_id', wodId);

                    if (!existingHeats || existingHeats.length === 0) {
                        const athletesPerHeat = 5;
                        const regChunks = [];
                        for (let i = 0; i < regs.length; i += athletesPerHeat) {
                            regChunks.push(regs.slice(i, i + athletesPerHeat));
                        }

                        let heatNum = 1;
                        // FIX TIMESTAMP FORMAT: YYYY-MM-DDTHH:mm:ss (no extra :00)
                        let rawTime = `${day.date}T${day.start_time}`;
                        if (day.start_time.length === 5) rawTime += ':00';
                        const startTime = rawTime;

                        for (const chunk of regChunks) {
                            const { data: newHeat, error: heatErr } = await supabase.from('heats').insert({
                                championship_id: champId,
                                category_id: catId,
                                wod_id: wodId,
                                heat_number: heatNum++,
                                athletes_per_heat: athletesPerHeat,
                                scheduled_time: startTime
                            }).select().single();

                            if (heatErr) {
                                console.error("Erro criando heat:", heatErr);
                                continue;
                            }

                            const entries = chunk.map((r, i) => ({
                                heat_id: newHeat.id,
                                registration_id: r.id,
                                lane_number: i + 1
                            }));

                            await supabase.from('heat_entries').insert(entries);
                        }
                        console.log(`            -> Geradas ${regChunks.length} baterias.`);
                    } else {
                        console.log("            -> Baterias já existem.");
                    }
                }
            }
        }

        // --- TIE BREAKER LAB (Specific for Battle of AntCamp) ---
        if (champConfig.style === 'games') {
            console.log(`   🧪 Criando Categoria de Laboratório de Empates...`);
            const tieCatName = 'Tie Breaker Lab';
            let tieCatId;
            const { data: existingTieCat, error: findErr } = await supabase.from('categories')
                .select('id')
                .eq('championship_id', champId)
                .eq('name', tieCatName)
                .maybeSingle();

            if (existingTieCat) {
                tieCatId = existingTieCat.id;
            } else {
                const { data: newTieCat, error: createErr } = await supabase.from('categories').insert({
                    championship_id: champId,
                    name: tieCatName,
                    format: 'individual',
                    gender: 'misto',
                    capacity: 10,
                    price_cents: 10000,
                    athletes_per_heat: 5
                }).select().single();

                if (createErr) {
                    console.error("   ❌ Erro detalhado criar categoria:", createErr);
                    continue;
                }
                tieCatId = newTieCat.id;
            }

            const tieCat = { id: tieCatId }; // Mock object for compatibility

            if (!tieCatId) {
                console.error("   ❌ Falha fatal: ID da categoria é null");
                continue;
            }

            // Config Scoring
            const { data: existingScore } = await supabase.from('scoring_configs').select('id').eq('category_id', tieCat.id).maybeSingle();
            if (!existingScore) {
                await supabase.from('scoring_configs').insert({
                    category_id: tieCat.id,
                    preset_type: 'crossfit-games',
                    ranking_method: 'standard', // 1, 1, 3
                    points_table: CROSSFIT_GAMES_POINTS,
                    dnf_points: 0,
                    dns_points: 0
                });
            }

            // Create Athletes
            const athletes = [
                { name: 'Atleta A (Ouro+5º)', email: 'tie_a@test.com' },
                { name: 'Atleta B (3º+3º)', email: 'tie_b@test.com' },
                { name: 'Atleta C (Prata+4º)', email: 'tie_c@test.com' }
            ];

            const regMap = {};
            for (const ath of athletes) {
                let regId;
                const { data: existingReg } = await supabase.from('registrations')
                    .select('id')
                    .eq('category_id', tieCat.id)
                    .eq('athlete_email', ath.email)
                    .maybeSingle();

                if (existingReg) {
                    regId = existingReg.id;
                } else {
                    const { data: newReg, error: regErr } = await supabase.from('registrations').insert({
                        championship_id: champId,
                        category_id: tieCat.id,
                        status: 'approved',
                        athlete_name: ath.name,
                        athlete_email: ath.email,
                        payment_status: 'approved',
                        subtotal_cents: 0, total_cents: 0, platform_fee_cents: 0
                    }).select().single();

                    if (regErr) console.error("Erro criando registro tie lab:", regErr);
                    regId = newReg?.id;
                }
                if (regId) regMap[ath.name] = { id: regId };
            }

            // Create 2 WODs
            const wods = ['WOD Tie 1', 'WOD Tie 2'];
            // Safe fetch day
            const { data: days } = await supabase.from('championship_days').select('*').eq('championship_id', champId);
            const day = days && days.length > 0 ? days[0] : null; // Get first day

            if (!day) {
                console.error("   ❌ Erro: Dia não encontrado para Tie Breaker Lab.");
                continue;
            }

            const wodIds = [];
            for (const [idx, wName] of wods.entries()) {
                const uniqueName = `${wName} (Lab)`;
                let wodId;

                const { data: existWod } = await supabase.from('wods').select('id').eq('championship_id', champId).eq('name', uniqueName).maybeSingle();
                if (existWod) {
                    wodId = existWod.id;
                } else {
                    const { data: wod, error: wodErr } = await supabase.from('wods').insert({
                        championship_id: champId, name: uniqueName, type: 'tempo', description: 'Tie Break Test', order_num: idx + 1
                    }).select().single();

                    if (wodErr) { console.error("Erro criando WOD Tie Lab", wodErr); continue; }
                    wodId = wod.id;
                }
                wodIds.push(wodId);

                // Link WOD to Day
                const { data: checkLink } = await supabase.from('championship_day_wods').select('*').eq('championship_day_id', day.id).eq('wod_id', wodId).maybeSingle();

                if (!checkLink) {
                    await supabase.from('championship_day_wods').insert({
                        championship_day_id: day.id, wod_id: wodId, order_num: idx + 1
                    });
                }
            }

            if (wodIds.length === 2 && regMap['Atleta A (Ouro+5º)'] && regMap['Atleta B (3º+3º)'] && regMap['Atleta C (Prata+4º)']) {
                // Insert Results

                // Helper to insert result safely
                const insertRes = async (wodId, regId, res) => {
                    const { data: ex } = await supabase.from('wod_results').select('id').eq('wod_id', wodId).eq('registration_id', regId).maybeSingle();
                    if (!ex) {
                        await supabase.from('wod_results').insert({
                            wod_id: wodId,
                            category_id: tieCat.id,
                            registration_id: regId,
                            result: res,
                            status: 'completed',
                            created_at: new Date().toISOString()
                        });
                    }
                };

                // WOD 1 Results: A(05:00), B(05:10), C(05:20)
                await insertRes(wodIds[0], regMap['Atleta A (Ouro+5º)'].id, '05:00'); // 1st
                await insertRes(wodIds[0], regMap['Atleta C (Prata+4º)'].id, '05:10'); // 2nd
                await insertRes(wodIds[0], regMap['Atleta B (3º+3º)'].id, '05:20'); // 3rd

                // WOD 2 Results
                await insertRes(wodIds[1], regMap['Atleta C (Prata+4º)'].id, '110'); // 1st
                await insertRes(wodIds[1], regMap['Atleta B (3º+3º)'].id, '100'); // 2nd
                await insertRes(wodIds[1], regMap['Atleta A (Ouro+5º)'].id, '90'); // 3rd

                console.log("   🧪 Resultados de Laboratório lançados.");
            } else {
                console.error("   ❌ Falha ao preparar dados para resultados (Regs ou WODs faltando)");
            }
        }
    }

    console.log("\n✅ Simulação Concluída com Sucesso!");
}

main().catch(e => console.error(e));
