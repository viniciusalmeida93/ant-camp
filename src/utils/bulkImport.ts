import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  name: string;
  email: string;
  whatsapp: string;
  shirtSize?: string;
  cpf?: string;
  box?: string;
}

interface Team {
  name: string;
  members: TeamMember[];
  categoryName: string;
  categoryFormat: string;
  categoryGender: string;
}

interface IndividualAthlete {
  name: string;
  email: string;
  whatsapp: string;
  shirtSize?: string;
  cpf?: string;
  box?: string;
  categoryName: string;
  categoryFormat: string;
  categoryGender: string;
}

interface WODData {
  name: string;
  description: string;
  time_cap?: string;
  notes?: string;
}

export async function bulkImportData(
  championshipId: string,
  teams: Team[],
  individuals: IndividualAthlete[],
  wods: WODData[]
) {
  try {
    // 1. Buscar ou criar categorias
    const categoryMap = new Map<string, string>();
    
    const allCategoryNames = [
      ...new Set([
        ...teams.map(t => t.categoryName),
        ...individuals.map(i => i.categoryName),
      ])
    ];

    for (const categoryName of allCategoryNames) {
      const team = teams.find(t => t.categoryName === categoryName) || 
                   individuals.find(i => i.categoryName === categoryName);
      
      if (!team) continue;

      // Verificar se categoria já existe
      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("championship_id", championshipId)
        .eq("name", categoryName)
        .maybeSingle();

      if (existing) {
        categoryMap.set(categoryName, existing.id);
      } else {
        // Criar categoria
        const format = team.categoryFormat || (individuals.find(i => i.categoryName === categoryName)?.categoryFormat || 'individual');
        const gender = team.categoryGender || (individuals.find(i => i.categoryName === categoryName)?.categoryGender || 'masculino');
        
        // Determinar team_size baseado no format
        let team_size = null;
        if (format === 'dupla') team_size = 2;
        else if (format === 'trio') team_size = 3;
        else if (format === 'time') team_size = 4;

        // Buscar max order_index
        const { data: existingCats } = await supabase
          .from("categories")
          .select("order_index")
          .eq("championship_id", championshipId)
          .order("order_index", { ascending: false })
          .limit(1);

        const maxOrder = existingCats && existingCats.length > 0 
          ? (existingCats[0].order_index || 0)
          : -1;

        const { data: newCategory, error: catError } = await supabase
          .from("categories")
          .insert({
            championship_id: championshipId,
            name: categoryName,
            format: format,
            gender: gender,
            capacity: 999999, // Ilimitada
            team_size: team_size,
            price_cents: 0,
            order_index: maxOrder + 1,
          })
          .select()
          .single();

        if (catError) throw catError;
        categoryMap.set(categoryName, newCategory.id);
      }
    }

    // 2. Criar inscrições para times
    for (const team of teams) {
      const categoryId = categoryMap.get(team.categoryName);
      if (!categoryId) continue;

      const teamMembers = team.members.map(m => ({
        name: m.name,
        email: m.email,
        whatsapp: m.whatsapp,
        shirtSize: m.shirtSize || 'M',
        cpf: m.cpf,
        box: m.box,
      }));

      const { error: regError } = await supabase
        .from("registrations")
        .insert({
          championship_id: championshipId,
          category_id: categoryId,
          athlete_name: team.members[0].name,
          athlete_email: team.members[0].email,
          athlete_phone: team.members[0].whatsapp,
          team_name: team.name,
          team_members: teamMembers,
          shirt_size: team.members[0].shirtSize || 'M',
          subtotal_cents: 0,
          platform_fee_cents: 0,
          total_cents: 0,
          status: 'confirmed',
          payment_status: 'approved',
        });

      if (regError) throw regError;
    }

    // 3. Criar inscrições para atletas individuais
    for (const athlete of individuals) {
      const categoryId = categoryMap.get(athlete.categoryName);
      if (!categoryId) continue;

      const { error: regError } = await supabase
        .from("registrations")
        .insert({
          championship_id: championshipId,
          category_id: categoryId,
          athlete_name: athlete.name,
          athlete_email: athlete.email,
          athlete_phone: athlete.whatsapp,
          team_name: null,
          team_members: null,
          shirt_size: athlete.shirtSize || 'M',
          subtotal_cents: 0,
          platform_fee_cents: 0,
          total_cents: 0,
          status: 'confirmed',
          payment_status: 'approved',
        });

      if (regError) throw regError;
    }

    // 4. Criar WODs
    const { data: existingWODs } = await supabase
      .from("wods")
      .select("order_num")
      .eq("championship_id", championshipId)
      .order("order_num", { ascending: false })
      .limit(1);

    const maxOrder = existingWODs && existingWODs.length > 0 
      ? (existingWODs[0].order_num || 0)
      : 0;

    for (let i = 0; i < wods.length; i++) {
      const { error: wodError } = await supabase
        .from("wods")
        .insert({
          championship_id: championshipId,
          name: wods[i].name,
          type: 'tempo',
          description: wods[i].description,
          time_cap: wods[i].time_cap || null,
          notes: wods[i].notes || null,
          order_num: maxOrder + i + 1,
        });

      if (wodError) throw wodError;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in bulk import:", error);
    throw error;
  }
}

