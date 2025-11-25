import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateRequest {
  apiKey: string;
  walletId?: string;
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

    const { apiKey, walletId }: ValidateRequest = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate API key by fetching account info
    const accountResponse = await fetch("https://www.asaas.com/api/v3/myAccount", {
      headers: {
        "access_token": apiKey,
      },
    });

    if (!accountResponse.ok) {
      const errorData = await accountResponse.json();
      return new Response(
        JSON.stringify({
          valid: false,
          error: errorData.errors?.[0]?.description || "Chave de API inválida",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accountData = await accountResponse.json();

    // Validate wallet ID if provided
    let walletValid = null;
    if (walletId && walletId.trim()) {
      try {
        const walletsResponse = await fetch("https://www.asaas.com/api/v3/myAccount/wallets", {
          headers: {
            "access_token": apiKey,
          },
        });

        if (walletsResponse.ok) {
          const wallets = await walletsResponse.json();
          const walletExists = wallets.data?.some((w: any) => 
            w.id === walletId.trim() || 
            w.walletId === walletId.trim()
          );
          walletValid = walletExists;
        }
      } catch (error) {
        console.error("Error validating wallet:", error);
      }
    }

    return new Response(
      JSON.stringify({
        valid: true,
        apiKey: true,
        walletId: walletValid,
        accountInfo: {
          name: accountData.name,
          email: accountData.email,
          cpfCnpj: accountData.cpfCnpj,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error validating Asaas account:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: error.message || "Erro ao validar conta",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

