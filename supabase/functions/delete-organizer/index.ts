import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DeleteData {
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    // Service role key bypasses RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId }: DeleteData = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    // Step-by-step deletion to capture exact constraints

    // 1. Apagar roles
    const { error: rolesError } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (rolesError) throw new Error("rolesError: " + JSON.stringify(rolesError));

    // 2. Apagar asaas integrations
    const { error: asaasError } = await supabase.from('organizer_asaas_integrations').delete().eq('organizer_id', userId);
    if (asaasError) throw new Error("asaasError: " + JSON.stringify(asaasError));

    // 3. Apagar inscrições feitas por esse user
    const { error: regError } = await supabase.from('registrations').delete().eq('user_id', userId);
    if (regError) throw new Error("regError: " + JSON.stringify(regError));

    // 4. Apagar campeonatos criados por esse user (e seus cascades)
    const { error: champsError } = await supabase.from('championships').delete().eq('organizer_id', userId);
    if (champsError) throw new Error("champsError: " + JSON.stringify(champsError));

    // 5. Apagar profiles
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
    if (profileError) throw new Error("profileError: " + JSON.stringify(profileError));

    // 6. Excluir o usuário do auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw new Error("authError: " + JSON.stringify(authError));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      // Retornar 200 para o Supabase SDK ler o body e não jogar generic 400/500
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
