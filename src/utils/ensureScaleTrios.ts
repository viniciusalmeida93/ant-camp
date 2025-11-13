import { supabase } from '@/integrations/supabase/client';
import {
  createEmail,
  generateFullName,
  generateWhatsapp,
  sanitizeName,
  SHIRT_SIZES,
} from '@/utils/demoDataHelpers';

type TargetCategory = {
  name: string;
  minimumEntries: number;
  requiredFormat?: 'individual' | 'dupla' | 'trio' | 'time';
};

const TARGET_CATEGORIES: TargetCategory[] = [
  { name: 'Scale Feminino', minimumEntries: 10, requiredFormat: 'trio' },
  { name: 'Scale Masculino', minimumEntries: 10, requiredFormat: 'trio' },
  { name: 'Intermediário', minimumEntries: 10, requiredFormat: 'dupla' },
  { name: 'RX Feminino', minimumEntries: 10, requiredFormat: 'individual' },
  { name: 'RX Masculino', minimumEntries: 10, requiredFormat: 'individual' },
];

const resolveTeamSize = (format?: string | null, explicitSize?: number | null) => {
  if (explicitSize && explicitSize > 0) return explicitSize;

  switch (format) {
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

export async function ensureScaleTrios(championshipId: string) {
  const categoryNames = TARGET_CATEGORIES.map((c) => c.name);

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, format, team_size, gender')
    .eq('championship_id', championshipId)
    .in('name', categoryNames);

  if (categoriesError) throw categoriesError;

  if (!categories || categories.length === 0) {
    return { added: 0 };
  }

  const categoryIdMap = new Map(categories.map((category) => [category.name, category]));

  const categoryIds = categories.map((category) => category.id);

  const { data: registrationsData, error: registrationsError } = await supabase
    .from('registrations')
    .select('id, category_id')
    .eq('championship_id', championshipId)
    .in('category_id', categoryIds);

  if (registrationsError) throw registrationsError;

  const countMap = new Map<string, number>();
  (registrationsData || []).forEach((registration) => {
    countMap.set(registration.category_id, (countMap.get(registration.category_id) || 0) + 1);
  });

  let totalAdded = 0;

  for (const target of TARGET_CATEGORIES) {
    const category = categoryIdMap.get(target.name);
    if (!category) continue;

    const teamSize = resolveTeamSize(category.format, category.team_size);
    const isIndividual = teamSize === 1;

    const currentCount = countMap.get(category.id) || 0;
    const missing = Math.max(0, target.minimumEntries - currentCount);
    if (missing === 0) continue;

    const baseName = sanitizeName(category.name) || 'Categoria';
    const categoryCode = (category.id || '').slice(0, 4).toLowerCase();
    const emailPrefixBase = `${baseName}-${categoryCode}`;

    const teamsToInsert = [];
    const individualsToInsert = [];

    for (let i = 0; i < missing; i++) {
      const globalIndex = currentCount + i + 1;
      if (isIndividual) {
        const fullName = generateFullName(globalIndex);
        const shirtSize = SHIRT_SIZES[globalIndex % SHIRT_SIZES.length];
        individualsToInsert.push({
          championship_id: championshipId,
          category_id: category.id,
          athlete_name: fullName,
          athlete_email: createEmail(`${emailPrefixBase}-atleta-`, globalIndex),
          athlete_phone: generateWhatsapp(globalIndex),
          team_name: null,
          team_members: null,
          shirt_size: shirtSize,
          subtotal_cents: 0,
          platform_fee_cents: 0,
          total_cents: 0,
          status: 'approved',
          payment_status: 'approved',
        });
      } else {
        const members = Array.from({ length: teamSize }).map((_, memberIndex) => ({
          name: generateFullName(globalIndex, memberIndex + 1),
          email: createEmail(`${emailPrefixBase}-membro-`, globalIndex, memberIndex + 1),
          whatsapp: generateWhatsapp(globalIndex, memberIndex + 1),
          shirtSize: SHIRT_SIZES[(globalIndex + memberIndex) % SHIRT_SIZES.length],
        }));

        teamsToInsert.push({
          championship_id: championshipId,
          category_id: category.id,
          athlete_name: members[0].name,
          athlete_email: members[0].email,
          athlete_phone: members[0].whatsapp,
          team_name: `${baseName} Equipe ${globalIndex}`,
          team_members: members,
          shirt_size: members[0].shirtSize || 'M',
          subtotal_cents: 0,
          platform_fee_cents: 0,
          total_cents: 0,
          status: 'approved',
          payment_status: 'approved',
        });
      }
    }

    if (teamsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('registrations').insert(teamsToInsert);
      if (insertError) throw insertError;
      totalAdded += teamsToInsert.length;
    }

    if (individualsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('registrations').insert(individualsToInsert);
      if (insertError) throw insertError;
      totalAdded += individualsToInsert.length;
    }
  }

  return { added: totalAdded };
}

