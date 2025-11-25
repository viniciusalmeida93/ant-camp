import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignRoleRequest {
  userEmail: string;
  role: "admin" | "super_admin";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userEmail, role }: AssignRoleRequest = await req.json();

    if (!userEmail || !role) {
      return new Response(
        JSON.stringify({ error: "userEmail e role são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role !== "admin" && role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Role deve ser 'admin' ou 'super_admin'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar usuário pelo email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: `Usuário com email ${userEmail} não encontrado` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o role já existe
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", role)
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Usuário ${userEmail} já possui o role ${role}`,
          userId: user.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remover outros roles de admin se for super_admin (super_admin substitui admin)
    if (role === "super_admin") {
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role", "admin");
    } else if (role === "admin") {
      // Se for admin, remover super_admin (admin não substitui super_admin)
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role", "super_admin");
    }

    // Criar o role
    const { data: newRole, error: insertError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: role,
        championship_id: null, // Role global, não específico de campeonato
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Role ${role} atribuído com sucesso para ${userEmail}`,
        userId: user.id,
        role: newRole,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error assigning role:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao atribuir role",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

