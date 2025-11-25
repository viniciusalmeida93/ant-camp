import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para detectar o ambiente e retornar a URL base correta do Asaas
function getAsaasBaseUrl(apiKey: string): string {
  // API keys de sandbox/homologação começam com $aact_hmlg_
  // API keys de produção começam com $aact_prod_
  if (apiKey.startsWith("$aact_hmlg_")) {
    return "https://api-sandbox.asaas.com/v3";
  }
  // Produção
  return "https://api.asaas.com/v3";
}

interface PaymentRequest {
  registrationId: string;
  categoryId: string;
  athleteName: string;
  athleteEmail: string;
  athletePhone?: string;
  athleteCpf?: string;
  athleteBirthDate?: string;
  teamName?: string;
  teamMembers?: any[];
  priceCents: number;
  paymentMethod?: "pix" | "credit_card";
  cardData?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    postalCode?: string; // CEP do titular do cartão
    addressNumber?: string; // Número do endereço
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== CREATE PAYMENT FUNCTION START ===");
    
    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client created");
    
    // Parse request body
    let requestBody: PaymentRequest;
    try {
      requestBody = await req.json();
      console.log("Request body received");
    } catch (jsonError: any) {
      console.error("Error parsing JSON:", jsonError);
      return new Response(
        JSON.stringify({ error: `Invalid JSON: ${jsonError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { registrationId, categoryId, athleteName, athleteEmail, athletePhone, athleteCpf, athleteBirthDate, teamName, priceCents, paymentMethod = "pix", cardData } = requestBody;
    
    // Validar campos obrigatórios
    if (!registrationId || !categoryId || !athleteName || !athleteEmail || !priceCents) {
      const missing = [];
      if (!registrationId) missing.push("registrationId");
      if (!categoryId) missing.push("categoryId");
      if (!athleteName) missing.push("athleteName");
      if (!athleteEmail) missing.push("athleteEmail");
      if (!priceCents) missing.push("priceCents");
      
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Validating registration:", registrationId);
    
    // Get registration
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      console.error("Registration error:", regError);
      return new Response(
        JSON.stringify({ error: `Registration not found: ${regError?.message || "Unknown"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Registration found, category_id:", registration.category_id);

    // Get category
    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id, championship_id")
      .eq("id", registration.category_id)
      .single();

    if (catError || !category) {
      console.error("Category error:", catError);
      return new Response(
        JSON.stringify({ error: `Category not found: ${catError?.message || "Unknown"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Category found, championship_id:", category.championship_id);

    // Get championship
    const { data: championship, error: champError } = await supabase
      .from("championships")
      .select("id, name, organizer_id")
      .eq("id", category.championship_id)
      .single();
    
    if (champError || !championship) {
      console.error("Championship error:", champError);
      return new Response(
        JSON.stringify({ error: `Championship not found: ${champError?.message || "Unknown"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Championship found:", championship.name);

    // Para pagamento via cartão de crédito, verificar integração Asaas
    if (paymentMethod === "credit_card") {
      if (!cardData) {
        return new Response(
          JSON.stringify({ error: "Dados do cartão são obrigatórios para pagamento via cartão de crédito" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verificar se o organizador tem integração Asaas
      // IMPORTANTE: Buscar a integração do ORGANIZADOR do campeonato, não da plataforma
      console.log("=== BUSCANDO INTEGRAÇÃO ASAAS ===");
      console.log("Championship Organizer ID:", championship.organizer_id);
      console.log("Championship Name:", championship.name);
      
      // Buscar integração do organizador
      const { data: asaasIntegration, error: asaasError } = await supabase
        .from("organizer_asaas_integrations")
        .select("id, asaas_api_key, asaas_wallet_id, organizer_id, organizer_cnpj")
        .eq("organizer_id", championship.organizer_id)
        .eq("is_active", true)
        .maybeSingle();
      
      console.log("=== DEBUG: INTEGRAÇÃO ENCONTRADA ===");
      console.log("Organizer ID buscado:", championship.organizer_id);
      console.log("Integração encontrada:", asaasIntegration ? "SIM" : "NÃO");
      if (asaasIntegration) {
        console.log("  - Integration ID:", asaasIntegration.id);
        console.log("  - Organizer ID na integração:", asaasIntegration.organizer_id);
        console.log("  - Tem API Key:", !!asaasIntegration.asaas_api_key);
        console.log("  - API Key (primeiros 20 chars):", asaasIntegration.asaas_api_key ? asaasIntegration.asaas_api_key.substring(0, 20) + "..." : "N/A");
        console.log("  - Wallet ID:", asaasIntegration.asaas_wallet_id || "NÃO CONFIGURADO");
      }

      if (asaasError) {
        console.error("Erro ao buscar integração Asaas:", asaasError);
        return new Response(
          JSON.stringify({ error: "Erro ao verificar integração Asaas do organizador." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!asaasIntegration || !asaasIntegration.asaas_api_key) {
        console.error("Nenhuma integração encontrada para organizador:", championship.organizer_id);
        return new Response(
          JSON.stringify({ error: "Pagamento via cartão de crédito não está disponível. O organizador precisa configurar a integração com Asaas." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validar que a integração pertence ao organizador correto
      if (asaasIntegration.organizer_id !== championship.organizer_id) {
        console.error("ERRO CRÍTICO: Integração Asaas não pertence ao organizador do campeonato!", {
          integrationOrganizerId: asaasIntegration.organizer_id,
          championshipOrganizerId: championship.organizer_id,
        });
        return new Response(
          JSON.stringify({ error: "Erro de configuração: integração Asaas não corresponde ao organizador." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("=== INTEGRAÇÃO ENCONTRADA ===");
      console.log("Integration ID:", asaasIntegration.id);
      console.log("Organizer ID:", asaasIntegration.organizer_id);
      console.log("API Key (primeiros 30 chars):", asaasIntegration.asaas_api_key.substring(0, 30) + "...");
      console.log("Wallet ID:", asaasIntegration.asaas_wallet_id || "NÃO CONFIGURADO");
      console.log("CNPJ do Organizador:", asaasIntegration.organizer_cnpj || "NÃO CONFIGURADO");

      // NÃO fazer split - 100% do pagamento vai para o organizador
      // Não buscar wallet da plataforma, pois não há split

      // IMPORTANTE: O pagamento deve ir para a wallet do organizador
      // Se não houver wallet do organizador especificada, o pagamento vai para a wallet padrão da conta da API key
      // Se houver split, configuramos para dividir entre organizador (95%) e plataforma (5%)

      // Definir valor total do pagamento
      const totalCents = priceCents;

      // IMPORTANTE: Criar ou buscar customer no Asaas antes de criar o pagamento
      // O Asaas precisa de um customer ID, não um email
      let customerId: string | null = null;
      
      // Primeiro, tentar buscar customer existente por email
      try {
        const customerSearchResponse = await fetch(
          `${asaasBaseUrl}/customers?email=${encodeURIComponent(athleteEmail)}`,
          {
            headers: {
              "access_token": organizerApiKey,
            },
          }
        );

        if (customerSearchResponse.ok) {
          const customerData = await customerSearchResponse.json();
          if (customerData.data && customerData.data.length > 0) {
            customerId = customerData.data[0].id;
            console.log("Customer encontrado no Asaas:", customerId);
          }
        }
      } catch (error) {
        console.warn("Erro ao buscar customer:", error);
      }

      // Se não encontrou, criar novo customer
      if (!customerId) {
        try {
          const createCustomerResponse = await fetch(`${asaasBaseUrl}/customers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "access_token": organizerApiKey,
            },
            body: JSON.stringify({
              name: athleteName,
              email: athleteEmail,
              phone: athletePhone?.replace(/\D/g, "") || "",
              cpfCnpj: athleteCpf?.replace(/\D/g, "") || "",
            }),
          });

          if (createCustomerResponse.ok) {
            const newCustomer = await createCustomerResponse.json();
            customerId = newCustomer.id;
            console.log("Novo customer criado no Asaas:", customerId);
          } else {
            const errorData = await createCustomerResponse.json();
            console.error("Erro ao criar customer:", errorData);
            return new Response(
              JSON.stringify({ error: `Erro ao criar cliente no Asaas: ${errorData.errors?.[0]?.description || "Erro desconhecido"}` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (error: any) {
          console.error("Erro ao criar customer:", error);
          return new Response(
            JSON.stringify({ error: `Erro ao criar cliente no Asaas: ${error.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (!customerId) {
        return new Response(
          JSON.stringify({ error: "Não foi possível criar ou encontrar o cliente no Asaas" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Criar pagamento no Asaas usando o customer ID
      const asaasPaymentData: any = {
        customer: customerId, // Usar ID do customer, não email
        billingType: "CREDIT_CARD",
        value: (totalCents / 100).toFixed(2),
        dueDate: new Date().toISOString().split("T")[0],
        description: `Inscrição: ${championship.name} - ${athleteName}`,
        creditCard: {
          holderName: cardData.holderName,
          number: cardData.number.replace(/\s/g, ""),
          expiryMonth: cardData.expiryMonth.padStart(2, "0"),
          expiryYear: cardData.expiryYear,
          ccv: cardData.cvv,
        },
        creditCardHolderInfo: {
          name: athleteName,
          email: athleteEmail,
          cpfCnpj: athleteCpf?.replace(/\D/g, "") || "",
          phone: athletePhone?.replace(/\D/g, "") || "",
          postalCode: cardData.postalCode?.replace(/\D/g, "") || "",
          addressNumber: cardData.addressNumber || "S/N", // Número é obrigatório junto com CEP
        },
      };

      // NÃO configurar split - a API key já é do organizador, então o pagamento vai direto para ele
      // O Asaas não permite split para a própria conta
      console.log("Pagamento 100% para organizador (sem split - API key já é do organizador):", {
        amount: totalCents,
        percent: "100%",
      });

      // IMPORTANTE: Usar a API key do ORGANIZADOR, não da plataforma
      // A API key determina em qual conta o pagamento será criado
      const organizerApiKey = asaasIntegration.asaas_api_key;
      
      // VERIFICAR QUAL CONTA ESTÁ SENDO USADA ANTES DE CRIAR O PAGAMENTO
      const asaasBaseUrl = getAsaasBaseUrl(organizerApiKey);
      console.log("=== VERIFICANDO CONTA ASAAS QUE SERÁ USADA ===");
      console.log("Ambiente detectado:", organizerApiKey.startsWith("$aact_hmlg_") ? "SANDBOX" : "PRODUÇÃO");
      console.log("URL Base:", asaasBaseUrl);
      let accountInfo = null;
      try {
        const accountCheckResponse = await fetch(`${asaasBaseUrl}/myAccount`, {
          headers: {
            "access_token": organizerApiKey,
          },
        });

        if (accountCheckResponse.ok) {
          accountInfo = await accountCheckResponse.json();
          console.log("🚨 CONTA QUE SERÁ USADA PARA O PAGAMENTO:");
          console.log("   Nome:", accountInfo.name);
          console.log("   Email:", accountInfo.email);
          console.log("   CPF/CNPJ:", accountInfo.cpfCnpj);
          console.log("   Account ID:", accountInfo.id);
          
          // Verificar se a conta pertence ao organizador (comparar com CNPJ/CPF se disponível)
          if (asaasIntegration.organizer_cnpj) {
            const organizerCnpjClean = asaasIntegration.organizer_cnpj.replace(/\D/g, "");
            const accountCnpjClean = (accountInfo.cpfCnpj || "").replace(/\D/g, "");
            console.log("   Comparando CNPJ:");
            console.log("   - Organizador (configurado):", organizerCnpjClean);
            console.log("   - Conta Asaas:", accountCnpjClean);
            if (organizerCnpjClean && accountCnpjClean && organizerCnpjClean !== accountCnpjClean) {
              console.warn("⚠️ ATENÇÃO: CPF/CNPJ da conta Asaas não corresponde ao CPF/CNPJ do organizador!");
              console.warn("   Conta Asaas CPF/CNPJ:", accountCnpjClean);
              console.warn("   Organizador CPF/CNPJ:", organizerCnpjClean);
            } else if (organizerCnpjClean && accountCnpjClean && organizerCnpjClean === accountCnpjClean) {
              console.log("✅ CNPJ confere! A conta pertence ao organizador.");
            }
          }
        } else {
          const errorData = await accountCheckResponse.json();
          console.error("ERRO ao verificar conta Asaas:", errorData);
          return new Response(
            JSON.stringify({ 
              error: `API key inválida ou expirada: ${errorData.errors?.[0]?.description || "Não foi possível verificar a conta"}` 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (error: any) {
        console.error("Erro ao verificar conta Asaas:", error);
        return new Response(
          JSON.stringify({ 
            error: `Erro ao verificar conta Asaas: ${error.message}` 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("=== CRIANDO PAGAMENTO NO ASAAS ===");
      console.log("Organizador ID:", championship.organizer_id);
      console.log("API Key do Organizador (primeiros 15 chars):", organizerApiKey.substring(0, 15) + "...");
      console.log("Conta Asaas:", accountInfo?.name || "N/A");
      console.log("Valor total:", totalCents, "centavos");
      console.log("Organizador recebe:", totalCents, "centavos (100% - sem split, API key já é do organizador)");
      
      const asaasResponse = await fetch(`${asaasBaseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": organizerApiKey, // API KEY DO ORGANIZADOR
        },
        body: JSON.stringify(asaasPaymentData),
      });

      if (!asaasResponse.ok) {
        const errorData = await asaasResponse.json();
        console.error("ERRO ao criar pagamento no Asaas:", errorData);
        console.error("Status:", asaasResponse.status);
        console.error("Response:", JSON.stringify(errorData, null, 2));
        return new Response(
          JSON.stringify({ error: errorData.errors?.[0]?.description || "Erro ao processar pagamento no Asaas" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const asaasPayment = await asaasResponse.json();
      console.log("=== PAGAMENTO CRIADO COM SUCESSO ===");
      console.log("ID do Pagamento Asaas:", asaasPayment.id);
      console.log("Status:", asaasPayment.status);
      console.log("Conta de destino:", accountInfo?.name || "N/A");

      // Criar registro de pagamento
      // Sem split: platform_fee_cents = 0, net_amount_cents = totalCents (100% para organizador)
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          registration_id: registrationId,
          asaas_payment_id: asaasPayment.id,
          asaas_customer_id: customerId, // Salvar o customer ID também
          amount_cents: totalCents,
          platform_fee_cents: 0, // Sem taxa da plataforma
          net_amount_cents: totalCents, // 100% para o organizador
          payment_method: "credit_card",
          status: asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED" ? "approved" : "pending",
          payment_url: asaasPayment.invoiceUrl,
          metadata: { asaasPayment, customerId },
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Error saving payment:", paymentError);
        return new Response(
          JSON.stringify({ error: `Erro ao salvar pagamento: ${paymentError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update registration
      const paymentStatus = asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED" ? "approved" : "pending";
      const { error: updateError } = await supabase
        .from("registrations")
        .update({
          payment_id: payment.id,
          payment_method: "credit_card",
          platform_fee_cents: 0, // Sem taxa da plataforma
          total_cents: totalCents,
          payment_status: paymentStatus,
          paid_at: paymentStatus === "approved" ? new Date().toISOString() : null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", registrationId);

      if (updateError) {
        console.error("Error updating registration:", updateError);
        return new Response(
          JSON.stringify({ error: `Erro ao atualizar inscrição: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("=== SUCCESS (CREDIT CARD) ===");
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          payment: {
            id: payment.id,
            asaasPaymentId: asaasPayment.id,
            status: paymentStatus,
            paymentUrl: asaasPayment.invoiceUrl,
            totalCents,
            platformFeeCents: 0, // Sem taxa da plataforma
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Para pagamento via PIX, verificar integração Asaas do organizador
    console.log("=== BUSCANDO INTEGRAÇÃO ASAAS PARA PIX ===");
    console.log("Championship Organizer ID:", championship.organizer_id);
    console.log("Championship Name:", championship.name);
    
    // Buscar integração Asaas do organizador
    const { data: asaasIntegration, error: asaasError } = await supabase
      .from("organizer_asaas_integrations")
      .select("id, asaas_api_key, asaas_wallet_id, organizer_id, organizer_cnpj")
      .eq("organizer_id", championship.organizer_id)
      .eq("is_active", true)
      .maybeSingle();

    if (asaasError) {
      console.error("Erro ao buscar integração Asaas:", asaasError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar integração Asaas do organizador." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== RESULTADO DA BUSCA DE INTEGRAÇÃO ===");
    console.log("Integração encontrada:", asaasIntegration ? "SIM" : "NÃO");
    if (!asaasIntegration) {
      console.log("⚠️ NENHUMA INTEGRAÇÃO ENCONTRADA - Usando PIX estático do campeonato");
    } else {
      console.log("✅ Integração encontrada - ID:", asaasIntegration.id);
      console.log("   Tem API Key:", !!asaasIntegration.asaas_api_key);
      console.log("   Tem Wallet ID:", !!asaasIntegration.asaas_wallet_id);
    }

    const totalCents = priceCents;
    
    // Validar valor mínimo (R$ 1,00 = 100 centavos)
    if (totalCents < 100) {
      return new Response(
        JSON.stringify({ error: "O valor mínimo para pagamento é R$ 1,00" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se o organizador tem integração Asaas, criar PIX via Asaas
    if (asaasIntegration && asaasIntegration.asaas_api_key) {
      console.log("=== CRIANDO PIX VIA ASAAS ===");
      console.log("Organizer ID:", championship.organizer_id);
      console.log("API Key (primeiros 15 chars):", asaasIntegration.asaas_api_key.substring(0, 15) + "...");
      
      const organizerApiKey = asaasIntegration.asaas_api_key;
      
      // Verificar qual conta está sendo usada
      const asaasBaseUrl = getAsaasBaseUrl(organizerApiKey);
      console.log("Ambiente detectado:", organizerApiKey.startsWith("$aact_hmlg_") ? "SANDBOX" : "PRODUÇÃO");
      console.log("URL Base:", asaasBaseUrl);
      let accountInfo: any = null;
      try {
        const accountCheckResponse = await fetch(`${asaasBaseUrl}/myAccount`, {
          headers: {
            "access_token": organizerApiKey,
          },
        });

        if (accountCheckResponse.ok) {
          accountInfo = await accountCheckResponse.json();
          console.log("🚨 CONTA QUE SERÁ USADA PARA O PIX:");
          console.log("   Nome:", accountInfo?.name || "N/A");
          console.log("   Email:", accountInfo?.email || "N/A");
          console.log("   CPF/CNPJ:", accountInfo?.cpfCnpj || "N/A");
          console.log("   Ambiente:", organizerApiKey.startsWith("$aact_hmlg_") ? "SANDBOX" : "PRODUÇÃO");
          console.log("✅ Conta validada - usando conta configurada pelo organizador");
        } else {
          const errorData = await accountCheckResponse.json();
          console.error("ERRO ao verificar conta Asaas:", errorData);
          return new Response(
            JSON.stringify({ 
              error: `API key inválida ou expirada: ${errorData.errors?.[0]?.description || "Não foi possível verificar a conta"}` 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (error: any) {
        console.error("Erro ao verificar conta Asaas:", error);
        return new Response(
          JSON.stringify({ 
            error: `Erro ao verificar conta Asaas: ${error.message}` 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Criar ou buscar customer no Asaas
      let customerId: string | null = null;
      
      // Primeiro, tentar buscar customer existente por email
      try {
        const customerSearchResponse = await fetch(
          `${asaasBaseUrl}/customers?email=${encodeURIComponent(athleteEmail)}`,
          {
            headers: {
              "access_token": organizerApiKey,
            },
          }
        );

        if (customerSearchResponse.ok) {
          const customerData = await customerSearchResponse.json();
          if (customerData.data && customerData.data.length > 0) {
            customerId = customerData.data[0].id;
            console.log("Customer encontrado no Asaas:", customerId);
          }
        }
      } catch (error) {
        console.warn("Erro ao buscar customer:", error);
      }

      // Se não encontrou, criar novo customer
      if (!customerId) {
        try {
          const createCustomerResponse = await fetch(`${asaasBaseUrl}/customers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "access_token": organizerApiKey,
            },
            body: JSON.stringify({
              name: athleteName,
              email: athleteEmail,
              phone: athletePhone?.replace(/\D/g, "") || "",
              cpfCnpj: athleteCpf?.replace(/\D/g, "") || "",
            }),
          });

          if (createCustomerResponse.ok) {
            const newCustomer = await createCustomerResponse.json();
            customerId = newCustomer.id;
            console.log("Novo customer criado no Asaas:", customerId);
          } else {
            const errorData = await createCustomerResponse.json();
            console.error("Erro ao criar customer:", errorData);
            return new Response(
              JSON.stringify({ error: `Erro ao criar cliente no Asaas: ${errorData.errors?.[0]?.description || "Erro desconhecido"}` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (error: any) {
          console.error("Erro ao criar customer:", error);
          return new Response(
            JSON.stringify({ error: `Erro ao criar cliente no Asaas: ${error.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (!customerId) {
        return new Response(
          JSON.stringify({ error: "Não foi possível criar ou encontrar o cliente no Asaas" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Criar pagamento PIX no Asaas
      // IMPORTANTE: Não usar split quando a API key já é do organizador
      // O pagamento vai direto para a conta do organizador (100%)
      const asaasPaymentData: any = {
        customer: customerId, // Usar ID do customer, não email
        billingType: "PIX",
        value: (totalCents / 100).toFixed(2),
        dueDate: new Date().toISOString().split("T")[0],
        description: `Inscrição: ${championship.name} - ${athleteName}`,
      };

      // NÃO configurar split - a API key já é do organizador, então o pagamento vai direto para ele
      // O Asaas não permite split para a própria conta
      console.log("PIX 100% para organizador (sem split - API key já é do organizador):", {
        account: accountInfo?.name || "N/A",
        amount: totalCents,
        percent: "100%",
      });

      const asaasResponse = await fetch(`${asaasBaseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": organizerApiKey, // API KEY DO ORGANIZADOR
        },
        body: JSON.stringify(asaasPaymentData),
      });

      if (!asaasResponse.ok) {
        const errorData = await asaasResponse.json();
        console.error("ERRO ao criar PIX no Asaas:", errorData);
        return new Response(
          JSON.stringify({ error: errorData.errors?.[0]?.description || "Erro ao processar PIX no Asaas" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const asaasPayment = await asaasResponse.json();
      console.log("=== PIX CRIADO COM SUCESSO ===");
      console.log("ID do Pagamento Asaas:", asaasPayment.id);
      console.log("Status:", asaasPayment.status);
      console.log("Conta Asaas:", accountInfo?.name || "N/A");
      
      // IMPORTANTE: Segundo a documentação do Asaas, após criar a cobrança PIX,
      // é necessário fazer uma requisição ADICIONAL para obter o QR Code e código copia e cola
      // Endpoint: GET /v3/payments/{id}/pixQrCode
      // Retorna: encodedImage (Base64), payload (código copia e cola), expirationDate
      let pixQrCodeData: any = null;
      let encodedImage: string | null = null;
      let pixCopyPaste: string | null = null;
      
      // Tentar buscar o QR Code até 3 vezes com delay crescente (o Asaas pode demorar alguns segundos para gerar)
      let attempts = 0;
      const maxAttempts = 3;
      const delays = [1000, 2000, 3000]; // 1s, 2s, 3s
      
      while (attempts < maxAttempts && !pixCopyPaste) {
        try {
          if (attempts > 0) {
            console.log(`Tentativa ${attempts + 1}/${maxAttempts} - Aguardando ${delays[attempts - 1]}ms...`);
            await new Promise(resolve => setTimeout(resolve, delays[attempts - 1]));
          }
          
          console.log("=== BUSCANDO QR CODE PIX DO ASAAS ===");
          console.log("Tentativa:", attempts + 1);
          console.log("Endpoint:", `${asaasBaseUrl}/payments/${asaasPayment.id}/pixQrCode`);
          
          const pixQrCodeResponse = await fetch(
            `${asaasBaseUrl}/payments/${asaasPayment.id}/pixQrCode`,
            {
              headers: {
                "access_token": organizerApiKey,
              },
            }
          );

          if (pixQrCodeResponse.ok) {
            pixQrCodeData = await pixQrCodeResponse.json();
            console.log("=== DADOS DO QR CODE PIX ===");
            console.log("Campos disponíveis:", Object.keys(pixQrCodeData));
            console.log("encodedImage:", pixQrCodeData.encodedImage ? "SIM (tamanho: " + pixQrCodeData.encodedImage.length + " chars)" : "NÃO");
            console.log("payload:", pixQrCodeData.payload ? "SIM (tamanho: " + pixQrCodeData.payload.length + " chars)" : "NÃO");
            console.log("expirationDate:", pixQrCodeData.expirationDate || "N/A");
            
            // O Asaas retorna "payload" como código copia e cola, não "pixCopiaECola"
            encodedImage = pixQrCodeData.encodedImage || null;
            // IMPORTANTE: Remover TODOS os espaços do código PIX - códigos EMV QR Code não podem ter espaços
            pixCopyPaste = pixQrCodeData.payload ? pixQrCodeData.payload.replace(/\s+/g, '') : null;
            
            if (pixCopyPaste) {
              console.log("✅ QR Code obtido com sucesso!");
              console.log("Código PIX limpo (sem espaços):", pixCopyPaste);
              break; // Sair do loop se obtivemos o código
            } else {
              console.warn("⚠️ QR Code retornado mas sem payload - tentando novamente...");
            }
          } else {
            const errorData = await pixQrCodeResponse.json().catch(() => ({}));
            console.error("ERRO ao buscar QR Code PIX:", pixQrCodeResponse.status, errorData);
            if (attempts === maxAttempts - 1) {
              console.warn("⚠️ Não foi possível obter QR Code após " + maxAttempts + " tentativas");
            }
          }
        } catch (error: any) {
          console.error("Erro ao buscar QR Code PIX:", error);
          if (attempts === maxAttempts - 1) {
            console.warn("⚠️ Não foi possível obter QR Code após " + maxAttempts + " tentativas");
          }
        }
        
        attempts++;
      }
      
      console.log("=== DADOS FINAIS QUE SERÃO SALVOS ===");
      console.log("encodedImage:", encodedImage ? "SIM" : "NÃO");
      console.log("pixCopyPaste (payload):", pixCopyPaste ? "SIM" : "NÃO");

      // Criar registro de pagamento
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        registration_id: registrationId,
          asaas_payment_id: asaasPayment.id,
          asaas_customer_id: customerId,
        amount_cents: totalCents,
          platform_fee_cents: 0, // Sem taxa da plataforma
          net_amount_cents: totalCents, // 100% para o organizador
        payment_method: "pix",
          status: asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED" ? "approved" : "pending",
          payment_url: asaasPayment.invoiceUrl,
          pix_qr_code: encodedImage,
          pix_copy_paste: pixCopyPaste,
          metadata: { asaasPayment, customerId },
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error saving payment:", paymentError);
      return new Response(
        JSON.stringify({ error: `Erro ao salvar pagamento: ${paymentError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update registration
      const paymentStatus = asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED" ? "approved" : "pending";
    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        payment_id: payment.id,
          payment_method: "pix",
          platform_fee_cents: 0, // Sem taxa da plataforma
        total_cents: totalCents,
          payment_status: paymentStatus,
          paid_at: paymentStatus === "approved" ? new Date().toISOString() : null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", registrationId);

    if (updateError) {
      console.error("Error updating registration:", updateError);
      return new Response(
        JSON.stringify({ error: `Erro ao atualizar inscrição: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

      console.log("=== SUCCESS (PIX VIA ASAAS) ===");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        payment: {
          id: payment.id,
            asaasPaymentId: asaasPayment.id,
            status: paymentStatus,
            paymentUrl: asaasPayment.invoiceUrl,
            pixQrCode: encodedImage,
            pixCopyPaste: pixCopyPaste,
          totalCents,
            platformFeeCents: 0, // Sem taxa da plataforma
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
      );
    }

    // Fallback: Se não houver integração Asaas, retornar erro informando que precisa configurar
    return new Response(
      JSON.stringify({ 
        error: "PIX não configurado. O organizador precisa configurar a integração Asaas na página de Integração (/asaas-integration) para receber pagamentos via PIX." 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("=== ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro desconhecido",
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
