import { supabase } from '@/integrations/supabase/client';
import { calculateWODPoints, generateDefaultPoints } from '@/lib/scoring';

type Category = {
  id: string;
  name: string;
  format: string;
};

type Wod = {
  id: string;
  type: string | null;
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const pad = (value: number) => value.toString().padStart(2, '0');

const generateResultByType = (wodType: string | null | undefined) => {
  switch (wodType) {
    case 'for-time':
    case 'tempo': {
      const totalSeconds = randomInt(300, 900); // 5 a 15 minutos
      const minutes = pad(Math.floor(totalSeconds / 60));
      const seconds = pad(totalSeconds % 60);
      return {
        result: `${minutes}:${seconds}`,
        tiebreak: String(randomInt(150, 250)),
      };
    }
    case 'amrap':
    case 'emom': {
      return {
        result: String(randomInt(120, 260)),
        tiebreak: String(randomInt(40, 90)),
      };
    }
    case 'tonelagem': {
      return {
        result: String(randomInt(3500, 7500)),
        tiebreak: String(randomInt(100, 200)),
      };
    }
    case 'carga-maxima':
    case 'carga': {
      return {
        result: String(randomInt(80, 170)),
        tiebreak: String(randomInt(50, 120)),
      };
    }
    default: {
      return {
        result: String(randomInt(10, 200)),
        tiebreak: String(randomInt(20, 80)),
      };
    }
  }
};

export async function ensureRandomResults(championshipId: string) {
  const [{ data: categories, error: categoriesError }, { data: wods, error: wodsError }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, format')
      .eq('championship_id', championshipId)
      .order('order_index', { ascending: true }),
    supabase
      .from('wods')
      .select('id, type')
      .eq('championship_id', championshipId)
      .order('order_num', { ascending: true }),
  ]);

  if (categoriesError) throw categoriesError;
  if (wodsError) throw wodsError;

  const typedCategories = (categories || []) as Category[];
  const typedWods = (wods || []) as Wod[];

  if (typedCategories.length === 0 || typedWods.length === 0) {
    return { generated: 0 };
  }

  const categoryIds = typedCategories.map((category) => category.id);

  const { data: registrationsData, error: registrationsError } = await supabase
    .from('registrations')
    .select('id, category_id')
    .eq('championship_id', championshipId)
    .in('category_id', categoryIds);

  if (registrationsError) throw registrationsError;

  const registrationsByCategory = new Map<string, { id: string }[]>();
  (registrationsData || []).forEach((registration) => {
    if (!registrationsByCategory.has(registration.category_id)) {
      registrationsByCategory.set(registration.category_id, []);
    }
    registrationsByCategory.get(registration.category_id)!.push({ id: registration.id });
  });

  if (registrationsByCategory.size === 0) {
    return { generated: 0 };
  }

  let scoringConfigs = [];
  if (categoryIds.length > 0) {
    const { data: configsData, error: configsError } = await supabase
      .from('scoring_configs')
      .select('*')
      .in('category_id', categoryIds);

    if (configsError) throw configsError;
    scoringConfigs = configsData || [];
  }

  const scoringConfigMap = new Map<string, any>();
  scoringConfigs.forEach((config: any) => {
    const pointsTable =
      config.points_table && typeof config.points_table === 'object'
        ? config.points_table
        : generateDefaultPoints(60);

    scoringConfigMap.set(config.category_id, {
      id: config.id,
      categoryId: config.category_id,
      presetType: config.preset_type,
      pointsTable,
      dnfPoints: config.dnf_points || 0,
      dnsPoints: config.dns_points || 0,
    });
  });

  const missingConfigs = typedCategories.filter((category) => !scoringConfigMap.has(category.id));

  if (missingConfigs.length > 0) {
    const payload = missingConfigs.map((category) => ({
      category_id: category.id,
      preset_type: 'crossfit-games',
      points_table: generateDefaultPoints(60),
      dnf_points: 1,
      dns_points: 0,
    }));

    const { data: createdConfigs, error: createError } = await supabase
      .from('scoring_configs')
      .insert(payload)
      .select();

    if (createError) throw createError;

    (createdConfigs || []).forEach((config: any) => {
      scoringConfigMap.set(config.category_id, {
        id: config.id,
        categoryId: config.category_id,
        presetType: config.preset_type,
        pointsTable: config.points_table && typeof config.points_table === 'object'
          ? config.points_table
          : generateDefaultPoints(60),
        dnfPoints: config.dnf_points || 0,
        dnsPoints: config.dns_points || 0,
      });
    });
  }

  await supabase.from('wod_results').delete().in('category_id', categoryIds);

  const now = new Date().toISOString();
  const buffer: any[] = [];

  typedCategories.forEach((category) => {
    const participants = registrationsByCategory.get(category.id) || [];
    if (participants.length === 0) return;

    const scoringConfig =
      scoringConfigMap.get(category.id) || {
        id: `fallback-${category.id}`,
        categoryId: category.id,
        presetType: 'crossfit-games',
        pointsTable: generateDefaultPoints(participants.length),
        dnfPoints: 1,
        dnsPoints: 0,
      };

    typedWods.forEach((wod, wodIndex) => {
      const resultsForScoring = participants.map((participant, index) => {
        const randomResult = generateResultByType(wod.type);
        return {
          id: `${wod.id}-${participant.id}`,
          wodId: wod.id,
          categoryId: category.id,
          registrationId: participant.id,
          result: randomResult.result,
          tiebreakValue: randomResult.tiebreak,
          status: 'completed' as const,
          createdAt: now,
          updatedAt: now,
        };
      });

      const scored = calculateWODPoints(resultsForScoring as any, scoringConfig as any, wod.type || 'for-time');

      scored.forEach((scoredResult: any) => {
        buffer.push({
          wod_id: scoredResult.wodId,
          category_id: scoredResult.categoryId,
          registration_id: scoredResult.registrationId,
          result: scoredResult.result,
          tiebreak_value: scoredResult.tiebreakValue || null,
          status: scoredResult.status,
          points: scoredResult.points,
          position: scoredResult.position,
        });
      });
    });
  });

  const chunkSize = 500;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const { error: insertError } = await supabase.from('wod_results').insert(chunk);
    if (insertError) throw insertError;
  }

  return { generated: buffer.length };
}

