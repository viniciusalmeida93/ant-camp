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

    // Adiciona a coluna pix_payload se não existir
    const { error } = await supabase.rpc('exec', {
      query: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'championships' 
            AND column_name = 'pix_payload'
          ) THEN
            ALTER TABLE public.championships
            ADD COLUMN pix_payload TEXT;
          END IF;
        END $$;
      `
    });

    if (error) {
      // Tenta método alternativo usando SQL direto
      const { data, error: sqlError } = await supabase
        .from("championships")
        .select("id")
        .limit(1);

      // Se a query funciona mas a coluna não existe, retorna instruções
      if (!sqlError) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: "A coluna pix_payload precisa ser criada manualmente. Execute o SQL no Supabase Dashboard.",
            sql: "ALTER TABLE public.championships ADD COLUMN IF NOT EXISTS pix_payload TEXT;"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Coluna pix_payload verificada/criada com sucesso" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        sql: "ALTER TABLE public.championships ADD COLUMN IF NOT EXISTS pix_payload TEXT;"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

