import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestRequest {
  organizerId?: string;
  championshipId?: string;
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

    const { organizerId, championshipId }: TestRequest = await req.json();

    let targetOrganizerId = organizerId;

    // Se championshipId foi fornecido, buscar o organizer_id do campeonato
    if (championshipId && !organizerId) {
      const { data: championship, error: champError } = await supabase
        .from("championships")
        .select("organizer_id")
        .eq("id", championshipId)
        .single();

      if (champError || !championship) {
        return new Response(
          JSON.stringify({ error: "Campeonato não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetOrganizerId = championship.organizer_id;
    }

    if (!targetOrganizerId) {
      return new Response(
        JSON.stringify({ error: "organizerId ou championshipId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== TESTANDO CONEXÃO DO ORGANIZADOR ===");
    console.log("Organizer ID:", targetOrganizerId);

    // Buscar integração do organizador
    const { data: integration, error: integrationError } = await supabase
      .from("organizer_asaas_integrations")
      .select("*")
      .eq("organizer_id", targetOrganizerId)
      .eq("is_active", true)
      .maybeSingle();

    if (integrationError) {
      console.error("Erro ao buscar integração:", integrationError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao buscar integração",
          details: integrationError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!integration) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Integração Asaas não encontrada ou inativa",
          hasIntegration: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Integração encontrada:", {
      id: integration.id,
      hasApiKey: !!integration.asaas_api_key,
      hasWalletId: !!integration.asaas_wallet_id,
      lastValidated: integration.last_validated_at,
    });

    const results: any = {
      success: true,
      hasIntegration: true,
      integration: {
        id: integration.id,
        hasApiKey: !!integration.asaas_api_key,
        hasWalletId: !!integration.asaas_wallet_id,
        walletId: integration.asaas_wallet_id,
        lastValidated: integration.last_validated_at,
        isActive: integration.is_active,
      },
      tests: {},
    };

    // Testar API Key
    if (integration.asaas_api_key) {
      try {
        const accountResponse = await fetch("https://www.asaas.com/api/v3/myAccount", {
          headers: {
            "access_token": integration.asaas_api_key,
          },
        });

        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          results.tests.apiKey = {
            valid: true,
            accountName: accountData.name,
            accountEmail: accountData.email,
            accountCpfCnpj: accountData.cpfCnpj,
          };
          console.log("API Key válida - Conta:", accountData.name);
        } else {
          const errorData = await accountResponse.json();
          results.tests.apiKey = {
            valid: false,
            error: errorData.errors?.[0]?.description || "API key inválida",
          };
          console.error("API Key inválida:", errorData);
        }
      } catch (error: any) {
        results.tests.apiKey = {
          valid: false,
          error: error.message || "Erro ao testar API key",
        };
        console.error("Erro ao testar API key:", error);
      }
    } else {
      results.tests.apiKey = {
        valid: false,
        error: "API key não configurada",
      };
    }

    // Testar Wallet ID
    if (integration.asaas_wallet_id && integration.asaas_api_key) {
      try {
        const walletsResponse = await fetch("https://www.asaas.com/api/v3/myAccount/wallets", {
          headers: {
            "access_token": integration.asaas_api_key,
          },
        });

        if (walletsResponse.ok) {
          const wallets = await walletsResponse.json();
          const walletExists = wallets.data?.some((w: any) => 
            w.id === integration.asaas_wallet_id || 
            w.walletId === integration.asaas_wallet_id
          );

          results.tests.walletId = {
            valid: walletExists,
            walletId: integration.asaas_wallet_id,
            found: walletExists,
            totalWallets: wallets.data?.length || 0,
          };

          if (walletExists) {
            console.log("Wallet ID válido:", integration.asaas_wallet_id);
          } else {
            console.warn("Wallet ID não encontrado na conta:", integration.asaas_wallet_id);
            console.log("Wallets disponíveis:", wallets.data?.map((w: any) => w.id || w.walletId));
          }
        } else {
          const errorData = await walletsResponse.json();
          results.tests.walletId = {
            valid: false,
            error: errorData.errors?.[0]?.description || "Erro ao buscar wallets",
          };
        }
      } catch (error: any) {
        results.tests.walletId = {
          valid: false,
          error: error.message || "Erro ao testar wallet ID",
        };
        console.error("Erro ao testar wallet ID:", error);
      }
    } else {
      results.tests.walletId = {
        valid: false,
        error: integration.asaas_wallet_id ? "API key necessária para validar wallet" : "Wallet ID não configurado",
      };
    }

    // Determinar se a conexão está funcionando
    results.connectionWorking = 
      results.tests.apiKey?.valid === true && 
      results.tests.walletId?.valid === true;

    console.log("=== RESULTADO DO TESTE ===");
    console.log("Conexão funcionando:", results.connectionWorking);
    console.log("API Key válida:", results.tests.apiKey?.valid);
    console.log("Wallet ID válido:", results.tests.walletId?.valid);

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro ao testar conexão:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

