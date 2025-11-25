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

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e senha são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users.some(u => u.email === email);

    let userId: string;

    if (!userExists) {
      // Create user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });

      if (createError) throw createError;
      userId = newUser.user.id;
      console.log("Super admin user created:", email);
    } else {
      userId = existingUsers.users.find(u => u.email === email)!.id;
      console.log("User already exists:", email);
      
      // Update password if needed
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
      });
      if (updateError) {
        console.error("Error updating password:", updateError);
      }
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
          email: email,
          full_name: "Super Admin",
          password_reset_required: false,
        });

      if (profileError) throw profileError;
      console.log("Profile created for super admin");
    }

    // Assign admin role (super admin = admin role with NULL championship_id)
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "admin",
        championship_id: null,
      }, {
        onConflict: "user_id,role,championship_id",
      });

    if (roleError) {
      console.error("Error assigning admin role:", roleError);
      // Continue anyway
    } else {
      console.log("Admin role assigned to super admin");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Super admin criado com sucesso",
        userId,
        email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating super admin:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao criar super admin",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

