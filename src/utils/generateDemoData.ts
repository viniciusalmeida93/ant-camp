import { supabase } from '@/integrations/supabase/client';
import { bulkImportData } from '@/utils/bulkImport';
import { calculateWODPoints, generateDefaultPoints } from '@/lib/scoring';
import {
  createEmail,
  generateFullName,
  generateWhatsapp,
  sanitizeName,
  SHIRT_SIZES,
} from '@/utils/demoDataHelpers';

type DatabaseCategory = {
  id: string;
  name: string;
  format: string;
  gender: string;
  team_size: number | null;
};

type DatabaseWod = {
  id: string;
  name: string;
  type: string;
};

type DatabaseScoringConfig = {
  id: string;
  category_id: string;
  preset_type: string;
  points_table: Record<number, number> | null;
  dnf_points: number | null;
  dns_points: number | null;
};

const getTeamSize = (category: DatabaseCategory) => {
  if (category.team_size && category.team_size > 0) return category.team_size;

  switch (category.format) {
    case 'dupla':
      return 2;
    case 'trio':
      return 3;
    case 'time':
      return 4;
    default:
      return 1;
  }
};

export async function generateDemoData(championshipId: string) {
  const [{ data: categoriesData, error: categoriesError }, { data: wodsData, error: wodsError }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, format, gender, team_size')
      .eq('championship_id', championshipId)
      .order('order_index'),
    supabase
      .from('wods')
      .select('id, name, type')
      .eq('championship_id', championshipId)
      .order('order_num'),
  ]);

  if (categoriesError) throw categoriesError;
  if (wodsError) throw wodsError;
  const categories: DatabaseCategory[] = categoriesData || [];
  const wods: DatabaseWod[] = wodsData || [];

  if (categories.length === 0) {
    throw new Error('Nenhuma categoria encontrada para gerar dados de demonstração.');
  }

  if (wods.length === 0) {
    throw new Error('Cadastre pelo menos um WOD antes de gerar os dados de demonstração.');
  }

  const categoryIds = categories.map((category) => category.id);

  let scoringConfigs: DatabaseScoringConfig[] = [];
  if (categoryIds.length > 0) {
    const { data: scoringConfigsData, error: configsError } = await supabase
      .from('scoring_configs')
      .select('*')
      .in('category_id', categoryIds);

    if (configsError) {
      console.warn('Erro ao buscar configs de pontuação para demo:', configsError);
    } else {
      scoringConfigs = scoringConfigsData || [];
    }
  }

  // Limpar resultados e inscrições existentes
  if (categoryIds.length > 0) {
    await supabase.from('wod_results').delete().in('category_id', categoryIds);
  }

  await supabase.from('registrations').delete().eq('championship_id', championshipId);

  // Preparar dados para importação em massa
  const demoTeams: any[] = [];
  const demoIndividuals: any[] = [];

  categories.forEach((category, categoryIndex) => {
    const teamSize = getTeamSize(category);
    const baseName = sanitizeName(category.name) || 'Categoria';
    const categoryCode = (category.id || '').slice(0, 4).toLowerCase();

    for (let i = 1; i <= 10; i++) {
      const globalIndex = categoryIndex * 100 + i;
      const emailPrefixBase = `${baseName}-${categoryCode}`;

      if (teamSize === 1) {
        const fullName = generateFullName(globalIndex);
        const shirtSize = SHIRT_SIZES[(globalIndex - 1) % SHIRT_SIZES.length];
        demoIndividuals.push({
          name: fullName,
          email: createEmail(`${emailPrefixBase}-atleta-`, globalIndex),
          whatsapp: generateWhatsapp(globalIndex),
          shirtSize,
          categoryName: category.name,
          categoryFormat: category.format,
          categoryGender: category.gender,
        });
      } else {
        const members = Array.from({ length: teamSize }).map((_, memberIndex) => ({
          name: generateFullName(globalIndex, memberIndex + 1),
          email: createEmail(`${emailPrefixBase}-membro-`, globalIndex, memberIndex + 1),
          whatsapp: generateWhatsapp(globalIndex, memberIndex + 1),
          shirtSize: SHIRT_SIZES[(globalIndex + memberIndex) % SHIRT_SIZES.length],
        }));

        demoTeams.push({
          name: `${baseName} Equipe ${globalIndex}`,
          members,
          categoryName: category.name,
          categoryFormat: category.format,
          categoryGender: category.gender,
        });
      }
    }
  });

  await bulkImportData(championshipId, demoTeams, demoIndividuals, []);

  // Aprovar todas as inscrições recém-criadas
  await supabase
    .from('registrations')
    .update({
      status: 'approved',
      payment_status: 'approved',
    })
    .eq('championship_id', championshipId);

  const { data: registrationsData, error: registrationsError } = await supabase
    .from('registrations')
    .select('id, category_id, team_name, athlete_name, created_at')
    .eq('championship_id', championshipId)
    .order('created_at', { ascending: true });

  if (registrationsError) throw registrationsError;

  const registrationsByCategory = new Map<string, any[]>();
  const registrationInfo = new Map<string, { categoryId: string; createdAt: string }>();
  (registrationsData || []).forEach((registration) => {
    if (!registrationsByCategory.has(registration.category_id)) {
      registrationsByCategory.set(registration.category_id, []);
    }
    registrationsByCategory.get(registration.category_id)!.push(registration);
    registrationInfo.set(registration.id, {
      categoryId: registration.category_id,
      createdAt: registration.created_at,
    });
  });

  const scoringConfigMap = new Map<string, { pointsTable: Record<number, number>; dnfPoints: number; dnsPoints: number; id: string; categoryId: string; presetType: any }>();

  scoringConfigs.forEach((config) => {
    const pointsTable = config.points_table && typeof config.points_table === 'object'
      ? config.points_table
      : {};

    scoringConfigMap.set(config.category_id, {
      id: config.id,
      categoryId: config.category_id,
      presetType: config.preset_type,
      pointsTable,
      dnfPoints: config.dnf_points || 0,
      dnsPoints: config.dns_points || 0,
    });
  });

  const missingScoringConfigs = categories.filter(category => !scoringConfigMap.has(category.id));

  if (missingScoringConfigs.length > 0) {
    const defaultConfigPayload = missingScoringConfigs.map(category => ({
      category_id: category.id,
      preset_type: 'crossfit-games',
      points_table: generateDefaultPoints(60),
      dnf_points: 1,
      dns_points: 0,
    }));

    const { data: createdConfigs, error: createConfigsError } = await supabase
      .from('scoring_configs')
      .insert(defaultConfigPayload)
      .select();

    if (createConfigsError) throw createConfigsError;

    (createdConfigs || []).forEach((config: any) => {
      const normalizedPoints = config.points_table && typeof config.points_table === 'object'
        ? config.points_table
        : generateDefaultPoints(60);

      scoringConfigMap.set(config.category_id, {
        id: config.id,
        categoryId: config.category_id,
        presetType: config.preset_type,
        pointsTable: normalizedPoints,
        dnfPoints: config.dnf_points || 0,
        dnsPoints: config.dns_points || 0,
      });
    });
  }

  const now = new Date().toISOString();
  const resultsToInsert: any[] = [];
  const categoryPointsMap = new Map<string, Map<string, number>>();

  categories.forEach((category) => {
    const registrations = registrationsByCategory.get(category.id) || [];
    if (registrations.length === 0) {
      return;
    }

    const scoringConfig = scoringConfigMap.get(category.id) || {
      id: `fallback-${category.id}`,
      categoryId: category.id,
      presetType: 'crossfit-games',
      pointsTable: generateDefaultPoints(registrations.length),
      dnfPoints: 1,
      dnsPoints: 0,
    };

    wods.forEach((wod, wodIndex) => {
      const baseSeconds = 240 + wodIndex * 30;
      const baseReps = 250 - wodIndex * 10;
      const baseLoad = 120 + wodIndex * 10;

      const resultsForScoring = registrations.map((registration, index) => {
        let resultValue = '0';
        let tiebreakValue: string | undefined;

        switch (wod.type) {
          case 'for-time':
          case 'tempo': {
            const totalSeconds = baseSeconds + index * 12;
            const minutes = Math.floor(totalSeconds / 60)
              .toString()
              .padStart(2, '0');
            const seconds = (totalSeconds % 60)
              .toString()
              .padStart(2, '0');
            resultValue = `${minutes}:${seconds}`;
            tiebreakValue = String(200 - index * 3);
            break;
          }
          case 'amrap':
          case 'emom': {
            resultValue = String(Math.max(10, baseReps - index * 7));
            tiebreakValue = String(60 - index);
            break;
          }
          case 'tonelagem':
          case 'carga-maxima':
          case 'carga': {
            resultValue = String(Math.max(40, baseLoad + (registrations.length - index) * 5));
            tiebreakValue = String(300 - index * 5);
            break;
          }
          default: {
            resultValue = String(100 - index);
          }
        }

        return {
          id: `${wod.id}-${registration.id}`,
          wodId: wod.id,
          categoryId: category.id,
          registrationId: registration.id,
          result: resultValue,
          tiebreakValue,
          status: 'completed' as const,
          createdAt: now,
          updatedAt: now,
        };
      });

      const scoredResults = calculateWODPoints(resultsForScoring as any, scoringConfig as any, wod.type);

      scoredResults.forEach((scoredResult: any) => {
        resultsToInsert.push({
          wod_id: scoredResult.wodId,
          category_id: scoredResult.categoryId,
          registration_id: scoredResult.registrationId,
          result: scoredResult.result,
          tiebreak_value: scoredResult.tiebreakValue || null,
          status: scoredResult.status,
          points: scoredResult.points,
          position: scoredResult.position,
        });

        if (!categoryPointsMap.has(category.id)) {
          categoryPointsMap.set(category.id, new Map());
        }

        const pointsLookup = categoryPointsMap.get(category.id)!;
        const currentPoints = pointsLookup.get(scoredResult.registrationId) || 0;
        pointsLookup.set(scoredResult.registrationId, currentPoints + (scoredResult.points || 0));
      });
    });
  });

  if (resultsToInsert.length > 0) {
    await supabase.from('wod_results').insert(resultsToInsert);
  }

  // Gerar baterias com base nos pontos acumulados
  const { data: existingHeats } = await supabase
    .from('heats')
    .select('id')
    .eq('championship_id', championshipId);

  if (existingHeats && existingHeats.length > 0) {
    const heatIds = existingHeats.map((heat: any) => heat.id);
    await supabase.from('heat_entries').delete().in('heat_id', heatIds);
    await supabase.from('heats').delete().in('id', heatIds);
  }

  const HEAT_SIZE = 8;

  for (const category of categories) {
    const registrations = registrationsByCategory.get(category.id) || [];
    if (registrations.length === 0) continue;

    const pointsLookup = categoryPointsMap.get(category.id) || new Map<string, number>();

    const orderedParticipants = registrations
      .map((registration: any) => ({
        registrationId: registration.id,
        createdAt: registration.created_at,
        totalPoints: pointsLookup.get(registration.id) || 0,
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    for (const wod of wods) {
      const totalHeats = Math.ceil(orderedParticipants.length / HEAT_SIZE);

      for (let heatIndex = 0; heatIndex < totalHeats; heatIndex++) {
        const startIndex = heatIndex * HEAT_SIZE;
        const endIndex = Math.min(startIndex + HEAT_SIZE, orderedParticipants.length);
        const participantsChunk = orderedParticipants.slice(startIndex, endIndex);

        const { data: newHeat, error: heatError } = await supabase
          .from('heats')
          .insert({
            championship_id: championshipId,
            category_id: category.id,
            wod_id: wod.id,
            heat_number: heatIndex + 1,
            athletes_per_heat: HEAT_SIZE,
          })
          .select()
          .single();

        if (heatError || !newHeat) {
          throw heatError;
        }

        const heatEntries = participantsChunk.map((participant, laneIndex) => ({
          heat_id: newHeat.id,
          registration_id: participant.registrationId,
          lane_number: laneIndex + 1,
        }));

        if (heatEntries.length > 0) {
          const { error: entriesError } = await supabase
            .from('heat_entries')
            .insert(heatEntries);

          if (entriesError) {
            throw entriesError;
          }
        }
      }
    }
  }

  return {
    categories: categories.length,
    teamsCreated: demoTeams.length,
    individualsCreated: demoIndividuals.length,
    wods: wods.length,
  };
}


