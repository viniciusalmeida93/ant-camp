import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EditData {
  userId: string;
  email: string;
  fullName: string;
  password?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email, fullName, password }: EditData = await req.json();

    if (!userId || !email || !fullName) {
      throw new Error("userId, email and fullName are required");
    }

    const updateData: any = {
      email,
      user_metadata: { full_name: fullName },
    };

    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    const { data: userData, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error editing user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
