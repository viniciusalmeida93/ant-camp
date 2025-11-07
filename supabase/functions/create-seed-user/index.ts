import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const seedEmail = "vinicius.almeidaa93@gmail.com";
    const seedPassword = "Temp-CRF93!";

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users.some(u => u.email === seedEmail);

    let userId: string;

    if (!userExists) {
      // Create user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: seedEmail,
        password: seedPassword,
        email_confirm: true,
      });

      if (createError) throw createError;
      userId = newUser.user.id;
      console.log("Seed user created:", seedEmail);
    } else {
      userId = existingUser.users.find(u => u.email === seedEmail)!.id;
      console.log("Seed user already exists:", seedEmail);
    }

    // Check if profile exists, create if not
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: seedEmail,
          full_name: "Usuário Seed",
          password_reset_required: true,
        });

      if (profileError) throw profileError;
      console.log("Profile created for seed user");
    } else {
      console.log("Profile already exists for seed user");
    }

    // Check if example championship exists
    const { data: existingChamp } = await supabase
      .from("championships")
      .select("id, slug")
      .eq("name", "Campeonato de Exemplo")
      .eq("organizer_id", userId)
      .single();

    let championshipData;

    if (!existingChamp) {
      // Create example championship
      const { data: newChamp, error: champError } = await supabase
        .from("championships")
        .insert({
          name: "Campeonato de Exemplo",
          slug: "exemplo-" + Date.now(),
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          location: "São Paulo, SP",
          description: "Campeonato de exemplo para testes",
          organizer_id: userId,
          is_published: true,
          is_indexable: false,
        })
        .select()
        .single();

      if (champError) throw champError;
      championshipData = newChamp;

      // Create example category
      const { data: category, error: catError } = await supabase
        .from("categories")
        .insert({
          championship_id: newChamp.id,
          name: "RX Individual Masculino",
          format: "individual",
          gender: "masculino",
          capacity: 50,
          price_cents: 15000,
        })
        .select()
        .single();

      if (catError) throw catError;

      // Create example WODs
      const { error: wodError } = await supabase
        .from("wods")
        .insert([
          {
            championship_id: newChamp.id,
            name: "WOD 1 - Grace",
            type: "tempo",
            description: "30 Clean & Jerks (60/43kg)",
            time_cap: "8:00",
            order_num: 1,
          },
          {
            championship_id: newChamp.id,
            name: "WOD 2 - AMRAP 10",
            type: "amrap",
            description: "10 min AMRAP: 10 Box Jumps, 10 Burpees, 10 Pull-ups",
            time_cap: "10:00",
            order_num: 2,
          },
        ]);

      if (wodError) throw wodError;

      // Create scoring config for category
      const { error: scoringError } = await supabase
        .from("scoring_configs")
        .insert({
          category_id: category.id,
          preset_type: "crossfit-games",
          points_table: {
            "1": 100,
            "2": 97,
            "3": 94,
            "4": 91,
            "5": 88,
          },
          dnf_points: 1,
          dns_points: 0,
        });

      if (scoringError) throw scoringError;

      // Assign organizer role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "organizer",
          championship_id: newChamp.id,
        });

      if (roleError) throw roleError;

      console.log("Example championship created");
    } else {
      championshipData = existingChamp;
      console.log("Example championship already exists");
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        championship: championshipData,
        message: "Seed user and example championship ready",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-seed-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
